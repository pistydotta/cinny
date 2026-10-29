import {
  addChips,
  addPlayer,
  advanceHand,
  applyAction,
  canStartHand,
  createDeck,
  createPokerTable,
  getPlayer,
  getPlayerAtSeat,
  isHandInProgress,
  PokerPlayer,
  PokerState,
  RandomFn,
  randomInt,
  removePlayer,
  shuffle,
  startHand,
} from '../engine';
import {
  compareTableEvents,
  decodeDeck,
  decodeSnapshot,
  encodeDeck,
  encodeSnapshot,
  HAND_GAP_MS,
  HOST_GRACE_MS,
  PokerEventContent,
  TableConfig,
  TableEvent,
  TableSnapshot,
} from './protocol';

/** Everything every player derives from the table events. */
export type Replica = {
  config: TableConfig;
  poker: PokerState;
  hostId: string | null;
  /** When the current host got the job; a new host always gets some time. */
  hostSinceTs: number;
  /** Accepted `act`/`timeout` events in the current hand; actions must quote it. */
  seq: number;
  /** When the current turn started. */
  turnTs: number;
  /** Last accepted event; the next deal is due a little after it. */
  dutyTs: number;
  /** Players who left during a hand; they are removed before the next deal. */
  leaving: string[];
  /** Chips bought during a hand, added before the next deal. */
  pendingChips: Record<string, number>;
  /** Set when our copy disagreed with the host and was replaced by the host's snapshot. */
  resynced: boolean;
};

export type ApplyResult = {
  replica: Replica;
  accepted: boolean;
  reason?: string;
  /** Intermediate states, in order, for animations (the last one is `replica.poker`). */
  frames: PokerState[];
};

const pokerConfigOf = (config: TableConfig) => ({
  smallBlind: config.smallBlind,
  bigBlind: config.bigBlind,
  maxSeats: config.maxSeats,
});

export const createReplica = (config: TableConfig, ts: number): Replica => ({
  config,
  poker: createPokerTable(pokerConfigOf(config)),
  hostId: null,
  hostSinceTs: ts,
  seq: 0,
  turnTs: ts,
  dutyTs: ts,
  leaving: [],
  pendingChips: {},
  resynced: false,
});

export const isSeated = (r: Replica, userId: string): boolean =>
  !!getPlayer(r.poker, userId) && !r.leaving.includes(userId);

const setPlayer = (poker: PokerState, id: string, patch: Partial<PokerPlayer>): PokerState => ({
  ...poker,
  players: poker.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
});

/** Who takes over when the host goes: the next seated player clockwise. */
export const nextHost = (r: Replica, afterSeat: number, exclude: string[]): string | null => {
  const candidates = r.poker.players.filter(
    (p) => !exclude.includes(p.id) && !r.leaving.includes(p.id)
  );
  const ordered = [
    ...candidates.filter((p) => p.seat > afterSeat),
    ...candidates.filter((p) => p.seat <= afterSeat),
  ];
  const present = ordered.find((p) => !p.sittingOut) ?? ordered[0];
  return present?.id ?? null;
};

/** Takeover order after the current host, used to stagger who steps in first. */
export const succession = (r: Replica): string[] => {
  const host = r.hostId ? getPlayer(r.poker, r.hostId) : undefined;
  const after = host?.seat ?? -1;
  const candidates = r.poker.players.filter((p) => p.id !== r.hostId && !r.leaving.includes(p.id));
  const ordered = [
    ...candidates.filter((p) => p.seat > after),
    ...candidates.filter((p) => p.seat <= after),
  ];
  return [...ordered.filter((p) => !p.sittingOut), ...ordered.filter((p) => p.sittingOut)].map(
    (p) => p.id
  );
};

