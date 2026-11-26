import { describe, expect, it } from 'vitest';
import { LEVEL_BARS, litBars } from './deviceLevels';

describe('litBars', () => {
  it('lights none in silence and all when loud', () => {
    expect(litBars(0)).toBe(0);
    expect(litBars(1)).toBe(LEVEL_BARS);
  });

  it('rounds to the nearest bar', () => {
    expect(litBars(0.5)).toBe(3);
    expect(litBars(0.1)).toBe(1);
  });

  it('stays within the bars', () => {
    expect(litBars(-0.2)).toBe(0);
    expect(litBars(1.4)).toBe(LEVEL_BARS);
  });
});
