import { describe, expect, it } from 'vitest';
import { ART, PALETTE, SIZE, iconPixels } from './pixelArt';

describe('pixel icons', () => {
  it('are 16x16 and use only palette colors', () => {
    Object.entries(ART).forEach(([id, art]) => {
      expect(art.length, id).toBe(SIZE);
      art.forEach((row, r) => {
        expect(row.length, `${id} row ${r}`).toBe(SIZE);
        expect(
          [...row].every((ch) => ch === '.' || ch in PALETTE),
          `${id} row ${r}`
        ).toBe(true);
      });
    });
  });

  it('outline every shape and draw evolved weapons from their weapon', () => {
    const bolt = iconPixels('weapon:bolt') as string[];
    expect(bolt[1][6]).toBe('k');
    const evolved = iconPixels('evolved:bolt') as string[];
    expect(evolved[1][6]).toBe('Y');
    expect(iconPixels('evolved:nothing')).toBeUndefined();
    expect(iconPixels('stat:nothing')).toBeUndefined();
  });
});
