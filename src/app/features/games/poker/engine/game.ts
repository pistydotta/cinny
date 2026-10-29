/* eslint-disable no-param-reassign */
// Immer drafts are meant to be mutated.
import produce, { Draft } from 'immer';
import { Card, createDeck, RandomFn, randomInt, shuffle } from './cards';
import { compareHands, describeHand, evaluateBest, HandValue } from './handEvaluator';

/*
 * No-Limit Texas Hold'em engine.
 *
 * Every function is pure: it takes a state and returns a new one, so the same engine can drive
 * a local table against bots today and be replayed from shared events in multiplayer later.
 *
 * Rules implemented:
 * - Moving button; in heads-up the button posts the small blind, acts first preflop and last
 *   on every later street.
 * - Short blinds post what they have (all-in); the amount to call preflop is still the big blind.
 * - Minimum bet is the big blind; a raise must be at least the size of the previous full bet or
 *   raise on the street, unless the player is going all-in for less.
 * - An all-in for less than a full raise does not reopen the betting: a player who already acted
 *   may only re-raise when facing at least one full raise since their last action (cumulative).
 * - Uncalled bets go back to the bettor before the pot is awarded.
 * - Side pots are built from each player's total contribution; folded chips stay in the pots.
 * - Ties split the pot; odd chips go one at a time to the winners closest to the left of the
 *   button.
 * - When nobody (or only one player) can still bet, the board is run out to showdown.
 */

export type PlayerStatus = 'sitting-out' | 'active' | 'folded' | 'allin';

export type PokerAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  /** Bet or raise TO `amount`, i.e. the player's total commitment on this street. */
  | { type: 'raise'; amount: number };

export type LastActionType = 'sb' | 'bb' | 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

export type LastAction = {
  type: LastActionType;
  amount?: number;
};

export type PokerPlayer = {
  id: string;
  name: string;
  avatarUrl?: string;
  isBot: boolean;
  seat: number;
  stack: number;
  holeCards: Card[];
  status: PlayerStatus;
  /** Chips committed on the current street. */
  streetBet: number;
  /** Chips committed on the whole hand. */
  totalBet: number;
  hasActed: boolean;
  /** The table's bet level right after this player's last action on this street. */
  lastActionBetLevel: number;
  lastAction?: LastAction;
};

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

/**
 * - waiting: no hand in progress yet.
 * - betting: `actingSeat` must act.
 * - street-complete: betting on the street is over; call `advanceHand` (after an animation).
 * - complete: the hand is over and `result` is set.
 */
export type HandPhase = 'waiting' | 'betting' | 'street-complete' | 'complete';

export type PokerConfig = {
  smallBlind: number;
  bigBlind: number;
  maxSeats: number;
};

export type Pot = {
  amount: number;
  eligibleIds: string[];
};

export type PotResult = Pot & {
  winnerIds: string[];
  handName?: string;
};

export type ShownHand = {
  name: string;
  cards: Card[];
};

export type HandResult = {
  byFold: boolean;
  pots: PotResult[];
  /** Chips won per player id (gross amount pushed to the player). */
  payouts: Record<string, number>;
  /** Best hand of every player that reached showdown. */
  hands: Record<string, ShownHand>;
};

export type LogEntry = {
  id: number;
  hand: number;
  text: string;
};

export type PokerState = {
  config: PokerConfig;
  /** Sorted by seat. */
  players: PokerPlayer[];
  handNumber: number;
  buttonSeat: number | null;
  sbSeat: number | null;
  bbSeat: number | null;
  deck: Card[];
  board: Card[];
  street: Street;
  phase: HandPhase;
  /** Highest street commitment the others must match. */
  currentBet: number;
  /** Size of the last full bet or raise on this street; the next raise must be at least this. */
  minRaise: number;
  actingSeat: number | null;
  lastAggressorSeat: number | null;
  /** Chips collected from finished streets. */
  pot: number;
  result?: HandResult;
  log: LogEntry[];
  logCounter: number;
};

export type LegalActions = {
  toCall: number;
  canCheck: boolean;
  canCall: boolean;
  /** What a call actually costs (capped by the stack). */
  callAmount: number;
  canRaise: boolean;
  /** True when nothing was bet yet on this street, so a raise is an opening bet. */
  isBet: boolean;
  minRaiseTo: number;
  maxRaiseTo: number;
};

const MAX_LOG = 80;

