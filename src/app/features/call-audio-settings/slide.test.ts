import { describe, expect, it } from 'vitest';
import { TICKER_GAP, tickerTiming } from './slide';

describe('tickerTiming', () => {
  it('leaves a name that fits alone', () => {
    expect(tickerTiming(150, 190)).toBeUndefined();
    expect(tickerTiming(191, 190)).toBeUndefined();
  });

  it('moves one lap: the name and the gap after it', () => {
    expect(tickerTiming(300, 190)?.shift).toBe(300 + TICKER_GAP);
  });

  it('keeps one speed, so a longer name takes longer', () => {
    const short = tickerTiming(220, 190);
    const long = tickerTiming(440, 190);
    expect((long?.duration ?? 0) / (long?.shift ?? 1)).toBeCloseTo(
      (short?.duration ?? 0) / (short?.shift ?? 1),
      2
    );
  });
});
