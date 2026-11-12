import { CHARACTER_IDS } from './data';
import { CharacterId } from './types';

// The daily challenge: the same seed and hero for everyone on a UTC day, with no permanent
// upgrades, no locks and no mastery, so every player plays the very same run. Kept equal to
// dailyChallenge in api/src/horde.js, which checks daily reports (a test compares the two).

const fnv = (text: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    // eslint-disable-next-line no-bitwise
    h ^= text.charCodeAt(i);
    // eslint-disable-next-line no-bitwise
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // eslint-disable-next-line no-bitwise
  return h >>> 0;
};

export type DailyChallenge = { day: string; seed: number; character: CharacterId };

export const dailyChallenge = (day: string): DailyChallenge => ({
  day,
  seed: fnv(`brazilianbonk:${day}`),
  character: CHARACTER_IDS[fnv(`hero:${day}`) % CHARACTER_IDS.length],
});

// Today in UTC, as YYYY-MM-DD. The server's answer wins when there is one.
export const utcDay = (time: number): string => new Date(time).toISOString().slice(0, 10);
