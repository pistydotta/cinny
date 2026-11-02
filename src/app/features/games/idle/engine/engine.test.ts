import { describe, expect, it } from 'vitest';
import { addItem, canPlace, charmLinks, charmMods, findSpot, resize, rotateItem } from './backpack';
import { CLASSES, getClass } from './classes';
import { makeFighter, mitigate, outcomeOf, stepBattle } from './combat';
import { generateItem, levelScale } from './items';
import { createRng, hashSeed, pickWeighted } from './rng';
import { computeStats, powerOf } from './stats';
import { Backpack, Battle, Item } from './types';

const item = (id: string, w: number, h: number, extra: Partial<Item> = {}): Item => ({
  id,
  baseId: 'ring',
  kind: 'ring',
  rarity: 'common',
  level: 1,
  icon: '',
  w,
  h,
  mods: {},
  value: 1,
  ...extra,
});

const charm = (id: string, element: Item['element'], damage: number): Item =>
  item(id, 1, 1, { kind: 'charm', baseId: 'ember_rune', element, mods: { damage } });

describe('rng', () => {
  it('repeats for the same seed and differs for another', () => {
    const a = createRng(7);
    const b = createRng(7);
    const c = createRng(8);
    const seqA = [a.next(), a.next(), a.next()];
    expect([b.next(), b.next(), b.next()]).toEqual(seqA);
    expect(c.next()).not.toBe(seqA[0]);
  });

  it('resumes from a saved state', () => {
    const a = createRng(99);
    a.next();
    const resumed = createRng(a.state());
    expect(resumed.next()).toBe(a.next());
  });

  it('hashes text to a stable seed', () => {
    expect(hashSeed('@a:b')).toBe(hashSeed('@a:b'));
    expect(hashSeed('@a:b')).not.toBe(hashSeed('@a:c'));
  });

  it('only picks entries with weight', () => {
    const rng = createRng(1);
    for (let i = 0; i < 100; i += 1) {
      expect(
        pickWeighted(rng, [
          ['a', 0],
          ['b', 1],
        ])
      ).toBe('b');
    }
  });
});

describe('backpack', () => {
  const empty: Backpack = { cols: 4, rows: 3, items: [] };

  it('keeps items inside and apart', () => {
    const bp = addItem(empty, item('a', 2, 2)) as Backpack;
    expect(bp.items[0]).toMatchObject({ x: 0, y: 0 });
    expect(canPlace(bp, item('b', 1, 1), 1, 1, false)).toBe(false);
    expect(canPlace(bp, item('b', 1, 1), 2, 0, false)).toBe(true);
    expect(canPlace(bp, item('b', 1, 1), 4, 0, false)).toBe(false);
  });

  it('turns an item to make it fit', () => {
    const tall: Backpack = { cols: 3, rows: 1, items: [] };
    expect(findSpot(tall, item('a', 1, 3))).toEqual({ x: 0, y: 0, rotated: true });
  });

  it('says when the bag is full', () => {
    const tiny: Backpack = { cols: 1, rows: 1, items: [] };
    const full = addItem(tiny, item('a', 1, 1)) as Backpack;
    expect(addItem(full, item('b', 1, 1))).toBeUndefined();
  });

  it('rotates in place or nudges', () => {
    const bp = addItem({ cols: 3, rows: 3, items: [] }, item('a', 1, 3)) as Backpack;
    const turned = rotateItem(bp, 'a') as Backpack;
    expect(turned.items[0]).toMatchObject({ rotated: true, x: 0, y: 0 });
  });

  it('grows charms next to charms of their element', () => {
    let bp: Backpack = {
      cols: 4,
      rows: 1,
      items: [
        { item: charm('f1', 'fire', 10), x: 0, y: 0, rotated: false },
        { item: charm('f2', 'fire', 10), x: 1, y: 0, rotated: false },
        { item: charm('i1', 'frost', 10), x: 3, y: 0, rotated: false },
      ],
    };
    expect(charmLinks(bp).get('f1')).toBe(1);
    expect(charmLinks(bp).get('i1')).toBe(0);
    expect(charmMods(bp).damage).toBeCloseTo(10 * 1.25 * 2 + 10);
    // Diagonal doesn't count.
    bp = { ...bp, rows: 2, items: [bp.items[0], { ...bp.items[1], x: 1, y: 1 }] };
    expect(charmLinks(bp).get('f1')).toBe(0);
  });

  it('keeps items when it grows', () => {
    const bp = addItem(empty, item('a', 2, 2)) as Backpack;
    const { bp: bigger, left } = resize(bp, 4, 4);
    expect(left).toEqual([]);
    expect(bigger.items[0]).toMatchObject({ x: 0, y: 0 });
  });
});

