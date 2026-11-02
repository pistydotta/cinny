import { ActionResult } from './engine/actions';
import { STEP_MS } from './engine/combat';
import { OfflineReport, REPLAY_MS, catchUp } from './engine/offline';
import { advance, newGame } from './engine/progress';
import { hashSeed } from './engine/rng';
import { deserialize, serialize } from './engine/save';
import { ClassId, GameEvent, GameState } from './engine/types';

// Keeps the game going while the app is open, on any screen: one runner per logged-in user,
// living outside React. The sidebar starts it when a save exists (useIdleBackground), the game
// screen subscribes to it. Ticks fast while someone watches and slowly otherwise; each tick
// uses the real clock, so a throttled background tab or a sleeping laptop just catches up.
//
// Saved per browser in localStorage for now. Two tabs open on the same account each play and
// the last one to save wins; a server-side save would fix that when the game goes online.

export type LogEntry = { id: number; event: GameEvent };

export type IdleView = {
  state?: GameState;
  log: LogEntry[];
  offline?: OfflineReport;
  /** Everything from the last tick, hits included, for the fight's animations. */
  recent: GameEvent[];
  /** Changes on every update, since `state` is the same object stepped in place. */
  tick: number;
};

const LOG_SIZE = 60;
const FAST_MS = 200;
const SLOW_MS = 1000;
const SAVE_EVERY_MS = 10000;
/** A gap this long counts as time away and gets a report. */
const REPORT_AFTER_MS = 60000;

const storageKey = (userId: string) => `blazeroom.idle.v1:${userId}`;

const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private mode or full storage: the game keeps running, it just won't be there next time.
  }
};

export type IdleRunner = {
  userId: string;
  subscribe: (listener: () => void) => () => void;
  getView: () => IdleView;
  hasSave: () => boolean;
  start: (name: string, classId: ClassId) => void;
  dispatch: (action: (s: GameState) => ActionResult) => ActionResult | undefined;
  /** For actions that change the state and return more than that (the arena). */
  replace: (state: GameState) => void;
  dismissOffline: () => void;
  abandon: () => void;
  stop: () => void;
};

const createRunner = (userId: string): IdleRunner => {
  const key = storageKey(userId);
  const listeners = new Set<() => void>();
  let state = deserialize(readStorage(key));
  let log: LogEntry[] = [];
  let logId = 0;
  let offline: OfflineReport | undefined;
  let recent: GameEvent[] = [];
  let view: IdleView = { state, log, recent, tick: 0 };
  let carry = 0;
  let lastTick = Date.now();
  let lastSave = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const publish = () => {
    view = { state, log, offline, recent, tick: view.tick + 1 };
    listeners.forEach((l) => l());
  };

  const save = () => {
    if (!state) return;
    lastSave = Date.now();
    writeStorage(key, serialize(state));
  };

  // Blow by blow would push everything else out, so hits only reach `recent`.
  const NOISE = new Set<GameEvent['t']>(['hit', 'dodge', 'heal']);
  const pushLog = (events: GameEvent[]) => {
    recent = events;
    const kept = events.filter((e) => !NOISE.has(e.t));
    if (kept.length === 0) return;
    const added = kept.slice(-LOG_SIZE).map((event) => {
      logId += 1;
      return { id: logId, event };
    });
    log = [...log, ...added].slice(-LOG_SIZE);
  };

  const step = () => {
    if (!state) return;
    const now = Date.now();
    const gap = now - lastTick + carry;
    lastTick = now;
    if (gap > REPLAY_MS) {
      const report = catchUp(state, gap);
      if (gap >= REPORT_AFTER_MS) offline = report;
      recent = [];
      carry = 0;
    } else {
      pushLog(advance(state, gap));
      carry = gap % STEP_MS;
    }
    state.lastSeen = now;
    if (now - lastSave >= SAVE_EVERY_MS) save();
    publish();
  };

  const schedule = () => {
    if (stopped || !state) return;
    timer = setTimeout(
      () => {
        step();
        schedule();
      },
      listeners.size > 0 ? FAST_MS : SLOW_MS
    );
  };

  const onHide = () => {
    if (document.visibilityState === 'hidden') save();
  };
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', onHide);

  // Time since the last save, from when the app was closed.
  if (state) {
    const away = Date.now() - state.lastSeen;
    if (away > 0) {
      const report = catchUp(state, away);
      if (away >= REPORT_AFTER_MS) offline = report;
      state.lastSeen = Date.now();
      save();
    }
    view = { state, log, offline, recent, tick: 1 };
    schedule();
  }

  return {
    userId,
    subscribe: (listener) => {
      listeners.add(listener);
      // Pick up the faster pace now instead of after the slow tick.
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
        schedule();
      }
      return () => listeners.delete(listener);
    },
    getView: () => view,
    hasSave: () => state !== undefined,
    start: (name, classId) => {
      const now = Date.now();
      state = newGame(name, classId, hashSeed(`${userId}|${now}`), now);
      log = [];
      lastTick = now;
      carry = 0;
      save();
      publish();
      if (timer === undefined) schedule();
    },
    dispatch: (action) => {
      if (!state) return undefined;
      const result = action(state);
      if (result.ok) {
        state = result.state;
        save();
        publish();
      }
      return result;
    },
    replace: (next) => {
      state = next;
      save();
      publish();
    },
    dismissOffline: () => {
      offline = undefined;
      publish();
    },
    abandon: () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      state = undefined;
      log = [];
      offline = undefined;
      writeStorage(key, null);
      publish();
    },
    stop: () => {
      stopped = true;
      if (timer !== undefined) clearTimeout(timer);
      save();
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', onHide);
    },
  };
};

let current: IdleRunner | undefined;

/** The runner for this user, made on first use. Logging in as someone else swaps it. */
export const getIdleRunner = (userId: string): IdleRunner => {
  if (current?.userId !== userId) {
    current?.stop();
    current = createRunner(userId);
  }
  return current;
};

export const hasIdleSave = (userId: string): boolean => readStorage(storageKey(userId)) !== null;