/** Removes players who left and adds chips bought mid-hand. */
export const prepareNextHand = (r: Replica): Replica => {
  let { poker } = r;
  r.leaving.forEach((id) => {
    poker = removePlayer(poker, id);
  });
  Object.entries(r.pendingChips).forEach(([id, amount]) => {
    if (getPlayer(poker, id)) poker = addChips(poker, id, amount);
  });
  return { ...r, poker, leaving: [], pendingChips: {} };
};

/** Canonical description of the table before a deal; equal digests mean equal tables. */
export const tableDigest = (poker: PokerState): string =>
  [
    `h${poker.handNumber}`,
    `b${poker.buttonSeat ?? '-'}`,
    ...poker.players.map((p) => `${p.seat}:${p.id}:${p.stack}:${p.sittingOut ? 1 : 0}`),
  ].join('|');

export const snapshotOf = (r: Replica): TableSnapshot => ({
  handNumber: r.poker.handNumber,
  buttonSeat: r.poker.buttonSeat,
  hostId: r.hostId,
  players: r.poker.players.map((p) => ({
    id: p.id,
    name: p.name,
    avatarUrl: p.avatarUrl,
    seat: p.seat,
    stack: p.stack,
    sittingOut: p.sittingOut || undefined,
  })),
});

export const adoptSnapshot = (r: Replica, snapshot: TableSnapshot): Replica => {
  let poker = createPokerTable(pokerConfigOf(r.config));
  snapshot.players
    .filter((p) => p.seat >= 0 && p.seat < r.config.maxSeats && p.stack >= 0)
    .forEach((p) => {
      if (getPlayer(poker, p.id) || getPlayerAtSeat(poker, p.seat)) return;
      poker = addPlayer(poker, {
        id: p.id,
        name: p.name,
        avatarUrl: p.avatarUrl,
        isBot: false,
        seat: p.seat,
        stack: Math.floor(p.stack),
      });
      if (p.sittingOut) poker = setPlayer(poker, p.id, { sittingOut: true });
    });
  poker = { ...poker, handNumber: snapshot.handNumber, buttonSeat: snapshot.buttonSeat };
  return { ...r, poker, hostId: snapshot.hostId, leaving: [], pendingChips: {} };
};

/** Plays out everything that needs no decision: dealing streets, folding players who left. */
const settle = (r: Replica, frames: PokerState[]): Replica => {
  let { poker } = r;
  for (let guard = 0; guard < 20; guard += 1) {
    if (poker.phase === 'street-complete') {
      poker = advanceHand(poker);
      frames.push(poker);
    } else if (poker.phase === 'betting') {
      const actor = getPlayerAtSeat(poker, poker.actingSeat);
      if (!actor || !r.leaving.includes(actor.id)) break;
      poker = applyAction(poker, actor.id, { type: 'fold' });
      frames.push(poker);
    } else {
      break;
    }
  }
  return { ...r, poker };
};

/** When the host must have done its job by; after that another player may take over. */
export const hostDeadline = (r: Replica): number | undefined => {
  if (!r.hostId) return undefined;
  let due: number | undefined;
  if (r.poker.phase === 'betting') {
    due = r.turnTs + r.config.actionTimeoutMs;
  } else if (!isHandInProgress(r.poker) && canStartHand(prepareNextHand(r).poker)) {
    due = r.dutyTs + HAND_GAP_MS;
  }
  if (due === undefined) return undefined;
  return Math.max(due, r.hostSinceTs) + HOST_GRACE_MS;
};

export type HostDuty = { kind: 'start' | 'timeout'; dueTs: number };

/** What the host has to do next, and from when. */
export const hostDuty = (r: Replica): HostDuty | undefined => {
  if (r.poker.phase === 'betting') {
    return { kind: 'timeout', dueTs: r.turnTs + r.config.actionTimeoutMs };
  }
  if (!isHandInProgress(r.poker) && canStartHand(prepareNextHand(r).poker)) {
    const gap = r.poker.handNumber === 0 ? HAND_GAP_MS / 2 : HAND_GAP_MS;
    return { kind: 'start', dueTs: r.dutyTs + gap };
  }
  return undefined;
};

