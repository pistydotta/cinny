import { ActionResult } from './engine/actions';
import { STEP_MS } from './engine/combat';
import { OfflineReport, REPLAY_MS, catchUp } from './engine/offline';
import { advance, newGame } from './engine/progress';
import { hashSeed } from './engine/rng';
import { deserialize, serialize } from './engine/save';
import { ClassId, GameEvent, GameState } from './engine/types';
import { SaveEnvelope, parseEnvelope, parseLocal, pickSave } from './cloudSync';

// Keeps the game going while the app is open, on any screen: one runner per logged-in user,
// living outside React. The sidebar starts it when a save exists (useIdleBackground), the game
// screen subscribes to it. Ticks fast while someone watches and slowly otherwise; each tick
// uses the real clock, so a throttled background tab or a sleeping laptop just catches up.
//
// The save goes to the account (cloudSync.ts) so the hero follows the player to any device,
// with a copy in localStorage to start at once. Two devices playing at the same time take
// turns: each adopts the other's save when it arrives, so they share one hero.

export type LogEntry = { id: number; event: GameEvent };

export type CloudStatus = 'loading' | 'ready' | 'error';

export type IdleView = {
  state?: GameState;
  log: LogEntry[];
  offline?: OfflineReport;
  /** Everything from the last tick, hits included, for the fight's animations. */
  recent: GameEvent[];
  /** Changes on every update, since `state` is the same object stepped in place. */
  tick: number;
  /** The account's save: still being fetched, in sync, or out of reach. */
  cloud: CloudStatus;
};

/** Where the account's save lives. The app hands in Matrix account data (useIdleGame.ts). */
export type CloudSave = {
  /** The stored content, fresh from the server. */
  load: () => Promise<unknown>;
  save: (envelope: SaveEnvelope) => Promise<void>;
  /** Content written by any device, this one included. */
  watch: (onChange: (content: unknown) => void) => () => void;
};