describe('stats', () => {
  it('gets stronger with level and gear', () => {
    const cls = getClass('guardian');
    const zero = { str: 0, agi: 0, int: 0, vit: 0 };
    const lv1 = computeStats({ cls, level: 1, allocated: zero, mods: [] });
    const lv10 = computeStats({ cls, level: 10, allocated: zero, mods: [] });
    const geared = computeStats({ cls, level: 10, allocated: zero, mods: [{ damage: 50 }] });
    expect(lv10.maxHp).toBeGreaterThan(lv1.maxHp);
    expect(geared.damage).toBeGreaterThan(lv10.damage);
    expect(powerOf(geared)).toBeGreaterThan(powerOf(lv10));
  });

  it('caps chances', () => {
    const cls = getClass('assassin');
    const zero = { str: 0, agi: 0, int: 0, vit: 0 };
    const s = computeStats({ cls, level: 1, allocated: zero, mods: [{ critChance: 5, dodge: 5 }] });
    expect(s.critChance).toBe(0.75);
    expect(s.dodge).toBe(0.6);
  });

  it('gives every class a skill and a weapon', () => {
    CLASSES.forEach((c) => {
      expect(c.skill.effects.length).toBeGreaterThan(0);
      expect(c.weapons.length).toBeGreaterThan(0);
    });
  });
});

describe('items', () => {
  it('rolls more affixes on rarer items and scales with level', () => {
    const cls = getClass('mage');
    const common = generateItem(createRng(1), cls, 'a', {
      level: 10,
      rarity: 'common',
      kind: 'ring',
    });
    const legendary = generateItem(createRng(1), cls, 'b', {
      level: 10,
      rarity: 'legendary',
      kind: 'ring',
    });
    expect(Object.keys(legendary.mods).length).toBeGreaterThan(Object.keys(common.mods).length);
    expect(legendary.value).toBeGreaterThan(common.value);
    expect(levelScale(50)).toBeGreaterThan(levelScale(10));
  });

  it('gives weapons the class uses', () => {
    const cls = getClass('ranger');
    const w = generateItem(createRng(3), cls, 'w', { level: 1, kind: 'weapon' });
    expect(w.baseId).toBe('bow');
  });
});

describe('combat', () => {
  const zero = { str: 0, agi: 0, int: 0, vit: 0 };
  const fight = (seed: number): Battle => {
    const a = getClass('berserker');
    const b = getClass('mage');
    const battle: Battle = {
      hero: makeFighter(
        'a',
        '',
        5,
        computeStats({ cls: a, level: 5, allocated: zero, mods: [] }),
        a.skill
      ),
      foe: makeFighter(
        'b',
        '',
        5,
        computeStats({ cls: b, level: 5, allocated: zero, mods: [] }),
        b.skill
      ),
      elapsedMs: 0,
      boss: false,
      timeLimitMs: 60000,
    };
    const rng = createRng(seed);
    while (!outcomeOf(battle)) stepBattle(battle, rng);
    return battle;
  };

  it('ends, and the same seed gives the same fight', () => {
    const one = fight(5);
    const two = fight(5);
    expect(outcomeOf(one)).not.toBeNull();
    expect(one.elapsedMs).toBe(two.elapsedMs);
    expect(one.hero.hp).toBe(two.hero.hp);
  });

  it('lets armor reduce but never block damage', () => {
    expect(mitigate(100, 0, 1)).toBe(100);
    expect(mitigate(100, 1e9, 1)).toBeGreaterThanOrEqual(0);
    expect(mitigate(100, 100, 1)).toBeLessThan(100);
  });
});