/** Builds the event the host sends to deal the next hand. */
export const buildStartContent = (r: Replica, random: RandomFn): PokerEventContent => {
  const prepared = prepareNextHand(r);
  const hand = prepared.poker.handNumber + 1;
  const eligible = prepared.poker.players.filter((p) => p.stack > 0 && !p.sittingOut);
  const buttonSeat =
    prepared.poker.buttonSeat === null && eligible.length > 0
      ? eligible[randomInt(eligible.length, random)].seat
      : undefined;
  return {
    kind: 'start',
    hand,
    buttonSeat,
    deck: encodeDeck(shuffle(createDeck(), random), hand),
    digest: tableDigest(prepared.poker),
    snapshot: encodeSnapshot(snapshotOf(prepared)),
  };
};

const noRandom: RandomFn = () => 0;

/** Applies one event. Invalid events are ignored the same way by everyone. */
export const applyTableEvent = (r: Replica, event: TableEvent): ApplyResult => {
  const { sender, ts } = event;
  const c = event.content;
  const reject = (reason: string): ApplyResult => ({
    replica: r,
    accepted: false,
    reason,
    frames: [],
  });
  const frames: PokerState[] = [];
  const accept = (next: Replica): ApplyResult => {
    const settled = settle(next, frames);
    if (frames.length === 0 || frames[frames.length - 1] !== settled.poker) {
      frames.push(settled.poker);
    }
    return { replica: { ...settled, dutyTs: ts }, accepted: true, frames };
  };
  const player = getPlayer(r.poker, sender);
  const { poker, config } = r;

  try {
    switch (c.kind) {
      case 'join': {
        if (player) return reject('already seated');
        if (c.seat < 0 || c.seat >= config.maxSeats) return reject('invalid seat');
        if (getPlayerAtSeat(poker, c.seat)) return reject('seat taken');
        if (c.buyIn < config.minBuyIn || c.buyIn > config.maxBuyIn) return reject('buy-in');
        const next = addPlayer(poker, {
          id: sender,
          name: c.name.trim().slice(0, 40) || sender,
          avatarUrl: c.avatarUrl,
          isBot: false,
          seat: c.seat,
          stack: c.buyIn,
        });
        const hostId = r.hostId ?? sender;
        return accept({
          ...r,
          poker: next,
          hostId,
          hostSinceTs: r.hostId ? r.hostSinceTs : ts,
        });
      }

      case 'leave': {
        if (!player || r.leaving.includes(sender)) return reject('not seated');
        const inHand = isHandInProgress(poker) && player.status !== 'sitting-out';
        let next: Replica = inHand
          ? { ...r, leaving: [...r.leaving, sender] }
          : { ...r, poker: removePlayer(poker, sender) };
        if (r.hostId === sender) {
          next = {
            ...next,
            hostId: nextHost(next, player.seat, [sender]),
            hostSinceTs: ts,
          };
        }
        const pendingChips = Object.fromEntries(
          Object.entries(next.pendingChips).filter(([id]) => id !== sender)
        );
        const actorLeft = poker.phase === 'betting' && poker.actingSeat === player.seat;
        return accept({ ...next, pendingChips, turnTs: actorLeft ? ts : next.turnTs });
      }

      case 'back': {
        if (!player || !player.sittingOut || r.leaving.includes(sender)) return reject('not away');
        return accept({ ...r, poker: setPlayer(poker, sender, { sittingOut: false }) });
      }

      case 'rebuy': {
        if (!player || r.leaving.includes(sender)) return reject('not seated');
        const pending = r.pendingChips[sender] ?? 0;
        if (player.stack + pending + c.amount > config.maxBuyIn) return reject('over max buy-in');
        if (!isHandInProgress(poker)) {
          return accept({ ...r, poker: addChips(poker, sender, c.amount) });
        }
        return accept({ ...r, pendingChips: { ...r.pendingChips, [sender]: pending + c.amount } });
      }

      case 'start': {
        if (sender !== r.hostId) return reject('only the host deals');
        if (isHandInProgress(poker)) return reject('hand in progress');
        if (c.hand !== poker.handNumber + 1) return reject('wrong hand number');
        const deck = decodeDeck(c.deck, c.hand);
        if (!deck) return reject('bad deck');
        let prepared = prepareNextHand(r);
        let resynced = false;
        if (tableDigest(prepared.poker) !== c.digest) {
          // We missed something: trust the host's view of the table.
          const snapshot = decodeSnapshot(c.snapshot, c.hand);
          if (!snapshot || snapshot.handNumber !== c.hand - 1) return reject('bad snapshot');
          prepared = adoptSnapshot(prepared, { ...snapshot, hostId: sender });
          resynced = true;
        }
        if (!canStartHand(prepared.poker)) return reject('not enough players');
        const dealt = startHand(prepared.poker, noRandom, { deck, buttonSeat: c.buttonSeat });
        frames.push(dealt);
        return accept({ ...prepared, poker: dealt, seq: 0, turnTs: ts, resynced });
      }

      case 'act': {
        if (c.hand !== poker.handNumber || c.seq !== r.seq) return reject('stale action');
        if (poker.phase !== 'betting') return reject('no betting');
        if (getPlayerAtSeat(poker, poker.actingSeat)?.id !== sender) return reject('not your turn');
        const next = applyAction(poker, sender, c.action);
        frames.push(next);
        return accept({ ...r, poker: next, seq: r.seq + 1, turnTs: ts });
      }

      case 'timeout': {
        if (sender !== r.hostId) return reject('only the host times out players');
        if (c.hand !== poker.handNumber || c.seq !== r.seq) return reject('stale timeout');
        if (poker.phase !== 'betting') return reject('no betting');
        if (ts < r.turnTs + config.actionTimeoutMs) return reject('too early');
        const actor = getPlayerAtSeat(poker, poker.actingSeat);
        if (!actor) return reject('no actor');
        const folded = setPlayer(applyAction(poker, actor.id, { type: 'fold' }), actor.id, {
          sittingOut: true,
        });
        frames.push(folded);
        return accept({ ...r, poker: folded, seq: r.seq + 1, turnTs: ts });
      }

      case 'takeover': {
        if (!player || r.leaving.includes(sender) || sender === r.hostId) {
          return reject('cannot take over');
        }
        const deadline = hostDeadline(r);
        if (deadline === undefined || ts < deadline) return reject('host still has time');
        return accept({ ...r, hostId: sender, hostSinceTs: ts });
      }

      default:
        return reject('unknown');
    }
  } catch (e) {
    return reject(e instanceof Error ? e.message : 'invalid');
  }
};

/**
 * Rebuilds the table from its event history: starts from the last deal's snapshot when there is
 * one (so long games load fast) and applies everything after it.
 */
export const replayTable = (
  config: TableConfig,
  createdTs: number,
  history: TableEvent[]
): { base: Replica; events: TableEvent[]; replica: Replica } => {
  const events = history.slice().sort(compareTableEvents);
  let baseIndex = -1;
  let base = createReplica(config, createdTs);
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const c = events[i].content;
    if (c.kind === 'start') {
      const snapshot = decodeSnapshot(c.snapshot, c.hand);
      if (snapshot && snapshot.hostId === events[i].sender && snapshot.handNumber === c.hand - 1) {
        base = adoptSnapshot(createReplica(config, events[i].ts), snapshot);
        baseIndex = i;
        break;
      }
    }
  }
  const tail = baseIndex >= 0 ? events.slice(baseIndex) : events;
  const replica = tail.reduce((acc, ev) => applyTableEvent(acc, ev).replica, base);
  return { base, events: tail, replica };
};
