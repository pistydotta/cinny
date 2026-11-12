import { loadRun, saveRun } from './engine/save';
import { RunState } from './engine/types';

// The run in play, kept in this browser so it can be picked up again (see engine/save.ts).
const key = (userId: string) => `blazeroom.horde.run:${userId}`;

export const storeRun = (userId: string, run: RunState) => {
  try {
    localStorage.setItem(key(userId), saveRun(run));
  } catch {
    // Full or blocked storage: the run just can't be picked up again.
  }
};

export const readRun = (userId: string): RunState | undefined => {
  try {
    return loadRun(localStorage.getItem(key(userId)));
  } catch {
    return undefined;
  }
};

export const forgetRun = (userId: string) => {
  try {
    localStorage.removeItem(key(userId));
  } catch {
    // Nothing to forget.
  }
};

// Whether this browser has started a run before, for the first run's tips.
const tipsKey = 'blazeroom.horde.tips';

export const firstRunHere = (): boolean => {
  try {
    if (localStorage.getItem(tipsKey)) return false;
    localStorage.setItem(tipsKey, '1');
    return true;
  } catch {
    return false;
  }
};
