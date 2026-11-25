import { describe, expect, it } from 'vitest';
import { orbitPlaces } from './orbitPlaces';

describe('orbitPlaces', () => {
  it('has no places for an empty call', () => {
    expect(orbitPlaces([])).toEqual({ people: [], more: undefined });
  });

  it('puts one person on top', () => {
    expect(orbitPlaces(['a']).people).toEqual([{ item: 'a', x: 50, y: 0 }]);
  });

  it('spreads people evenly from the top', () => {
    const { people } = orbitPlaces(['a', 'b', 'c', 'd']);
    expect(people.map(({ x, y }) => [x, y])).toEqual([
      [50, 0],
      [100, 50],
      [50, 100],
      [0, 50],
    ]);
  });

  it('shows five people without a count', () => {
    const { people, more } = orbitPlaces(['a', 'b', 'c', 'd', 'e']);
    expect(people).toHaveLength(5);
    expect(more).toBeUndefined();
  });

  it('turns the last place into a count past five', () => {
    const { people, more } = orbitPlaces(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    expect(people.map((p) => p.item)).toEqual(['a', 'b', 'c', 'd']);
    expect(more?.count).toBe(3);
  });
});