type NewPlayer = Pick<PokerPlayer, 'id' | 'name' | 'avatarUrl' | 'isBot' | 'seat' | 'stack'>;

export const formatChips = (amount: number): string => amount.toLocaleString('pt-BR');

const pushLog = (d: Draft<PokerState>, text: string) => {
  d.logCounter += 1;
  d.log.push({ id: d.logCounter, hand: d.handNumber, text });
  if (d.log.length > MAX_LOG) d.log.splice(0, d.log.length - MAX_LOG);
};

export const createPokerTable = (config: PokerConfig): PokerState => ({
  config,
  players: [],
  handNumber: 0,
  buttonSeat: null,
  sbSeat: null,
  bbSeat: null,
  deck: [],
  board: [],
  street: 'preflop',
  phase: 'waiting',
  currentBet: 0,
  minRaise: config.bigBlind,
  actingSeat: null,
  lastAggressorSeat: null,
  pot: 0,
  log: [],
  logCounter: 0,
});

export const isHandInProgress = (state: PokerState): boolean =>
  state.phase === 'betting' || state.phase === 'street-complete';

export const getPlayer = (state: PokerState, playerId: string): PokerPlayer | undefined =>
  state.players.find((p) => p.id === playerId);

export const getPlayerAtSeat = (state: PokerState, seat: number | null): PokerPlayer | undefined =>
  seat === null ? undefined : state.players.find((p) => p.seat === seat);

/** Players after `seat` in clockwise order (the player at `seat` comes last, if any). */
const clockwiseAfter = <T extends PokerPlayer>(players: T[], seat: number): T[] => {
  const after = players.filter((p) => p.seat > seat);
  const before = players.filter((p) => p.seat <= seat);
  return [...after, ...before];
};

const isContesting = (p: PokerPlayer) => p.status === 'active' || p.status === 'allin';

const needsToAct = (d: PokerState, p: PokerPlayer) =>
  p.status === 'active' && (!p.hasActed || p.streetBet < d.currentBet);

const isRoundComplete = (d: PokerState): boolean => {
  if (d.players.filter(isContesting).length <= 1) return true;
  const canAct = d.players.filter((p) => p.status === 'active');
  if (canAct.length === 0) return true;
  // Everyone else is all-in: nobody is left to bet against.
  if (canAct.length === 1 && canAct[0].streetBet >= d.currentBet) return true;
  return canAct.every((p) => p.hasActed && p.streetBet === d.currentBet);
};

const commit = (p: Draft<PokerPlayer>, amount: number) => {
  const chips = Math.min(amount, p.stack);
  p.stack -= chips;
  p.streetBet += chips;
  p.totalBet += chips;
  if (p.stack === 0) p.status = 'allin';
};

const setNextActor = (d: Draft<PokerState>, fromSeat: number) => {
  if (isRoundComplete(d)) {
    d.actingSeat = null;
    d.phase = 'street-complete';
    return;
  }
  const next = clockwiseAfter(d.players, fromSeat).find((p) => needsToAct(d, p));
  d.actingSeat = next ? next.seat : null;
  d.phase = next ? 'betting' : 'street-complete';
};

export const addPlayer = (state: PokerState, player: NewPlayer): PokerState =>
  produce(state, (d) => {
    if (d.players.some((p) => p.id === player.id)) throw new Error('Player already seated');
    if (d.players.some((p) => p.seat === player.seat)) throw new Error('Seat is taken');
    if (player.seat < 0 || player.seat >= d.config.maxSeats) throw new Error('Invalid seat');
    d.players.push({
      ...player,
      holeCards: [],
      status: 'sitting-out',
      streetBet: 0,
      totalBet: 0,
      hasActed: false,
      lastActionBetLevel: 0,
    });
    d.players.sort((a, b) => a.seat - b.seat);
    pushLog(d, `${player.name} sentou à mesa com ${formatChips(player.stack)} fichas`);
  });

/** Removes a player between hands, or a player that is not part of the current hand. */
export const removePlayer = (state: PokerState, playerId: string): PokerState =>
  produce(state, (d) => {
    const p = d.players.find((pl) => pl.id === playerId);
    if (!p) return;
    if (isHandInProgress(d) && p.status !== 'sitting-out' && p.status !== 'folded') {
      throw new Error('Cannot remove a player who is still in the hand');
    }
    if (isHandInProgress(d) && p.status === 'folded') {
      // Their chips stay in the pot; keep the seat until the hand ends so pots stay consistent.
      throw new Error('Wait for the hand to finish before removing a folded player');
    }
    d.players = d.players.filter((pl) => pl.id !== playerId);
    pushLog(d, `${p.name} saiu da mesa`);
  });

