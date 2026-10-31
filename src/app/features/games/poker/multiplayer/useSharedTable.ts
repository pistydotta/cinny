import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getLegalActions,
  getPlayer,
  isHandInProgress,
  LegalActions,
  PokerAction,
  PokerPlayer,
  PokerState,
  secureRandom,
} from '../engine';
import { GameWallet } from '../../wallet/gameWallet';
import { PokerEventContent, TableEvent, compareTableEvents, TAKEOVER_STAGGER_MS } from './protocol';
import {
  applyTableEvent,
  buildStartContent,
  createReplica,
  hostDeadline,
  hostDuty,
  isSeated,
  Replica,
  replayTable,
  succession,
} from './replica';
import { TableTransport } from './transport';
import { tr } from '../../../translation/tr';

const COLLECT_MS = 800;
const STREET_MS = 450;
const DUTY_TICK_MS = 500;
/** Timeouts are checked against server time; give our clock some slack. */
const TIMEOUT_SLACK_MS = 1500;
const RESEND_AFTER_MS = 8000;

export type TurnTimer = {
  seat: number;
  ms: number;
  elapsedMs: number;
  key: string;
};

export type SharedTableController = {
  loading: boolean;
  replica?: Replica;
  /** What is on screen; trails the replica while animations play. */
  display: PokerState;
  me?: PokerPlayer;
  seated: boolean;
  isHost: boolean;
  legal?: LegalActions;
  turnTimer?: TurnTimer;
  error?: string;
  join: (seat: number, buyIn: number) => Promise<void>;
  leave: () => Promise<void>;
  act: (action: PokerAction) => void;
  rebuy: (amount: number) => Promise<void>;
  back: () => void;
};

type Profile = { name: string; avatarUrl?: string };

/**
 * Keeps a shared table in sync: replays its events, animates what happens, and does the host's
 * jobs (dealing, timing players out) when we are the host, or takes over when the host is gone.
 */
