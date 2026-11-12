import { describe, expect, it } from 'vitest';
import { groupHits } from './numbers';

describe('horde damage numbers', () => {
  it('adds up the hits on each enemy, biggest first, crit if any hit was', () => {
    const hit = (id: number, amount: number, crit = false) =>
      ({ type: 'hit', id, x: id, z: 0, amount, crit } as const);
    const grouped = groupHits([hit(1, 5), hit(2, 30), hit(1, 7, true), { type: 'levelup' }]);
    expect(grouped).toEqual([
      { id: 2, x: 2, z: 0, amount: 30, crit: false },
      { id: 1, x: 1, z: 0, amount: 12, crit: true },
    ]);
  });
});
