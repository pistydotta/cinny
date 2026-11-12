import { describe, expect, it } from 'vitest';
import { datan2, dcos, dhypot, dpow, dsin } from './dmath';

describe('horde deterministic math', () => {
  it('matches the built-in functions to many digits', () => {
    for (let i = -400; i <= 400; i += 1) {
      const x = i * 0.137;
      expect(dsin(x)).toBeCloseTo(Math.sin(x), 12);
      expect(dcos(x)).toBeCloseTo(Math.cos(x), 12);
      const y = i * 0.071 - 3;
      expect(datan2(y, x)).toBeCloseTo(Math.atan2(y, x), 12);
      expect(dhypot(x, y)).toBeCloseTo(Math.hypot(x, y), 12);
    }
    [0, 0.01, 0.5, 1, 2.5, 10, 123.4].forEach((b) => {
      expect(dpow(b, 1.4)).toBeCloseTo(b ** 1.4, 9);
    });
    expect(datan2(0, -1)).toBeCloseTo(Math.PI, 12);
    expect(datan2(0, 0)).toBe(0);
  });
});
