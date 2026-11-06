import { describe, expect, it } from 'vitest';
import { seatPoints, toward } from './fodinhaLayout';

describe('seatPoints', () => {
  it('puts the viewer at the bottom and goes clockwise on screen', () => {
    const [me, left, top, right] = seatPoints(4, 0, 'landscape');
    expect(me).toEqual({ x: 50, y: 83 });
    expect(left.x).toBeLessThan(20);
    expect(top).toEqual({ x: 50, y: 11 });
    expect(right.x).toBeGreaterThan(80);
  });

  it('rotates the table so any seat can be the bottom one', () => {
    const points = seatPoints(3, 2, 'portrait');
    expect(points[2]).toEqual({ x: 50, y: 87 });
    expect(points[0].x).toBeLessThan(50);
    expect(points[1].x).toBeGreaterThan(50);
  });

  it('keeps every seat of a full table inside the stage', () => {
    seatPoints(6, 0, 'landscape').forEach((p) => {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(100);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(100);
    });
  });
});

describe('toward', () => {
  it('moves part of the way to the target', () => {
    expect(toward({ x: 50, y: 83 }, { x: 50, y: 47 }, 0.5)).toEqual({ x: 50, y: 65 });
  });
});
