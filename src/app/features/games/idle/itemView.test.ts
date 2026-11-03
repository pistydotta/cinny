import { describe, expect, it } from 'vitest';
import { newGame } from './engine/progress';
import { Item } from './engine/types';
import { compareMods, heroDelta, inCategory, sortRows, withDeltas } from './itemView';

const item = (id: string, extra: Partial<Item> = {}): Item => ({
  id,
  baseId: 'sword',
  kind: 'weapon',
  rarity: 'common',
  level: 1,
  icon: '',
  mods: { damage: 4 },
  plus: 0,
  fails: 0,
  value: 1,
  ...extra,
});

describe('itemView', () => {
  it('shows each change as a number, not just up or down', () => {
    const rows = compareMods(
      item('a', { mods: { damage: 10, critChance: 0.02 } }),
      item('b', { mods: { damage: 27 } })
    );
    expect(rows.find((r) => r.key === 'damage')).toEqual({ key: 'damage', value: 10, diff: -17 });
    expect(rows.find((r) => r.key === 'critChance')?.diff).toBeCloseTo(0.02);
  });

  it('counts the forge in the comparison', () => {
    const rows = compareMods(
      item('a', { mods: { damage: 10 }, plus: 10 }),
      item('b', { mods: { damage: 10 } })
    );
    expect(rows[0].diff).toBeCloseTo(9);
  });

  it('finds upgrades and sorts them first', () => {
    const s = newGame('H', 'warrior', 1, 0);
    s.inventory = [
      item('i8', { mods: { damage: 1 } }),
      item('i9', { mods: { damage: 50 } }),
      item('i7', { kind: 'ring', baseId: 'ring' }),
    ];
    const rows = withDeltas(s);
    expect(
      rows
        .filter((r) => inCategory(r, 'upgrades'))
        .map((r) => r.item.id)
        .sort()
    ).toEqual(['i7', 'i9']);
    expect(sortRows(rows, 'power')[0].item.id).toBe('i9');
    expect(sortRows(rows, 'recent')[0].item.id).toBe('i9');
    expect(rows.filter((r) => inCategory(r, 'jewelry')).map((r) => r.item.id)).toEqual(['i7']);
    expect(heroDelta(s, s.inventory[1]).power).toBeGreaterThan(0);
    expect(heroDelta(s, s.inventory[0]).stats.find((d) => d.key === 'damage')?.diff).toBeLessThan(
      0
    );
  });
});
