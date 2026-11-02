import { isClassId } from './classes';
import { GameState, SAVE_VERSION } from './types';

// A save is the GameState as JSON, minus the fight in progress. When the shape changes, bump
// SAVE_VERSION and add a step to `migrate`: old saves must keep loading, in browsers and later
// on the server.
export const serialize = (s: GameState): string => JSON.stringify({ ...s, battle: null });

const migrate = (raw: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (raw.version === SAVE_VERSION) return raw;
  return undefined;
};

export const deserialize = (text: string | null | undefined): GameState | undefined => {
  if (!text) return undefined;
  try {
    const raw = JSON.parse(text);
    if (typeof raw !== 'object' || raw === null) return undefined;
    const data = migrate(raw);
    if (!data) return undefined;
    const s = data as unknown as GameState;
    if (!s.hero || !isClassId(s.hero.classId) || !s.backpack || !Array.isArray(s.backpack.items)) {
      return undefined;
    }
    return { ...s, battle: null, respawnMs: 0 };
  } catch {
    return undefined;
  }
};
