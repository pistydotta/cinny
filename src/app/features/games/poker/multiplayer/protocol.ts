import { Card, Rank, RANKS, Suit, SUITS } from '../engine';

/*
 * A shared table lives in its own Matrix room. Every player runs the same poker engine and
 * applies the same events in the same order, so every screen shows the same game.
 *
 * The table's organizer (the "host") shuffles and sends the deck when a hand starts, and folds
 * players who run out of time. If the host leaves or disappears, the next player takes over.
 *
 * Cards are never shown for anyone but their owner (until showdown), including the host. They do
 * travel inside the events, encoded so they are not readable at a glance; this keeps honest
 * players honest but is not cryptographic protection.
 */

/** Room type of a poker table room (m.room.create `type`). */
export const POKER_ROOM_TYPE = 'io.github.pistydotta.poker.table';
/** State event with the table settings. */
export const POKER_TABLE_STATE = 'io.github.pistydotta.poker.table';
/** Timeline event carrying every table action. */
export const POKER_EVENT = 'io.github.pistydotta.poker';

export const PROTOCOL_VERSION = 1;

export type TableConfig = {
  version: number;
  name: string;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  maxSeats: number;
  /** How long a player has to act before the host folds them. */
  actionTimeoutMs: number;
};

export const BLIND_LEVELS: { smallBlind: number; bigBlind: number }[] = [
  { smallBlind: 10, bigBlind: 20 },
  { smallBlind: 25, bigBlind: 50 },
  { smallBlind: 50, bigBlind: 100 },
];

export const createTableConfig = (name: string, smallBlind: number, bigBlind: number) => ({
  version: PROTOCOL_VERSION,
  name,
  smallBlind,
  bigBlind,
  minBuyIn: bigBlind * 20,
  maxBuyIn: bigBlind * 100,
  maxSeats: 6,
  actionTimeoutMs: 40000,
});

/** Pause between the end of a hand and the next deal, so everyone sees the result. */
export const HAND_GAP_MS = 6000;
/** Extra time a late host gets before another player may take over. */
export const HOST_GRACE_MS = 10000;
/** Delay between successive players offering to take over, to avoid everyone doing it at once. */
export const TAKEOVER_STAGGER_MS = 4000;

export type SeatedPlayerSnapshot = {
  id: string;
  name: string;
  avatarUrl?: string;
  seat: number;
  stack: number;
  sittingOut?: boolean;
};

/** Table state right before a hand is dealt; lets late arrivals catch up. */
export type TableSnapshot = {
  handNumber: number;
  buttonSeat: number | null;
  hostId: string | null;
  players: SeatedPlayerSnapshot[];
};

export type WireAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'raise'; amount: number };

export type PokerEventContent =
  | { kind: 'join'; seat: number; buyIn: number; name: string; avatarUrl?: string }
  | { kind: 'leave' }
  | { kind: 'back' }
  | { kind: 'rebuy'; amount: number }
  | {
      kind: 'start';
      hand: number;
      buttonSeat?: number;
      /** Encoded deck, see encodeDeck. */
      deck: string;
      /** Digest of the table right before the deal, to detect players that fell out of sync. */
      digest: string;
      /** Encoded TableSnapshot. */
      snapshot: string;
    }
  | { kind: 'act'; hand: number; seq: number; action: WireAction }
  | { kind: 'timeout'; hand: number; seq: number }
  | { kind: 'takeover' };

export type TableEvent = {
  id: string;
  sender: string;
  /** Server timestamp; the same for everyone, so rules based on time agree everywhere. */
  ts: number;
  content: PokerEventContent;
};

/** Total order shared by all players: server time, then event id. */
export const compareTableEvents = (a: TableEvent, b: TableEvent): number =>
  a.ts - b.ts || (a.id < b.id ? -1 : Number(a.id > b.id));

/* ---------- Encoding ---------- */
/* eslint-disable no-bitwise */

const MASK_SEED = 0x5bd1e995;

/** Simple keystream so encoded cards are not readable in the raw event. Not encryption. */
const keystream = (length: number, salt: number): number[] => {
  const out: number[] = [];
  let x = (MASK_SEED + salt * 2654435761) % 4294967296;
  for (let i = 0; i < length; i += 1) {
    x = (x * 1103515245 + 12345) % 2147483648;
    out.push(Math.floor(x / 8388608) % 256);
  }
  return out;
};

const toBase64 = (bytes: number[]): string => btoa(String.fromCharCode(...bytes));

const fromBase64 = (text: string): number[] => Array.from(atob(text), (ch) => ch.charCodeAt(0));

