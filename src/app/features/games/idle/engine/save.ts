import { isClassId } from './classes';
import { GameState, SAVE_VERSION } from './types';

// A save is the GameState as JSON, minus the fight in progress. When the shape changes, bump
// SAVE_VERSION and add a step to `migrate`: old saves must keep loading, in browsers and later
// on the server.
export const serialize = (s: GameState): string => JSON.stringify({ ...s, battle: null });

// Version 1 (the first test, with the grid backpack and ten classes) isn't migrated: the game
// was reworked while still in testing and everyone starts over.
const migrate = (raw: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (raw.version === SAVE_VERSION) return raw;
  return undefined;
};

/** A save from before the rework, to tell the player why their hero is gone. */
export const isOldSave = (text: string | null | undefined): boolean => {
  if (!text) return false;
  try {
    return JSON.parse(text)?.version === 1;
  } catch {
    return false;
  }
};

export const deserialize = (text: string | null | undefined): GameState | undefined => {
  if (!text) return undefined;
  try {
    const raw = JSON.parse(text);
    if (typeof raw !== 'object' || raw === null) return undefined;
    const data = migrate(raw);
    if (!data) return undefined;
    const s = data as unknown as GameState;
    if (!s.hero || !isClassId(s.hero.classId) || !Array.isArray(s.inventory)) {
      return undefined;
    }
    return { ...s, battle: null, respawnMs: 0 };
  } catch {
    return undefined;
  }
};
