/* eslint-disable no-bitwise */
import { Input, MatchState } from './types';

// What travels between the players, the API and the people watching: inputs packed into three
// small numbers, and a hash of a match to tell that two copies are still the same.

export type PackedInput = [number, number, number];

export const packInput = (input: Input): PackedInput => [
  input.mx,
  input.mz,
  (input.sprint ? 1 : 0) |
    (input.pass ? 2 : 0) |
    (input.shoot ? 4 : 0) |
    (input.through ? 8 : 0) |
    (input.lob ? 16 : 0),
];

export const unpackInput = ([mx, mz, bits]: PackedInput): Input => ({
  mx,
  mz,
  sprint: (bits & 1) !== 0,
  pass: (bits & 2) !== 0,
  shoot: (bits & 4) !== 0,
  through: (bits & 8) !== 0,
  lob: (bits & 16) !== 0,
});

// Whether a value from the network is a packed input the engine can take.
export const isPackedInput = (value: unknown): value is PackedInput =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((n) => Number.isInteger(n)) &&
  Math.abs(value[0]) <= 100 &&
  Math.abs(value[1]) <= 100 &&
  value[2] >= 0 &&
  value[2] < 32;

export const sameInput = (a: Input, b: Input): boolean =>
  a.mx === b.mx &&
  a.mz === b.mz &&
  a.sprint === b.sprint &&
  a.pass === b.pass &&
  a.shoot === b.shoot &&
  a.through === b.through &&
  a.lob === b.lob;

// FNV-1a over the match written as JSON (numbers in JSON are exact and written the same way by
// every engine). The tick's events are left out: they are what happened, not what is.
export const hashMatch = (m: MatchState): number => {
  const text = JSON.stringify({ ...m, events: [] });
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};
