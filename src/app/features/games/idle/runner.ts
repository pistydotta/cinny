import { ActionResult } from './engine/actions';
import { STEP_MS } from './engine/combat';
import { OfflineReport, REPLAY_MS, catchUp } from './engine/offline';
import { advance, newGame } from './engine/progress';
import { hashSeed } from './engine/rng';
import { deserialize, isOldSave, serialize } from './engine/save';
import { ClassId, GameEvent, GameState } from './engine/types';
import { IdleSaveApi, createIdleSaveApi, deviceLabel, pickSave } from './cloudSave';

// Keeps the game going while the app is open, on any screen: one runner per logged-in user,
// living outside React. The sidebar starts it when a save exists (useIdleBackground), the game
// screen subscribes to it. Ticks fast while someone watches and slowly otherwise; each tick
// uses the real clock, so a throttled background tab or a sleeping laptop just catches up.
//
// Saved in localStorage every few seconds, and on the server (cloudSave.ts) every couple of
// minutes, when the tab hides and right after the player does something. The server copy is
// what follows the player to another device. Only one device plays at a time: when another one
// saved since, this one pauses and offers "play here", which takes the game back.

export type LogEntry = { id: number; event: GameEvent };

export type CloudStatus =
  /** No server (not logged in, tests). */
  | 'off'
  /** Asking the server which save to play. */
  | 'loading'
  | 'saving'
  | 'saved'
  /** The server couldn't be reached; the game goes on and tries again. */
  | 'error'
  /** Another device took the game: this one is paused. */
  | 'elsewhere';

export type CloudView = { status: CloudStatus; device?: string | null };

export type IdleView = {
  state?: GameState;
  log: LogEntry[];
  offline?: OfflineReport;
  /** Everything from the last tick, hits included, for the fight's animations. */
  recent: GameEvent[];
  /** Changes on every update, since `state` is the same object stepped in place. */
  tick: number;
  /** The save was from before the rework and was dropped. */
  wiped: boolean;
  cloud: CloudView;
};

const LOG_SIZE = 60;
const FAST_MS = 200;
const SLOW_MS = 1000;
const SAVE_EVERY_MS = 10000;
const CLOUD_EVERY_MS = 2 * 60 * 1000;
/** After an action, wait this long for more before sending the save up. */
const CLOUD_SOON_MS = 3000;
const CLOUD_RETRY_MS = 60000;
/** A gap this long counts as time away and gets a report. */
const REPORT_AFTER_MS = 60000;

const storageKey = (userId: string) => `blazeroom.idle.v1:${userId}`;
/** The server revision this browser last wrote or read. */
const revisionKey = (userId: string) => `blazeroom.idle.rev:${userId}`;

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
  /** Every batch of events as it happens, for the battle effects. */
  onEvents: (listener: (events: GameEvent[], spanMs: number) => void) => () => void;
  abandon: () => void;
  /** The game screen opened here: send the save up, so other devices pause. */
  claim: () => void;
  /** After another device took the game: load its save and play here again. */
  playHere: () => void;
  stop: () => void;
};