export const addChips = (state: PokerState, playerId: string, amount: number): PokerState =>
  produce(state, (d) => {
    if (isHandInProgress(d)) throw new Error('Chips can only be added between hands');
    const p = d.players.find((pl) => pl.id === playerId);
    if (!p) throw new Error('Unknown player');
    p.stack += amount;
    pushLog(d, `${p.name} recomprou ${formatChips(amount)} fichas`);
  });

export const canStartHand = (state: PokerState): boolean =>
  !isHandInProgress(state) && state.players.filter((p) => p.stack > 0).length >= 2;

export const startHand = (state: PokerState, random: RandomFn): PokerState =>
  produce(state, (d) => {
    if (!canStartHand(d)) throw new Error('Cannot start a hand');
    const { smallBlind, bigBlind } = d.config;

    d.players.forEach((p) => {
      p.holeCards = [];
      p.streetBet = 0;
      p.totalBet = 0;
      p.hasActed = false;
      p.lastActionBetLevel = 0;
      p.lastAction = undefined;
      p.status = p.stack > 0 ? 'active' : 'sitting-out';
    });
    const dealt = d.players.filter((p) => p.status === 'active');

    d.handNumber += 1;
    d.board = [];
    d.pot = 0;
    d.result = undefined;
    d.street = 'preflop';
    d.lastAggressorSeat = null;

    const button =
      d.buttonSeat === null
        ? dealt[randomInt(dealt.length, random)]
        : clockwiseAfter(dealt, d.buttonSeat)[0];
    d.buttonSeat = button.seat;

    const [afterButton1, afterButton2] = clockwiseAfter(dealt, button.seat);
    const headsUp = dealt.length === 2;
    const sb = headsUp ? button : afterButton1;
    const bb = headsUp ? afterButton1 : afterButton2;
    d.sbSeat = sb.seat;
    d.bbSeat = bb.seat;

    pushLog(d, `— Mão #${d.handNumber} —`);
    const sbPlayer = d.players.find((p) => p.id === sb.id) as Draft<PokerPlayer>;
    const bbPlayer = d.players.find((p) => p.id === bb.id) as Draft<PokerPlayer>;
    commit(sbPlayer, smallBlind);
    sbPlayer.lastAction = { type: 'sb', amount: sbPlayer.streetBet };
    pushLog(d, `${sbPlayer.name} posta small blind ${formatChips(sbPlayer.streetBet)}`);
    commit(bbPlayer, bigBlind);
    bbPlayer.lastAction = { type: 'bb', amount: bbPlayer.streetBet };
    pushLog(d, `${bbPlayer.name} posta big blind ${formatChips(bbPlayer.streetBet)}`);

    d.currentBet = bigBlind;
    d.minRaise = bigBlind;

    // Deal one card at a time, starting left of the button.
    d.deck = shuffle(createDeck(), random);
    const dealOrder = clockwiseAfter(dealt, button.seat);
    for (let round = 0; round < 2; round += 1) {
      dealOrder.forEach((p) => {
        const draftPlayer = d.players.find((pl) => pl.id === p.id) as Draft<PokerPlayer>;
        draftPlayer.holeCards.push(d.deck.shift() as Card);
      });
    }

    d.phase = 'betting';
    setNextActor(d, bb.seat);
  });

export const getLegalActions = (state: PokerState, playerId: string): LegalActions | undefined => {
  const p = getPlayer(state, playerId);
  if (!p || state.phase !== 'betting' || state.actingSeat !== p.seat) return undefined;

  const toCall = Math.max(0, state.currentBet - p.streetBet);
  const callAmount = Math.min(toCall, p.stack);
  const maxRaiseTo = p.streetBet + p.stack;
  const opponentCanRespond = state.players.some((o) => o.id !== p.id && o.status === 'active');
  const reopened = !p.hasActed || state.currentBet - p.lastActionBetLevel >= state.minRaise;
  const canRaise = opponentCanRespond && reopened && p.stack > toCall;

  return {
    toCall,
    canCheck: toCall === 0,
    canCall: toCall > 0,
    callAmount,
    canRaise,
    isBet: state.currentBet === 0,
    minRaiseTo: Math.min(state.currentBet + state.minRaise, maxRaiseTo),
    maxRaiseTo,
  };
};

