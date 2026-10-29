import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addChips,
  addPlayer,
  advanceHand,
  applyAction,
  BOT_PROFILES,
  BotPersonality,
  canStartHand,
  createPokerTable,
  decideBotAction,
  getLegalActions,
  getPlayer,
  getPlayerAtSeat,
  isHandInProgress,
  LegalActions,
  PokerAction,
  PokerConfig,
  PokerPlayer,
  PokerState,
  removePlayer,
  secureRandom,
  shuffle,
  startHand,
} from './engine';
import { GameWallet, PRACTICE_TABLE } from '../wallet/gameWallet';
import type { TurnTimer } from './table/PokerTable';

export const POKER_CONFIG: PokerConfig = { smallBlind: 10, bigBlind: 20, maxSeats: 6 };
export const MIN_BUY_IN = 20 * POKER_CONFIG.bigBlind;
export const MAX_BUY_IN = 100 * POKER_CONFIG.bigBlind;
export const HERO_SEAT = 0;

/** Seats used for each number of bots, so the table always looks balanced. */
const BOT_SEATS: Record<number, number[]> = {
  1: [3],
  2: [2, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
};

export const POKER_TIMING = {
  botMinMs: 900,
  botMaxMs: 2100,
  collectMs: 800,
  newHandMs: 900,
  afterFoldWinMs: 2800,
  afterShowdownMs: 5600,
};

export type PokerHero = {
  id: string;
  name: string;
  avatarUrl?: string;
};

export type TableSetup = {
  buyIn: number;
  bots: number;
};

export type BotTurn = TurnTimer;

export type PokerTableController = {
  state: PokerState;
  seated: boolean;
  hero?: PokerPlayer;
  legal?: LegalActions;
  botTurn?: BotTurn;
  leaveAfterHand: boolean;
  needsRebuy: boolean;
  error?: string;
  sit: (setup: TableSetup) => Promise<void>;
  act: (action: PokerAction) => void;
  leave: () => Promise<void>;
  cancelLeave: () => void;
  rebuy: (amount: number) => Promise<void>;
};

const emptyTable = () => createPokerTable(POKER_CONFIG);

/**
 * Runs a local table: one human player against bots, with every chip backed by the game wallet.
 */
export const usePokerTable = (heroInfo: PokerHero, wallet: GameWallet): PokerTableController => {
  const [state, setState] = useState<PokerState>(emptyTable);
  const [seated, setSeated] = useState(false);
  const [botTurn, setBotTurn] = useState<BotTurn>();
  const [leaveAfterHand, setLeaveAfterHand] = useState(false);
  const [needsRebuy, setNeedsRebuy] = useState(false);
  const [error, setError] = useState<string>();

  const personalities = useRef(new Map<string, BotPersonality>());
  const botCounter = useRef(0);
  const buyInRef = useRef(MAX_BUY_IN);

  const stateRef = useRef(state);
  stateRef.current = state;
  const seatedRef = useRef(seated);
  seatedRef.current = seated;
  const leaveAfterHandRef = useRef(leaveAfterHand);
  leaveAfterHandRef.current = leaveAfterHand;
  const walletRef = useRef(wallet);
  walletRef.current = wallet;

  const heroId = heroInfo.id;

  const seatBot = useCallback((table: PokerState, seat: number): PokerState => {
    const usedNames = new Set(table.players.map((p) => p.name));
    const profile =
      shuffle(BOT_PROFILES, secureRandom).find((b) => !usedNames.has(b.name)) ?? BOT_PROFILES[0];
    botCounter.current += 1;
    const id = `bot-${botCounter.current}`;
    personalities.current.set(id, profile.personality);
    return addPlayer(table, {
      id,
      name: profile.name,
      isBot: true,
      seat,
      stack: buyInRef.current,
    });
  }, []);

  const resetTable = useCallback(() => {
    setSeated(false);
    setState(emptyTable());
    setLeaveAfterHand(false);
    setNeedsRebuy(false);
    setBotTurn(undefined);
    personalities.current.clear();
  }, []);

  const cashOutAndReset = useCallback(
    async (table: PokerState) => {
      const stack = getPlayer(table, heroId)?.stack ?? 0;
      resetTable();
      await walletRef.current.cashOut(stack, PRACTICE_TABLE);
    },
    [heroId, resetTable]
  );

  const nextHand = useCallback(() => {
    let table = stateRef.current;
    table.players
      .filter((p) => p.isBot && p.stack === 0)
      .forEach((bust) => {
        personalities.current.delete(bust.id);
        table = removePlayer(table, bust.id);
        table = seatBot(table, bust.seat);
      });

    if (leaveAfterHandRef.current) {
      cashOutAndReset(table).catch(() => setError('Não foi possível devolver suas fichas.'));
      return;
    }
    const me = getPlayer(table, heroId);
    if (!me || me.stack === 0) {
      setState(table);
      setNeedsRebuy(true);
      return;
    }
    setState(canStartHand(table) ? startHand(table, secureRandom) : table);
  }, [heroId, seatBot, cashOutAndReset]);

  // Start the first hand shortly after sitting down.
  useEffect(() => {
    if (!seated || state.phase !== 'waiting' || !canStartHand(state)) return undefined;
    const timer = setTimeout(() => {
      if (stateRef.current === state) setState(startHand(state, secureRandom));
    }, POKER_TIMING.newHandMs);
    return () => clearTimeout(timer);
  }, [seated, state]);

  // Bots think, then act.
  useEffect(() => {
    if (!seated || state.phase !== 'betting') {
      setBotTurn(undefined);
      return undefined;
    }
    const actor = getPlayerAtSeat(state, state.actingSeat);
    if (!actor?.isBot) {
      setBotTurn(undefined);
      return undefined;
    }
    const ms =
      POKER_TIMING.botMinMs + secureRandom() * (POKER_TIMING.botMaxMs - POKER_TIMING.botMinMs);
    setBotTurn({ seat: actor.seat, ms, key: `${state.handNumber}-${state.logCounter}` });
    const timer = setTimeout(() => {
      if (stateRef.current !== state) return;
      const personality = personalities.current.get(actor.id) ?? BOT_PROFILES[0].personality;
      const action = decideBotAction(state, actor.id, personality, secureRandom);
      setState(applyAction(state, actor.id, action));
    }, ms);
    return () => clearTimeout(timer);
  }, [seated, state]);

  // Pause so bets can slide into the pot, then deal the next street or settle the hand.
  useEffect(() => {
    if (!seated || state.phase !== 'street-complete') return undefined;
    const timer = setTimeout(() => {
      if (stateRef.current === state) setState(advanceHand(state));
    }, POKER_TIMING.collectMs);
    return () => clearTimeout(timer);
  }, [seated, state]);

  // Hand over: save the stack to the wallet, show the result, then deal again.
  useEffect(() => {
    if (!seated || state.phase !== 'complete' || !state.result) return undefined;
    const me = getPlayer(state, heroId);
    walletRef.current.syncTable(me?.stack ?? 0, PRACTICE_TABLE).catch(() => undefined);
    const timer = setTimeout(
      () => {
        if (stateRef.current === state) nextHand();
      },
      state.result.byFold ? POKER_TIMING.afterFoldWinMs : POKER_TIMING.afterShowdownMs
    );
    return () => clearTimeout(timer);
  }, [seated, state, heroId, nextHand]);

  // Leaving the page cashes out whatever is not in the middle of a pot.
  useEffect(
    () => () => {
      if (!seatedRef.current) return;
      const stack = getPlayer(stateRef.current, heroId)?.stack ?? 0;
      walletRef.current.cashOut(stack, PRACTICE_TABLE).catch(() => undefined);
    },
    [heroId]
  );

  const sit = useCallback(
    async (setup: TableSetup) => {
      setError(undefined);
      try {
        await walletRef.current.buyIn(setup.buyIn, PRACTICE_TABLE);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Não foi possível comprar fichas.');
        return;
      }
      buyInRef.current = setup.buyIn;
      let table = addPlayer(emptyTable(), {
        id: heroId,
        name: heroInfo.name,
        avatarUrl: heroInfo.avatarUrl,
        isBot: false,
        seat: HERO_SEAT,
        stack: setup.buyIn,
      });
      (BOT_SEATS[setup.bots] ?? BOT_SEATS[5]).forEach((seat) => {
        table = seatBot(table, seat);
      });
      setState(table);
      setSeated(true);
    },
    [heroId, heroInfo.name, heroInfo.avatarUrl, seatBot]
  );

  const act = useCallback(
    (action: PokerAction) => {
      const table = stateRef.current;
      try {
        setState(applyAction(table, heroId, action));
        setError(undefined);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ação inválida');
      }
    },
    [heroId]
  );

  const leave = useCallback(async () => {
    const table = stateRef.current;
    const me = getPlayer(table, heroId);
    const stillInHand = me && (me.status === 'active' || me.status === 'allin');
    if (isHandInProgress(table) && stillInHand) {
      setLeaveAfterHand(true);
      return;
    }
    await cashOutAndReset(table);
  }, [heroId, cashOutAndReset]);

  const cancelLeave = useCallback(() => setLeaveAfterHand(false), []);

  const rebuy = useCallback(
    async (amount: number) => {
      setError(undefined);
      try {
        await walletRef.current.buyIn(amount, PRACTICE_TABLE);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Não foi possível comprar fichas.');
        return;
      }
      stateRef.current = addChips(stateRef.current, heroId, amount);
      setNeedsRebuy(false);
      nextHand();
    },
    [heroId, nextHand]
  );

  const hero = getPlayer(state, heroId);
  const legal = useMemo(() => getLegalActions(state, heroId), [state, heroId]);

  return {
    state,
    seated,
    hero,
    legal,
    botTurn,
    leaveAfterHand,
    needsRebuy,
    error,
    sit,
    act,
    leave,
    cancelLeave,
    rebuy,
  };
};
