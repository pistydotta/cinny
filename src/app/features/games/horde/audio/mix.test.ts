import { describe, expect, it } from 'vitest';
import { CALL_VOLUME, STREAK_GAP, VoiceLimiter, createGemStreak, effectiveVolume } from './mix';

describe('horde sound mix', () => {
  it('is silent when muted and quiet in a call', () => {
    expect(effectiveVolume(0.8, true, false)).toBe(0);
    expect(effectiveVolume(0.8, false, true)).toBeCloseTo(0.8 * CALL_VOLUME);
    expect(effectiveVolume(3, false, false)).toBe(1);
  });

  it('lets only a few copies of a sound start at once', () => {
    const limiter = new VoiceLimiter();
    const started = [0, 0.01, 0.02, 0.03, 0.04].filter((t) => limiter.allow('hit', t, 3, 0.1));
    expect(started).toHaveLength(3);
    expect(limiter.allow('kill', 0.04, 3, 0.1)).toBe(true);
    expect(limiter.allow('hit', 0.2, 3, 0.1)).toBe(true);
  });

  it('climbs in pitch for gems in a row, up to an octave, and starts over after a pause', () => {
    const streak = createGemStreak();
    const rates = Array.from({ length: 20 }, (_, i) => streak(i * 0.1));
    expect(rates[0]).toBe(1);
    expect(rates[1]).toBeGreaterThan(rates[0]);
    expect(rates[19]).toBeCloseTo(2);
    expect(streak(1.9 + STREAK_GAP + 0.01)).toBe(1);
  });
});
