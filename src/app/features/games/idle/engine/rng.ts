/* eslint-disable no-bitwise */

// Seeded random numbers (mulberry32). Every roll in the game goes through one, and its state is
// saved with the game, so the same save and the same actions always give the same fights. That
// is what lets a server replay and check a result later (PvP, rankings) instead of trusting it.
export type Rng = {
  next: () => number;
  state: () => number;
};

export const createRng = (seed: number): Rng => {
  let s = seed >>> 0;
  return {
    next: () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    state: () => s,
  };
};

// FNV-1a, to turn a text (a user ID, a day) into a seed.
export const hashSeed = (text: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

export const rollInt = (rng: Rng, min: number, max: number): number =>
  min + Math.floor(rng.next() * (max - min + 1));

export const rollRange = (rng: Rng, min: number, max: number): number =>
  min + rng.next() * (max - min);

export const chance = (rng: Rng, p: number): boolean => rng.next() < p;

export const pick = <T>(rng: Rng, list: readonly T[]): T =>
  list[Math.floor(rng.next() * list.length)];

export const pickWeighted = <T>(rng: Rng, entries: readonly (readonly [T, number])[]): T => {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng.next() * total;
  const found = entries.find(([, w]) => {
    roll -= w;
    return roll < 0;
  });
  return (found ?? entries[entries.length - 1])[0];
};