export const encodeDeck = (deck: Card[], salt: number): string => {
  const mask = keystream(deck.length, salt);
  return toBase64(deck.map((c, i) => (c.rank * 4 + SUITS.indexOf(c.suit)) ^ mask[i]));
};

export const decodeDeck = (encoded: string, salt: number): Card[] | undefined => {
  try {
    const bytes = fromBase64(encoded);
    const mask = keystream(bytes.length, salt);
    const deck = bytes.map((b, i) => {
      const v = b ^ mask[i];
      return { rank: Math.floor(v / 4) as Rank, suit: SUITS[v % 4] as Suit };
    });
    const unique = new Set(deck.map((c) => `${c.rank}${c.suit}`));
    const valid =
      deck.length === 52 &&
      unique.size === 52 &&
      deck.every((c) => RANKS.includes(c.rank) && SUITS.includes(c.suit));
    return valid ? deck : undefined;
  } catch {
    return undefined;
  }
};

export const encodeSnapshot = (snapshot: TableSnapshot): string => {
  const json = new TextEncoder().encode(JSON.stringify(snapshot));
  const mask = keystream(json.length, snapshot.handNumber);
  return toBase64(Array.from(json, (b, i) => b ^ mask[i]));
};

export const decodeSnapshot = (encoded: string, handNumber: number): TableSnapshot | undefined => {
  try {
    const bytes = fromBase64(encoded);
    const mask = keystream(bytes.length, handNumber);
    const json = new TextDecoder().decode(new Uint8Array(bytes.map((b, i) => b ^ mask[i])));
    const parsed = JSON.parse(json) as TableSnapshot;
    if (!Array.isArray(parsed.players)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
};

/* eslint-enable no-bitwise */

/* ---------- Validation of untrusted content ---------- */

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isStr = (v: unknown, max = 200): v is string => typeof v === 'string' && v.length <= max;

const parseAction = (raw: unknown): WireAction | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const { type, amount } = raw as Record<string, unknown>;
  if (type === 'fold' || type === 'check' || type === 'call') return { type };
  if (type === 'raise' && isInt(amount) && amount > 0) return { type, amount };
  return undefined;
};

/** Returns well-formed content, or undefined for anything malformed. */
export const parseEventContent = (raw: unknown): PokerEventContent | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const c = raw as Record<string, unknown>;
  switch (c.kind) {
    case 'join':
      if (!isInt(c.seat) || !isInt(c.buyIn) || !isStr(c.name, 100)) return undefined;
      return {
        kind: 'join',
        seat: c.seat,
        buyIn: c.buyIn,
        name: c.name,
        avatarUrl: isStr(c.avatarUrl, 2000) ? c.avatarUrl : undefined,
      };
    case 'leave':
    case 'back':
    case 'takeover':
      return { kind: c.kind };
    case 'rebuy':
      return isInt(c.amount) && c.amount > 0 ? { kind: 'rebuy', amount: c.amount } : undefined;
    case 'start':
      if (!isInt(c.hand) || !isStr(c.deck, 400) || !isStr(c.digest, 4000)) return undefined;
      if (!isStr(c.snapshot, 20000)) return undefined;
      return {
        kind: 'start',
        hand: c.hand,
        buttonSeat: isInt(c.buttonSeat) ? c.buttonSeat : undefined,
        deck: c.deck,
        digest: c.digest,
        snapshot: c.snapshot,
      };
    case 'act': {
      const action = parseAction(c.action);
      if (!isInt(c.hand) || !isInt(c.seq) || !action) return undefined;
      return { kind: 'act', hand: c.hand, seq: c.seq, action };
    }
    case 'timeout':
      if (!isInt(c.hand) || !isInt(c.seq)) return undefined;
      return { kind: 'timeout', hand: c.hand, seq: c.seq };
    default:
      return undefined;
  }
};

export const parseTableConfig = (raw: unknown): TableConfig | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const c = raw as Record<string, unknown>;
  const ints = ['smallBlind', 'bigBlind', 'minBuyIn', 'maxBuyIn', 'maxSeats', 'actionTimeoutMs'];
  if (!ints.every((k) => isInt(c[k]) && (c[k] as number) > 0)) return undefined;
  if (!isStr(c.name, 100)) return undefined;
  return {
    version: isInt(c.version) ? c.version : PROTOCOL_VERSION,
    name: c.name,
    smallBlind: c.smallBlind as number,
    bigBlind: c.bigBlind as number,
    minBuyIn: c.minBuyIn as number,
    maxBuyIn: c.maxBuyIn as number,
    maxSeats: Math.min(6, c.maxSeats as number),
    actionTimeoutMs: Math.max(10000, c.actionTimeoutMs as number),
  };
};