export const applyAction = (
  state: PokerState,
  playerId: string,
  action: PokerAction
): PokerState => {
  const legal = getLegalActions(state, playerId);
  if (!legal) throw new Error('It is not this player’s turn');

  return produce(state, (d) => {
    const p = d.players.find((pl) => pl.id === playerId) as Draft<PokerPlayer>;

    switch (action.type) {
      case 'fold': {
        p.status = 'folded';
        p.lastAction = { type: 'fold' };
        pushLog(d, `${p.name} desistiu`);
        break;
      }
      case 'check': {
        if (!legal.canCheck) throw new Error('Cannot check facing a bet');
        p.lastAction = { type: 'check' };
        pushLog(d, `${p.name} passou`);
        break;
      }
      case 'call': {
        if (!legal.canCall) throw new Error('Nothing to call');
        commit(p, legal.callAmount);
        p.lastAction =
          p.status === 'allin'
            ? { type: 'allin', amount: p.streetBet }
            : { type: 'call', amount: p.streetBet };
        pushLog(
          d,
          p.status === 'allin'
            ? `${p.name} pagou ${formatChips(legal.callAmount)} e está all-in`
            : `${p.name} pagou ${formatChips(legal.callAmount)}`
        );
        break;
      }
      case 'raise': {
        const to = Math.floor(action.amount);
        if (!legal.canRaise) throw new Error('Raising is not allowed');
        if (to < legal.minRaiseTo || to > legal.maxRaiseTo) {
          throw new Error(`Raise must be between ${legal.minRaiseTo} and ${legal.maxRaiseTo}`);
        }
        const increment = to - d.currentBet;
        commit(p, to - p.streetBet);
        if (increment >= d.minRaise) d.minRaise = increment;
        d.currentBet = to;
        d.lastAggressorSeat = p.seat;
        const verb = legal.isBet ? 'bet' : 'raise';
        p.lastAction =
          p.status === 'allin' ? { type: 'allin', amount: to } : { type: verb, amount: to };
        if (p.status === 'allin') pushLog(d, `${p.name} foi all-in com ${formatChips(to)}`);
        else if (verb === 'bet') pushLog(d, `${p.name} apostou ${formatChips(to)}`);
        else pushLog(d, `${p.name} aumentou para ${formatChips(to)}`);
        break;
      }
      default:
        throw new Error('Unknown action');
    }

    p.hasActed = true;
    p.lastActionBetLevel = d.currentBet;
    setNextActor(d, p.seat);
  });
};

/** Returns the uncalled part of the biggest bet and moves street bets into the pot. */
const collectBets = (d: Draft<PokerState>) => {
  const ordered = d.players.slice().sort((a, b) => b.streetBet - a.streetBet);
  const [top, second] = ordered;
  if (top && top.streetBet > (second?.streetBet ?? 0)) {
    const refund = top.streetBet - (second?.streetBet ?? 0);
    top.stack += refund;
    top.streetBet -= refund;
    top.totalBet -= refund;
    if (top.status === 'allin') top.status = 'active';
    pushLog(d, `${formatChips(refund)} não pagos voltam para ${top.name}`);
  }
  d.players.forEach((p) => {
    d.pot += p.streetBet;
    p.streetBet = 0;
  });
};

/** Splits every chip committed this hand into the main pot and side pots. */
export const buildPots = (players: PokerPlayer[]): Pot[] => {
  const contenders = players.filter(isContesting);
  const levels = Array.from(new Set(contenders.map((p) => p.totalBet))).sort((a, b) => a - b);
  const pots: Pot[] = [];
  let prev = 0;
  levels.forEach((level, index) => {
    const isLast = index === levels.length - 1;
    // The last pot also sweeps chips folded players put in above every contender's level.
    const cap = (bet: number) => (isLast ? bet : Math.min(bet, level));
    const amount = players.reduce(
      (sum, p) => sum + cap(p.totalBet) - Math.min(p.totalBet, prev),
      0
    );
    const eligibleIds = contenders.filter((p) => p.totalBet >= level).map((p) => p.id);
    prev = level;
    if (amount <= 0) return;
    const last = pots[pots.length - 1];
    if (last && last.eligibleIds.join() === eligibleIds.join()) {
      last.amount += amount;
    } else {
      pots.push({ amount, eligibleIds });
    }
  });
  return pots;
};