export const useSharedTable = (
  transport: TableTransport,
  tableKey: string,
  profile: Profile,
  wallet: GameWallet
): SharedTableController => {
  const { userId, config, createdTs } = transport;
  const emptyReplica = useMemo(() => createReplica(config, createdTs), [config, createdTs]);

  const [loading, setLoading] = useState(true);
  const [replica, setReplica] = useState<Replica>(emptyReplica);
  const [display, setDisplay] = useState<PokerState>(emptyReplica.poker);
  const [error, setError] = useState<string>();
  const [now, setNow] = useState(Date.now());

  const replicaRef = useRef(emptyReplica);
  const baseRef = useRef(emptyReplica);
  const eventsRef = useRef<TableEvent[]>([]);
  const seenRef = useRef(new Set<string>());
  const framesRef = useRef<PokerState[]>([]);
  const pumpingRef = useRef(false);
  const displayRef = useRef(emptyReplica.poker);
  const clockOffsetRef = useRef(0);
  const sentAtRef = useRef<number[]>([]);
  const lastDutyRef = useRef<{ key: string; at: number }>();
  const pendingRef = useRef<{ kind: 'join' | 'rebuy'; amount: number }[]>([]);
  /** hand:seq of the action we sent, so a double click does not send it twice. */
  const actSentRef = useRef<string>();
  const walletRef = useRef(wallet);
  walletRef.current = wallet;
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const serverNow = () => Date.now() + clockOffsetRef.current;

  const showNow = useCallback((poker: PokerState) => {
    framesRef.current = [];
    displayRef.current = poker;
    setDisplay(poker);
  }, []);

  const pump = useCallback(() => {
    if (pumpingRef.current) return;
    const next = framesRef.current.shift();
    if (!next) return;
    // Too far behind: skip ahead.
    if (framesRef.current.length > 12) {
      showNow(framesRef.current[framesRef.current.length - 1]);
      return;
    }
    const prev = displayRef.current;
    displayRef.current = next;
    setDisplay(next);
    let wait = 0;
    if (next.phase === 'street-complete') wait = COLLECT_MS;
    else if (next.board.length > prev.board.length) wait = STREET_MS;
    pumpingRef.current = true;
    setTimeout(() => {
      pumpingRef.current = false;
      pump();
    }, wait);
  }, [showNow]);

  const rebuild = useCallback(
    (history: TableEvent[]) => {
      const { base, events, replica: rebuilt } = replayTable(config, createdTs, history);
      baseRef.current = base;
      eventsRef.current = events;
      seenRef.current = new Set(history.map((ev) => ev.id));
      replicaRef.current = rebuilt;
      setReplica(rebuilt);
      showNow(rebuilt.poker);
    },
    [config, createdTs, showNow]
  );

  const reload = useCallback(async () => {
    try {
      const history = await transport.loadHistory();
      const byId = new Map<string, TableEvent>();
      [...eventsRef.current, ...history].forEach((ev) => byId.set(ev.id, ev));
      rebuild(Array.from(byId.values()));
    } catch {
      setError(tr('games.error.load_table', 'Could not load the table.'));
    }
  }, [transport, rebuild]);

  const ingest = useCallback(
    (event: TableEvent) => {
      if (seenRef.current.has(event.id)) return;
      seenRef.current.add(event.id);

      // Estimate how far our clock is from the server's, using our own events.
      if (event.sender === userId) {
        if (sentAtRef.current.shift() !== undefined) {
          clockOffsetRef.current = event.ts - Date.now();
        }
      }

      const events = eventsRef.current;
      const last = events[events.length - 1];
      if (last && compareTableEvents(event, last) < 0) {
        // Arrived out of order: replay everything after the base in the right order.
        const merged = [...events, event].sort(compareTableEvents);
        eventsRef.current = merged;
        const rebuilt = merged.reduce(
          (acc, ev) => applyTableEvent(acc, ev).replica,
          baseRef.current
        );
        replicaRef.current = rebuilt;
        setReplica(rebuilt);
        showNow(rebuilt.poker);
        return;
      }

      events.push(event);
      const result = applyTableEvent(replicaRef.current, event);
      replicaRef.current = result.replica;
      setReplica(result.replica);
      framesRef.current.push(...result.frames);
      pump();

      const { content } = event;
      if (event.sender === userId && content.kind === 'act') actSentRef.current = undefined;
      if (event.sender === userId && (content.kind === 'join' || content.kind === 'rebuy')) {
        const pending = pendingRef.current.shift();
        if (!result.accepted && pending) {
          walletRef.current.refund(pending.amount, tableKey).catch(() => undefined);
          setError(
            content.kind === 'join'
              ? tr('games.error.seat', 'Could not take that seat. Try another one.')
              : tr('games.error.rebuy', 'Could not buy more chips right now.')
          );
        }
      }
      // A deal that does not fit our copy means we missed something: reload the history.
      if (content.kind === 'start' && !result.accepted) reload();
    },
    [userId, tableKey, pump, showNow, reload]
  );

  // Load the table, then follow new events.
  useEffect(() => {
    let alive = true;
    const buffered: TableEvent[] = [];
    let ready = false;
    const unsubscribe = transport.subscribe(
      (event) => {
        if (ready) ingest(event);
        else buffered.push(event);
      },
      () => {
        if (ready) reload();
      }
    );
    transport
      .loadHistory()
      .then((history) => {
        if (!alive) return;
        const byId = new Map<string, TableEvent>();
        [...history, ...buffered].forEach((ev) => byId.set(ev.id, ev));
        rebuild(Array.from(byId.values()));
        ready = true;
        setLoading(false);
      })
      .catch(() => {
        if (alive) setError(tr('games.error.load_table', 'Could not load the table.'));
      });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [transport, ingest, rebuild, reload]);

  const send = useCallback(
    async (content: PokerEventContent) => {
      sentAtRef.current.push(Date.now());
      try {
        await transport.send(content);
      } catch (e) {
        sentAtRef.current.pop();
        throw e;
      }
    },
    [transport]
  );

  // Host jobs and takeovers.
  useEffect(() => {
    if (loading) return undefined;
    const timer = setInterval(() => {
      setNow(Date.now());
      const r = replicaRef.current;
      if (!isSeated(r, userId)) return;
      const t = serverNow();
      const once = (key: string, fn: () => void) => {
        const lastDuty = lastDutyRef.current;
        if (lastDuty?.key === key && Date.now() - lastDuty.at < RESEND_AFTER_MS) return;
        lastDutyRef.current = { key, at: Date.now() };
        fn();
      };

      if (r.hostId === userId) {
        const duty = hostDuty(r);
        if (!duty) return;
        const slack = duty.kind === 'timeout' ? TIMEOUT_SLACK_MS : 0;
        if (t < duty.dueTs + slack) return;
        once(`${duty.kind}:${r.poker.handNumber}:${r.seq}`, () => {
          const content: PokerEventContent =
            duty.kind === 'start'
              ? buildStartContent(r, secureRandom)
              : { kind: 'timeout', hand: r.poker.handNumber, seq: r.seq };
          send(content).catch(() => undefined);
        });
        return;
      }

      const deadline = hostDeadline(r);
      const rank = succession(r).indexOf(userId);
      if (deadline === undefined || rank < 0) return;
      if (t < deadline + rank * TAKEOVER_STAGGER_MS + TIMEOUT_SLACK_MS) return;
      once(`takeover:${r.hostId}:${deadline}`, () => {
        send({ kind: 'takeover' }).catch(() => undefined);
      });
    }, DUTY_TICK_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userId, send]);

  const me = getPlayer(replica.poker, userId);
  const seated = isSeated(replica, userId);
  const myStack = me?.stack ?? 0;

  // Keep the wallet's record of our chips at this table current between hands.
  const handOver = !isHandInProgress(replica.poker);
  useEffect(() => {
    if (loading || !seated || !handOver) return;
    walletRef.current.syncTable(myStack, tableKey).catch(() => undefined);
  }, [loading, seated, handOver, myStack, tableKey, replica.poker.handNumber]);

  // Coins left at this table from a seat we no longer have (e.g. closed the tab, then removed).
  const recoveredRef = useRef(false);
  useEffect(() => {
    if (loading || !wallet.ready || recoveredRef.current) return;
    recoveredRef.current = true;
    if (!isSeated(replicaRef.current, userId)) {
      walletRef.current.recoverTableChips(tableKey).catch(() => undefined);
    }
  }, [loading, wallet.ready, userId, tableKey]);

  const caughtUp = display === replica.poker;
  const legal = caughtUp ? getLegalActions(replica.poker, userId) : undefined;

  let turnTimer: TurnTimer | undefined;
  if (caughtUp && replica.poker.phase === 'betting' && replica.poker.actingSeat !== null) {
    turnTimer = {
      seat: replica.poker.actingSeat,
      ms: config.actionTimeoutMs,
      elapsedMs: Math.max(
        0,
        Math.min(config.actionTimeoutMs, now + clockOffsetRef.current - replica.turnTs)
      ),
      key: `${replica.poker.handNumber}-${replica.seq}-${replica.turnTs}`,
    };
  }

  const join = useCallback(
    async (seat: number, buyIn: number) => {
      setError(undefined);
      try {
        await walletRef.current.buyIn(buyIn, tableKey);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : tr('games.error.not_enough_coins', 'Not enough coins')
        );
        return;
      }
      pendingRef.current.push({ kind: 'join', amount: buyIn });
      try {
        await send({
          kind: 'join',
          seat,
          buyIn,
          name: profileRef.current.name,
          avatarUrl: profileRef.current.avatarUrl,
        });
      } catch {
        pendingRef.current.pop();
        await walletRef.current.refund(buyIn, tableKey);
        setError(tr('games.error.join', 'Could not join the table.'));
      }
    },
    [send, tableKey]
  );

  const leave = useCallback(async () => {
    const stack = getPlayer(replicaRef.current.poker, userId)?.stack ?? 0;
    try {
      await send({ kind: 'leave' });
      await walletRef.current.cashOut(stack, tableKey);
    } catch {
      setError(tr('games.error.leave', 'Could not leave the table. Try again.'));
    }
  }, [send, tableKey, userId]);

  const act = useCallback(
    (action: PokerAction) => {
      const r = replicaRef.current;
      const key = `${r.poker.handNumber}:${r.seq}`;
      if (actSentRef.current === key) return;
      actSentRef.current = key;
      send({ kind: 'act', hand: r.poker.handNumber, seq: r.seq, action }).catch(() => {
        actSentRef.current = undefined;
        setError(tr('games.error.action', 'Your move was not sent. Try again.'));
      });
    },
    [send]
  );

  const rebuy = useCallback(
    async (amount: number) => {
      setError(undefined);
      try {
        await walletRef.current.buyIn(amount, tableKey);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : tr('games.error.not_enough_coins', 'Not enough coins')
        );
        return;
      }
      pendingRef.current.push({ kind: 'rebuy', amount });
      try {
        await send({ kind: 'rebuy', amount });
      } catch {
        pendingRef.current.pop();
        await walletRef.current.refund(amount, tableKey);
      }
    },
    [send, tableKey]
  );

  const back = useCallback(() => {
    send({ kind: 'back' }).catch(() => undefined);
  }, [send]);

  return {
    loading,
    replica,
    display,
    me,
    seated,
    isHost: replica.hostId === userId,
    legal,
    turnTimer,
    error,
    join,
    leave,
    act,
    rebuy,
    back,
  };
};
