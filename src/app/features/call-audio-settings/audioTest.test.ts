import { describe, expect, it } from 'vitest';
import { levelFromSamples } from './audioTest';

const constant = (value: number) => new Float32Array(256).fill(value);

describe('mic test meter', () => {
  it('reads silence and empty frames as zero', () => {
    expect(levelFromSamples(constant(0))).toBe(0);
    expect(levelFromSamples([])).toBe(0);
  });

  it('stays at zero for room noise below -60 dB', () => {
    expect(levelFromSamples(constant(0.0005))).toBe(0);
  });

  it('rises with loudness and tops out at 1', () => {
    const quiet = levelFromSamples(constant(0.01));
    const speech = levelFromSamples(constant(0.1));
    expect(quiet).toBeGreaterThan(0);
    expect(speech).toBeGreaterThan(quiet);
    expect(levelFromSamples(constant(1))).toBe(1);
  });
});