const LOG_SIZE = 60;
const FAST_MS = 200;
const SLOW_MS = 1000;
const SAVE_EVERY_MS = 10000;
/** To the account: every minute while someone watches, every five otherwise. */
const CLOUD_WATCHED_MS = 60000;
const CLOUD_IDLE_MS = 5 * 60000;
/** After a player's action, soon enough to survive switching devices right away. */
const CLOUD_AFTER_ACTION_MS = 3000;
const CLOUD_RETRY_MS = 30000;
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
  retryCloud: () => void;
  abandon: () => void;
  stop: () => void;
};

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const createRunner = (userId: string, cloud: CloudSave): IdleRunner => {
  const key = storageKey(userId);
  const listeners = new Set<() => void>();
  const writer = newId();
  // The browser's copy as it was before this visit's catch-up moved it forward.
  const atStart = parseLocal(readStorage(key));
  let state = atStart?.save ? deserialize(atStart.save) : undefined;
  let gameId = atStart?.gameId ?? newId();
  let cloudStatus: CloudStatus = 'loading';
  let cloudDueAt = Infinity;
  let cloudBusy = false;
  /** savedAt of the newest account save this device wrote or took. */
  let cloudSeen = 0;
  let log: LogEntry[] = [];
  let logId = 0;
  let offline: OfflineReport | undefined;
  let recent: GameEvent[] = [];
  let view: IdleView = { state, log, recent, tick: 0, cloud: cloudStatus };
  let carry = 0;
  let lastTick = Date.now();
  let lastSave = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const publish = () => {
    view = { state, log, offline, recent, tick: view.tick + 1, cloud: cloudStatus };
    listeners.forEach((l) => l());
  };

  const envelope = (): SaveEnvelope => ({
    save: state ? serialize(state) : null,
    gameId,
    savedAt: state?.lastSeen ?? Date.now(),
    writer,
  });

  const save = () => {
    lastSave = Date.now();
    writeStorage(key, JSON.stringify(envelope()));
  };

  const pushCloud = () => {
    if (cloudStatus !== 'ready') return;
    if (cloudBusy) {
      cloudDueAt = Math.min(cloudDueAt, Date.now() + CLOUD_AFTER_ACTION_MS);
      return;
    }
    const sent = envelope();
    cloudBusy = true;
    cloudDueAt = Date.now() + (listeners.size > 0 ? CLOUD_WATCHED_MS : CLOUD_IDLE_MS);
    cloud
      .save(sent)
      .then(() => {
        cloudSeen = Math.max(cloudSeen, sent.savedAt);
      })
      .catch(() => {
        cloudDueAt = Date.now() + CLOUD_RETRY_MS;
      })
      .finally(() => {
        cloudBusy = false;
      });
  };

  /** Something the player did: worth keeping on the account soon. */
  const changed = () => {
    if (state) state.lastSeen = Date.now();
    save();
    cloudDueAt = Math.min(cloudDueAt, Date.now() + CLOUD_AFTER_ACTION_MS);
    publish();
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
    if (now >= cloudDueAt) pushCloud();
    publish();
  };

  const schedule = () => {
    if (stopped || !state || timer !== undefined) return;
    timer = setTimeout(
      () => {
        timer = undefined;
        step();
        schedule();
      },
      listeners.size > 0 ? FAST_MS : SLOW_MS
    );
  };

  const onHide = () => {
    if (document.visibilityState !== 'hidden') return;
    save();
    if (state) pushCloud();
  };
  const onPageHide = () => save();
  window.addEventListener('pagehide', onPageHide);
  document.addEventListener('visibilitychange', onHide);

  /** Plays the time since a save was made, then runs it. */
  const resume = (next: GameState) => {
    state = next;
    const away = Date.now() - state.lastSeen;
    if (away > 0) {
      const report = catchUp(state, away);
      if (away >= REPORT_AFTER_MS) offline = report;
      state.lastSeen = Date.now();
    }
    lastTick = Date.now();
    carry = 0;
    schedule();
  };

  /** Takes the account's save over this device's. */
  const adopt = (remote: SaveEnvelope) => {
    const next = remote.save ? deserialize(remote.save) : undefined;
    if (remote.save && !next) return;
    cloudSeen = Math.max(cloudSeen, remote.savedAt);
    gameId = remote.gameId;
    log = [];
    recent = [];
    offline = undefined;
    if (next) {
      resume(next);
    } else {
      state = undefined;
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    }
    save();
    publish();
  };

  let unwatch: (() => void) | undefined;
  const connect = () => {
    cloudStatus = 'loading';
    publish();
    cloud
      .load()
      .then((content) => {
        if (stopped) return;
        cloudStatus = 'ready';
        const remote = parseEnvelope(content);
        const choice = pickSave(atStart, remote);
        if (choice === 'remote' && remote) adopt(remote);
        else if (state) cloudDueAt = Date.now();
        if (remote && choice !== 'local') cloudSeen = remote.savedAt;
        unwatch?.();
        unwatch = cloud.watch((changedContent) => {
          const e = parseEnvelope(changedContent);
          if (!e || e.writer === writer || e.savedAt <= cloudSeen) return;
          // The same hero saved by another device: it's playing now, follow it. Another
          // hero only replaces this one if it has been played longer.
          if (e.gameId === gameId || pickSave(envelope(), e) === 'remote') adopt(e);
        });
        publish();
      })
      .catch(() => {
        if (stopped) return;
        // Never write to the account without having read it: that could bury a hero.
        cloudStatus = 'error';
        publish();
        setTimeout(() => {
          if (!stopped && cloudStatus === 'error') connect();
        }, CLOUD_RETRY_MS);
      });
  };

  // Time since the last save, from when the app was closed.
  if (state) resume(state);
  view = { state, log, offline, recent, tick: 1, cloud: cloudStatus };
  connect();

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
      gameId = newId();
      state = newGame(name, classId, hashSeed(`${userId}|${now}`), now);
      log = [];
      lastTick = now;
      carry = 0;
      changed();
      schedule();
    },
    dispatch: (action) => {
      if (!state) return undefined;
      const result = action(state);
      if (result.ok) {
        state = result.state;
        changed();
      }
      return result;
    },
    replace: (next) => {
      state = next;
      changed();
    },
    dismissOffline: () => {
      offline = undefined;
      publish();
    },
    retryCloud: () => {
      if (cloudStatus === 'error') connect();
    },
    abandon: () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      state = undefined;
      log = [];
      offline = undefined;
      // Written as a deletion of this hero, so the other devices drop it too.
      save();
      pushCloud();
      publish();
    },
    stop: () => {
      stopped = true;
      if (timer !== undefined) clearTimeout(timer);
      unwatch?.();
      save();
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onHide);
    },
  };
};

let current: IdleRunner | undefined;

/** The runner for this user, made on first use. Logging in as someone else swaps it. */
export const getIdleRunner = (userId: string, cloud: CloudSave): IdleRunner => {
  if (current?.userId !== userId) {
    current?.stop();
    current = createRunner(userId, cloud);
  }
  return current;
};

export const hasLocalIdleSave = (userId: string): boolean =>
  !!parseLocal(readStorage(storageKey(userId)))?.save;