/** Splits `amount` between winners; odd chips go to the first winners left of the button. */
export const splitPot = (
  amount: number,
  winners: PokerPlayer[],
  buttonSeat: number
): Record<string, number> => {
  const ordered = clockwiseAfter(winners, buttonSeat);
  const share = Math.floor(amount / ordered.length);
  let remainder = amount - share * ordered.length;
  const shares: Record<string, number> = {};
  ordered.forEach((p) => {
    shares[p.id] = share + (remainder > 0 ? 1 : 0);
    remainder -= 1;
  });
  return shares;
};

const showdown = (d: Draft<PokerState>) => {
  const contenders = d.players.filter(isContesting);
  const values = new Map<string, HandValue>();
  contenders.forEach((p) => values.set(p.id, evaluateBest([...p.holeCards, ...d.board])));

  const payouts: Record<string, number> = {};
  const pots: PotResult[] = buildPots(d.players).map((pot) => {
    const eligible = contenders.filter((p) => pot.eligibleIds.includes(p.id));
    let best: HandValue | undefined;
    eligible.forEach((p) => {
      const value = values.get(p.id) as HandValue;
      if (!best || compareHands(value, best) > 0) best = value;
    });
    const winners = eligible.filter(
      (p) => compareHands(values.get(p.id) as HandValue, best as HandValue) === 0
    );
    const shares = splitPot(pot.amount, winners, d.buttonSeat ?? 0);
    Object.entries(shares).forEach(([id, chips]) => {
      payouts[id] = (payouts[id] ?? 0) + chips;
    });
    return {
      ...pot,
      winnerIds: winners.map((p) => p.id),
      handName: best ? describeHand(best) : undefined,
    };
  });

  const hands: Record<string, ShownHand> = {};
  contenders.forEach((p) => {
    const value = values.get(p.id) as HandValue;
    hands[p.id] = { name: describeHand(value), cards: value.cards };
    pushLog(d, `${p.name} mostra ${describeHand(value)}`);
  });

  d.players.forEach((p) => {
    const won = payouts[p.id];
    if (won) {
      p.stack += won;
      pushLog(d, `${p.name} ganhou ${formatChips(won)}`);
    }
  });

  d.result = { byFold: false, pots, payouts, hands };
  d.pot = 0;
  d.phase = 'complete';
  d.actingSeat = null;
};

const STREET_AFTER: Record<Street, Street> = {
  preflop: 'flop',
  flop: 'turn',
  turn: 'river',
  river: 'river',
};

/** Moves past a finished betting round: deals the next street, or settles the hand. */
export const advanceHand = (state: PokerState): PokerState =>
  produce(state, (d) => {
    if (d.phase !== 'street-complete') throw new Error('The betting round is not over');
    collectBets(d);

    const contenders = d.players.filter(isContesting);
    if (contenders.length === 1) {
      const [winner] = contenders;
      const amount = d.pot;
      winner.stack += amount;
      d.result = {
        byFold: true,
        pots: [{ amount, eligibleIds: [winner.id], winnerIds: [winner.id] }],
        payouts: { [winner.id]: amount },
        hands: {},
      };
      pushLog(d, `${winner.name} ganhou ${formatChips(amount)} sem mostrar as cartas`);
      d.pot = 0;
      d.phase = 'complete';
      d.actingSeat = null;
      return;
    }

    if (d.street === 'river') {
      showdown(d);
      return;
    }

    d.street = STREET_AFTER[d.street];
    d.deck.shift(); // burn
    const count = d.street === 'flop' ? 3 : 1;
    for (let i = 0; i < count; i += 1) d.board.push(d.deck.shift() as Card);

    d.currentBet = 0;
    d.minRaise = d.config.bigBlind;
    d.players.forEach((p) => {
      p.hasActed = false;
      p.lastActionBetLevel = 0;
      if (p.status === 'active') p.lastAction = undefined;
    });

    d.phase = 'betting';
    setNextActor(d, d.buttonSeat ?? 0);
  });

/** All chips on the table that belong to the current hand. */
export const getTotalPot = (state: PokerState): number =>
  state.pot + state.players.reduce((sum, p) => sum + p.streetBet, 0);
