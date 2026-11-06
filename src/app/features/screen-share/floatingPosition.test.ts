import { describe, expect, it } from 'vitest';
import { clampPos, parsePos } from './floatingPosition';

const view = { width: 1000, height: 800 };
const box = { width: 200, height: 180 };

describe('clampPos', () => {
  it('keeps a position that fits', () => {
    expect(clampPos({ x: 300, y: 200 }, box, view)).toEqual({ x: 300, y: 200 });
  });

  it('pulls a box dragged off any edge back into the window', () => {
    expect(clampPos({ x: -50, y: -10 }, box, view)).toEqual({ x: 8, y: 8 });
    expect(clampPos({ x: 950, y: 790 }, box, view)).toEqual({ x: 792, y: 612 });
  });

  it('pins to the top left when the window is smaller than the box', () => {
    expect(clampPos({ x: 100, y: 100 }, box, { width: 150, height: 100 })).toEqual({ x: 8, y: 8 });
  });
});

describe('parsePos', () => {
  it('reads a saved position and ignores anything else', () => {
    expect(parsePos('{"x":10,"y":20}')).toEqual({ x: 10, y: 20 });
    expect(parsePos(null)).toBeUndefined();
    expect(parsePos('nope')).toBeUndefined();
    expect(parsePos('{"x":"a","y":1}')).toBeUndefined();
  });
});
