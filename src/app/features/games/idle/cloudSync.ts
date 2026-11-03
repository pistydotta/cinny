import { deserialize } from './engine/save';

// The save lives in the account's Matrix account data, so the hero is the same on every
// computer and phone. The browser keeps a copy too, to start at once and to play offline.
export const IDLE_ACCOUNT_DATA = 'br.com.blazeroom.idle';

export type SaveEnvelope = {
  /** The serialized game, or null once the hero was deleted. */
  save: string | null;
  /** One hero's whole life. A new hero gets a new id. */
  gameId: string;
  savedAt: number;
  /** The app instance that wrote it, so a device ignores its own writes coming back. */
  writer: string;
};

const isEnvelope = (v: unknown): v is SaveEnvelope => {
  if (typeof v !== 'object' || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    (typeof e.save === 'string' || e.save === null) &&
    typeof e.gameId === 'string' &&
    typeof e.savedAt === 'number' &&
    typeof e.writer === 'string'
  );
};

export const parseEnvelope = (content: unknown): SaveEnvelope | undefined =>
  isEnvelope(content) ? content : undefined;

/** The browser's copy. Before the cloud save it held the bare game; that still loads. */
export const parseLocal = (text: string | null): SaveEnvelope | undefined => {
  if (!text) return undefined;
  try {
    const raw = JSON.parse(text);
    if (isEnvelope(raw)) return raw;
    const state = deserialize(text);
    if (!state) return undefined;
    return { save: text, gameId: 'local', savedAt: state.lastSeen, writer: 'local' };
  } catch {
    return undefined;
  }
};

const playMs = (e: SaveEnvelope): number =>
  e.save ? deserialize(e.save)?.lifetime.playMs ?? 0 : 0;

/**
 * Which copy to keep when the device's and the account's differ. The same hero: the one saved
 * last. Two different heroes (each device started one before the cloud save existed): the one
 * played longest, so a hero with days of progress never loses to one made a minute ago. A
 * deletion only counts for the hero it deleted.
 */
export const pickSave = (
  local: SaveEnvelope | undefined,
  remote: SaveEnvelope | undefined
): 'local' | 'remote' | 'same' => {
  if (!remote && !local) return 'same';
  if (!remote) return 'local';
  if (!local) return 'remote';
  if (remote.gameId === local.gameId) {
    if (remote.savedAt === local.savedAt) return 'same';
    return remote.savedAt > local.savedAt ? 'remote' : 'local';
  }
  if (!remote.save) return 'local';
  if (!local.save) return 'remote';
  return playMs(remote) > playMs(local) ? 'remote' : 'local';
};
