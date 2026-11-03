import { describe, expect, it } from 'vitest';
import { DEFAULT_VOLUME, readSavedVolume, saveVolume, shouldAutoWatch } from './watchRules';

const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
};

const throwing = () => {
  throw new Error('blocked');
};

describe('shouldAutoWatch', () => {
  it('waits with no members yet', () => {
    expect(shouldAutoWatch([])).toBeUndefined();
  });

  it('opens with exactly two people', () => {
    expect(shouldAutoWatch(['@a', '@b'])).toBe(true);
  });

  it('counts a person on two devices once', () => {
    expect(shouldAutoWatch(['@a', '@a', '@b'])).toBe(true);
  });

  it('waits with one person', () => {
    expect(shouldAutoWatch(['@a'])).toBeUndefined();
  });

  it('waits for one person on two devices', () => {
    expect(shouldAutoWatch(['@a', '@a'])).toBeUndefined();
  });

  it("doesn't open with three", () => {
    expect(shouldAutoWatch(['@a', '@b', '@c'])).toBe(false);
  });
});

describe('saved volume', () => {
  it('starts at 50%', () => {
    expect(readSavedVolume(memoryStorage())).toBe(DEFAULT_VOLUME);
    expect(DEFAULT_VOLUME).toBe(0.5);
  });

  it('reads back a saved volume', () => {
    const storage = memoryStorage();
    saveVolume(storage, 0.3);
    expect(readSavedVolume(storage)).toBe(0.3);
  });

  it('ignores a broken value', () => {
    const storage = memoryStorage();
    storage.data.set('blazeroom.screenShareVolume', 'abc');
    expect(readSavedVolume(storage)).toBe(0.5);
    storage.data.set('blazeroom.screenShareVolume', '7');
    expect(readSavedVolume(storage)).toBe(0.5);
  });

  it("doesn't save 0", () => {
    const storage = memoryStorage();
    saveVolume(storage, 0);
    expect(storage.data.size).toBe(0);
  });

  it('survives storage that throws', () => {
    expect(readSavedVolume({ getItem: throwing })).toBe(0.5);
    expect(() => saveVolume({ setItem: throwing }, 0.3)).not.toThrow();
  });
});
