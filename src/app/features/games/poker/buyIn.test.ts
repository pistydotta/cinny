import { describe, expect, it } from 'vitest';
import { defaultBuyIn } from './buyIn';

describe('defaultBuyIn', () => {
  it('defaults to half the balance, stepped from the minimum', () => {
    expect(defaultBuyIn(5000, 400, 2000, 100)).toBe(2000);
    expect(defaultBuyIn(5000, 1000, 5000, 250)).toBe(2500);
    expect(defaultBuyIn(5000, 2000, 10000, 500)).toBe(2500);
    expect(defaultBuyIn(1000, 400, 2000, 100)).toBe(500);
    expect(defaultBuyIn(25, 400, 2000, 100)).toBe(400);
  });

  it('rounds down to a step above the minimum', () => {
    expect(defaultBuyIn(1370, 400, 2000, 100)).toBe(600);
  });

  it('never passes the maximum', () => {
    expect(defaultBuyIn(100000, 400, 2050, 100)).toBe(2000);
  });
});
