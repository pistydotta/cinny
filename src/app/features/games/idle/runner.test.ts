import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SaveEnvelope } from './cloudSync';
import { advance, newGame } from './engine/progress';
import { deserialize, serialize } from './engine/save';
import { CloudSave, getIdleRunner } from './runner';

// The runner touches the browser: give it a fake one.
const store = new Map<string, string>();
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000_000);
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  });
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('document', {
    visibilityState: 'visible',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

type FakeCloud = CloudSave & {
  stored?: SaveEnvelope;
  writes: SaveEnvelope[];
  fail: boolean;
  push: (e: SaveEnvelope) => void;
};

const fakeCloud = (stored?: SaveEnvelope): FakeCloud => {
  const watchers = new Set<(c: unknown) => void>();
  const cloud: FakeCloud = {
    stored,
    writes: [],
    fail: false,
    load: () =>
      cloud.fail ? Promise.reject(new Error('offline')) : Promise.resolve(cloud.stored ?? null),
    save: (e) => {
      cloud.writes.push(e);
      cloud.stored = e;
      watchers.forEach((w) => w(e));
      return Promise.resolve();
    },
    watch: (fn) => {
      watchers.add(fn);
      return () => watchers.delete(fn);
    },
    push: (e) => {
      cloud.stored = e;
      watchers.forEach((w) => w(e));
    },
  };
  return cloud;
};

const hero = (name: string, playMs: number, at: number) => {
  const s = newGame(name, 'mage', 7, at);
  advance(s, playMs);
  s.lastSeen = at;
  return serialize(s);
};

let n = 0;
const user = () => {
  n += 1;
  return `@u${n}:x`;
};

const settle = async () => {
  await vi.advanceTimersByTimeAsync(0);
};

describe('runner and the account save', () => {
  it('finds the hero on a new device', async () => {
    const cloud = fakeCloud({
      save: hero('Home', 60000, Date.now() - 1000),
      gameId: 'g',
      savedAt: Date.now() - 1000,
      writer: 'pc',
    });
    const runner = getIdleRunner(user(), cloud);
    expect(runner.getView().cloud).toBe('loading');
    expect(runner.getView().state).toBeUndefined();
    await settle();
    expect(runner.getView().cloud).toBe('ready');
    expect(runner.getView().state?.hero.name).toBe('Home');
  });

  it('sends this browser’s newer progress to the account', async () => {
    const id = user();
    const local: SaveEnvelope = {
      save: hero('Mine', 30000, Date.now()),
      gameId: 'g',
      savedAt: Date.now(),
      writer: 'old',
    };
    store.set(`blazeroom.idle.v1:${id}`, JSON.stringify(local));
    const cloud = fakeCloud({ ...local, savedAt: Date.now() - 60000, writer: 'pc' });
    getIdleRunner(id, cloud);
    await settle();
    await vi.advanceTimersByTimeAsync(1000);
    expect(cloud.writes.length).toBeGreaterThan(0);
    expect(cloud.stored?.gameId).toBe('g');
  });

  it('moves a save from before the account save up to the account', async () => {
    const id = user();
    store.set(`blazeroom.idle.v1:${id}`, hero('Legacy', 30000, Date.now() - 5000));
    const cloud = fakeCloud();
    getIdleRunner(id, cloud);
    await settle();
    await vi.advanceTimersByTimeAsync(1000);
    expect(deserialize(cloud.stored?.save)?.hero.name).toBe('Legacy');
  });

  it('keeps the veteran when another device made a new hero', async () => {
    const id = user();
    store.set(
      `blazeroom.idle.v1:${id}`,
      JSON.stringify({
        save: hero('Rookie', 1000, Date.now()),
        gameId: 'work',
        savedAt: Date.now(),
        writer: 'w',
      })
    );
    const cloud = fakeCloud({
      save: hero('Veteran', 120000, Date.now() - 1e6),
      gameId: 'home',
      savedAt: Date.now() - 1e6,
      writer: 'pc',
    });
    const runner = getIdleRunner(id, cloud);
    await settle();
    expect(runner.getView().state?.hero.name).toBe('Veteran');
  });

  it('follows the same hero played on another device', async () => {
    const cloud = fakeCloud({
      save: hero('Shared', 10000, Date.now()),
      gameId: 'g',
      savedAt: Date.now(),
      writer: 'pc',
    });
    const runner = getIdleRunner(user(), cloud);
    await settle();
    const moved = deserialize(cloud.stored?.save);
    if (!moved) throw new Error('no save');
    moved.gold = 12345;
    moved.lastSeen = Date.now() + 1;
    cloud.push({ save: serialize(moved), gameId: 'g', savedAt: Date.now() + 1, writer: 'phone' });
    expect(runner.getView().state?.gold).toBeGreaterThanOrEqual(12345);
  });

  it('never writes before it could read the account', async () => {
    const id = user();
    store.set(
      `blazeroom.idle.v1:${id}`,
      JSON.stringify({
        save: hero('Local', 1000, Date.now()),
        gameId: 'g',
        savedAt: Date.now(),
        writer: 'w',
      })
    );
    const cloud = fakeCloud();
    cloud.fail = true;
    const runner = getIdleRunner(id, cloud);
    await settle();
    expect(runner.getView().cloud).toBe('error');
    await vi.advanceTimersByTimeAsync(20000);
    expect(cloud.writes).toHaveLength(0);
    cloud.fail = false;
    runner.retryCloud();
    await settle();
    await vi.advanceTimersByTimeAsync(1000);
    expect(runner.getView().cloud).toBe('ready');
    expect(cloud.writes.length).toBeGreaterThan(0);
  });

  it('saves a new hero and a deletion to the account', async () => {
    const cloud = fakeCloud();
    const runner = getIdleRunner(user(), cloud);
    await settle();
    runner.start('Fresh', 'monk');
    await vi.advanceTimersByTimeAsync(4000);
    expect(deserialize(cloud.stored?.save)?.hero.name).toBe('Fresh');
    const { gameId } = cloud.stored as SaveEnvelope;
    runner.abandon();
    await settle();
    expect(cloud.stored).toMatchObject({ save: null, gameId });
  });
});