const createRunner = (userId: string, api?: IdleSaveApi): IdleRunner => {
  const key = storageKey(userId);
  const revKey = revisionKey(userId);
  const device = deviceLabel(typeof navigator === 'undefined' ? '' : navigator.userAgent);
  const listeners = new Set<() => void>();
  const eventListeners = new Set<(events: GameEvent[], spanMs: number) => void>();
  const stored = readStorage(key);
  let state = deserialize(stored);
  const wiped = !state && isOldSave(stored);
  let log: LogEntry[] = [];
  let logId = 0;
  let offline: OfflineReport | undefined;
  let recent: GameEvent[] = [];
  let cloud: CloudView = { status: api ? 'loading' : 'off' };
  let revision = Number(readStorage(revKey)) || 0;
  /** True once the server said which save to play; nothing goes up before that. */
  let cloudReady = false;
  let inFlight = false;
  let again = false;
  let lastPush = Date.now();
  let soon: ReturnType<typeof setTimeout> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let removal: Promise<void> = Promise.resolve();
  /** The game screen opened before the server answered: take the game once it does. */
  let claimed = false;
  let view: IdleView = { state, log, recent, tick: 0, wiped, cloud };
  let carry = 0;
  let lastTick = Date.now();
  let lastSave = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const publish = () => {
    view = { state, log, offline, recent, tick: view.tick + 1, wiped: wiped && !state, cloud };
    listeners.forEach((l) => l());
  };

  const save = () => {
    if (!state) return;
    lastSave = Date.now();
    writeStorage(key, serialize(state));
  };

  // Blow by blow would push everything else out, so hits only reach `recent`.
  const NOISE = new Set<GameEvent['t']>(['hit', 'dodge', 'heal', 'pet', 'thorns']);
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
      const events = advance(state, gap);
      pushLog(events);
      if (events.length > 0) eventListeners.forEach((l) => l(events, gap));
      carry = gap % STEP_MS;
    }
    state.lastSeen = now;
    if (now - lastSave >= SAVE_EVERY_MS) save();
    // eslint-disable-next-line no-use-before-define
    if (now - lastPush >= CLOUD_EVERY_MS) push();
    publish();
  };

  const schedule = () => {
    if (stopped || !state || cloud.status === 'elsewhere') return;
    timer = setTimeout(
      () => {
        step();
        schedule();
      },
      listeners.size > 0 ? FAST_MS : SLOW_MS
    );
  };

  const setCloud = (next: CloudView) => {
    cloud = next;
    publish();
  };

  const setRevision = (r: number) => {
    revision = r;
    writeStorage(revKey, String(r));
  };

  const push = async (): Promise<void> => {
    if (!api || !cloudReady || !state || cloud.status === 'elsewhere') return;
    if (inFlight) {
      again = true;
      return;
    }
    inFlight = true;
    lastPush = Date.now();
    try {
      await removal;
      if (!state) return;
      setCloud({ status: 'saving' });
      const result = await api.put(serialize(state), revision, device);
      if (result.ok) {
        setRevision(result.revision);
        setCloud({ status: 'saved' });
      } else {
        // Someone else saved since: that device is playing. Pause here until asked.
        if (timer !== undefined) clearTimeout(timer);
        timer = undefined;
        again = false;
        setCloud({ status: 'elsewhere', device: result.conflict.device });
      }
    } catch {
      setCloud({ status: 'error' });
    } finally {
      inFlight = false;
      if (again) {
        again = false;
        push();
      }
    }
  };

  const pushSoon = () => {
    if (soon !== undefined) clearTimeout(soon);
    soon = setTimeout(() => {
      soon = undefined;
      push();
    }, CLOUD_SOON_MS);
  };

  /** Plays the server's save from now on, counting the time since it was written as time away. */
  const adopt = (text: string, rev: number): boolean => {
    const remote = deserialize(text);
    if (!remote) return false;
    state = remote;
    setRevision(rev);
    log = [];
    recent = [];
    carry = 0;
    lastTick = Date.now();
    const away = Date.now() - remote.lastSeen;
    if (away > 0) {
      const report = catchUp(remote, away);
      if (away >= REPORT_AFTER_MS) offline = report;
      remote.lastSeen = Date.now();
    }
    save();
    return true;
  };

  /** Asks the server which save to play: the one here, or another device's newer one. */
  const sync = async (claim: boolean) => {
    if (!api) return;
    if (retry !== undefined) clearTimeout(retry);
    retry = undefined;
    try {
      const remote = await api.get();
      if (stopped) return;
      const choice = pickSave(!!state, revision, remote);
      if (choice === 'remote' && remote.save !== null) {
        // A save this version can't read (an app update on another device): leave both alone.
        if (!adopt(remote.save, remote.revision)) {
          setCloud({ status: 'error' });
          return;
        }
      }
      cloudReady = true;
      setCloud({ status: 'saved' });
      if (choice === 'local' || claim || claimed) await push();
      if (timer === undefined) schedule();
    } catch {
      setCloud({ status: 'error' });
      retry = setTimeout(() => sync(claim), CLOUD_RETRY_MS);
    }
  };

  const onHide = () => {
    if (document.visibilityState === 'hidden') {
      save();
      push();
    }
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
    view = { state, log, offline, recent, tick: 1, wiped, cloud };
    schedule();
  }
  sync(false);

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
      push();
    },
    dispatch: (action) => {
      if (!state) return undefined;
      const result = action(state);
      if (result.ok) {
        state = result.state;
        save();
        publish();
        pushSoon();
      }
      return result;
    },
    replace: (next) => {
      state = next;
      save();
      publish();
      pushSoon();
    },
    onEvents: (listener) => {
      eventListeners.add(listener);
      return () => {
        eventListeners.delete(listener);
      };
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
      if (api) {
        // A new hero's first save waits for this, or the delete could land after it.
        removal = api
          .remove()
          .then(() => setRevision(0))
          .catch(() => undefined);
      }
      publish();
    },
    claim: () => {
      if (!cloudReady) claimed = true;
      else if (cloud.status !== 'elsewhere') push();
    },
    playHere: () => {
      setCloud({ status: 'loading' });
      sync(true);
    },
    stop: () => {
      stopped = true;
      if (timer !== undefined) clearTimeout(timer);
      if (soon !== undefined) clearTimeout(soon);
      if (retry !== undefined) clearTimeout(retry);
      save();
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', onHide);
    },
  };
};

let current: IdleRunner | undefined;

/**
 * The runner for this user, made on first use. Logging in as someone else swaps it. With
 * `getToken` the save also lives on the server.
 */
export const getIdleRunner = (userId: string, getToken?: () => string | null): IdleRunner => {
  if (current?.userId !== userId) {
    current?.stop();
    current = createRunner(userId, getToken ? createIdleSaveApi(getToken) : undefined);
  }
  return current;
};

export const hasIdleSave = (userId: string): boolean => readStorage(storageKey(userId)) !== null;
