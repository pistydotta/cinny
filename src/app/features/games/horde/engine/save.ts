import { CHARACTER_IDS, ENGINE_VERSION } from './data';
import { createRng } from './rng';
import { RunState } from './types';

// A run kept in the browser while it's played, so a reload, a click on a notification or the
// phone killing the tab doesn't lose it. Everything in a run is plain data except the rng, which
// is saved as its state and made again from it, so the run goes on exactly as it would have.

type Saved = Omit<RunState, 'rng'> & { version: number; rngState: number };

export const saveRun = (run: RunState): string => {
  const { rng, ...rest } = run;
  const saved: Saved = { ...rest, version: ENGINE_VERSION, rngState: rng.state() };
  return JSON.stringify(saved);
};

// The saved run, or undefined when there is none, it's broken, it's over, or an older version of
// the game wrote it (its rules may not hold anymore).
export const loadRun = (text: string | null | undefined): RunState | undefined => {
  if (!text) return undefined;
  try {
    const saved = JSON.parse(text) as Saved;
    if (saved?.version !== ENGINE_VERSION) return undefined;
    if (!CHARACTER_IDS.includes(saved.character)) return undefined;
    if (!['playing', 'choosing', 'chest'].includes(saved.phase)) return undefined;
    if (typeof saved.rngState !== 'number' || !saved.player || !Array.isArray(saved.enemies)) {
      return undefined;
    }
    const run: RunState & { version?: number; rngState?: number } = {
      ...saved,
      rng: createRng(saved.rngState),
      resumed: true,
    };
    delete run.version;
    delete run.rngState;
    return run;
  } catch {
    return undefined;
  }
};
