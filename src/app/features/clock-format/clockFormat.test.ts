import { describe, expect, it } from 'vitest';
import { messageDateFormat, withoutYear } from './messageDate';
import { migratePortugueseClock } from './portugueseClock';

const memoryStorage = (initial: Record<string, string> = {}): Storage => {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
};

describe('migratePortugueseClock', () => {
  it('turns on the 24-hour clock once for Portuguese, keeping other settings', () => {
    const storage = memoryStorage({ settings: '{"hour24Clock":false,"pageZoom":110}' });
    migratePortugueseClock('pt', storage);
    expect(JSON.parse(storage.getItem('settings') ?? '')).toEqual({
      hour24Clock: true,
      pageZoom: 110,
    });

    storage.setItem('settings', '{"hour24Clock":false}');
    migratePortugueseClock('pt', storage);
    expect(JSON.parse(storage.getItem('settings') ?? '')).toEqual({ hour24Clock: false });
  });

  it('works before any setting was saved', () => {
    const storage = memoryStorage();
    migratePortugueseClock('pt', storage);
    expect(JSON.parse(storage.getItem('settings') ?? '')).toEqual({ hour24Clock: true });
  });

  it('leaves English alone', () => {
    const storage = memoryStorage({ settings: '{"hour24Clock":false}' });
    migratePortugueseClock('en', storage);
    expect(storage.getItem('settings')).toBe('{"hour24Clock":false}');
    expect(storage.getItem('blazeroom_clock24_default')).toBeNull();
  });
});

describe('messageDateFormat', () => {
  it('drops the year at either end', () => {
    expect(withoutYear('D MMM YYYY')).toBe('D MMM');
    expect(withoutYear('DD/MM/YYYY')).toBe('DD/MM');
    expect(withoutYear('MM/DD/YYYY')).toBe('MM/DD');
    expect(withoutYear('YYYY/MM/DD')).toBe('MM/DD');
    expect(withoutYear('YYYY-MM-DD')).toBe('MM-DD');
    expect(withoutYear('DD [de] MMMM')).toBe('DD [de] MMMM');
    expect(withoutYear('YYYY')).toBe('YYYY');
  });

  it('only for dates in the current year', () => {
    const now = new Date(2026, 10, 21).getTime();
    expect(messageDateFormat(new Date(2026, 0, 3).getTime(), 'D MMM YYYY', now)).toBe('D MMM');
    expect(messageDateFormat(new Date(2025, 11, 30).getTime(), 'D MMM YYYY', now)).toBe(
      'D MMM YYYY'
    );
  });
});
