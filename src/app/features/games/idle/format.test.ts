import { describe, expect, it } from 'vitest';
import { formatBig, formatDuration, formatMod } from './format';

describe('format', () => {
  it('shortens big numbers', () => {
    expect(formatBig(950)).toBe('950');
    expect(formatBig(12345)).toBe('12,3K');
    expect(formatBig(2_500_000)).toBe('2,5M');
    expect(formatBig(456_000_000)).toBe('456M');
  });

  it('writes bonuses as flat or percent', () => {
    expect(formatMod('damage', 12)).toBe('+12');
    expect(formatMod('regen', 0.6)).toBe('+0,6');
    expect(formatMod('critChance', 0.045)).toBe('+4,5%');
    expect(formatMod('damagePct', -0.1)).toBe('−10%');
  });

  it('writes time away', () => {
    expect(formatDuration(30000)).toBe('30s');
    expect(formatDuration(5 * 60000)).toBe('5min');
    expect(formatDuration(125 * 60000)).toBe('2h 05min');
  });
});
