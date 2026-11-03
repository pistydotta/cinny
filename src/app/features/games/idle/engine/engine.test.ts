import { describe, expect, it } from 'vitest';
import { CLASSES, getClass, skillsOf } from './classes';
import { makeFighter, mitigate, outcomeOf, stepBattle } from './combat';
import { applyForge, forgeChance, forgeCost, maxPlusOf, salvageValue } from './forge';
import { generateItem, itemMods, levelScale, PLUS_BONUS } from './items';
import { altarCost, ALTAR, ashesFor, rebirthStage, startStage } from './prestige';
import { createRng, hashSeed, pickWeighted } from './rng';
import { computeStats, powerOf } from './stats';
import { ROW_NEEDS, TALENTS, rowOpen, talentMods } from './talents';
import { Battle, Item, Stats } from './types';

const ring = (extra: Partial<Item> = {}): Item => ({
  id: 'r',
  baseId: 'ring',
  kind: 'ring',
  rarity: 'rare',
  level: 10,
  icon: '',
  mods: { damage: 10 },
  plus: 0,
  fails: 0,
  value: 1,
  ...extra,
});

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

describe('classes', () => {
  it('has six classes with two specs each, all different', () => {
    expect(CLASSES).toHaveLength(6);
    const specIds = CLASSES.flatMap((c) => c.specs.map((s) => s.id));
    expect(new Set(specIds).size).toBe(12);
    const skillIds = [
      ...CLASSES.map((c) => c.skill.id),
      ...CLASSES.flatMap((c) => c.specs.map((s) => s.skill.id)),
    ];
    expect(new Set(skillIds).size).toBe(18);
  });

  it('adds the spec skill once picked', () => {
    const cls = getClass('archer');
    expect(skillsOf(cls)).toHaveLength(1);
    expect(skillsOf(cls, 'sniper').map((s) => s.id)).toEqual(['volley', 'deadeye']);
  });
});

describe('stats', () => {
  it('gets stronger with level and gear', () => {
    const cls = getClass('warrior');
    const lv1 = computeStats({ cls, level: 1, mods: [] });
    const lv10 = computeStats({ cls, level: 10, mods: [] });
    const geared = computeStats({ cls, level: 10, mods: [{ damage: 50 }] });
    expect(lv10.maxHp).toBeGreaterThan(lv1.maxHp);
    expect(geared.damage).toBeGreaterThan(lv10.damage);
    expect(powerOf(geared)).toBeGreaterThan(powerOf(lv10));
  });

  it('caps chances', () => {
    const cls = getClass('rogue');
    const s = computeStats({ cls, level: 1, mods: [{ critChance: 5, dodge: 5 }] });
    expect(s.critChance).toBe(0.75);
    expect(s.dodge).toBe(0.6);
  });

  it('applies the altar apart from other bonuses', () => {
    const cls = getClass('mage');
    const plain = computeStats({ cls, level: 5, mods: [] });
    const more = computeStats({ cls, level: 5, mods: [], more: { damage: 2, maxHp: 1.5 } });
    expect(more.damage).toBeCloseTo(plain.damage * 2);
    expect(more.maxHp).toBe(Math.round(plain.maxHp * 1.5));
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
    expect(legendary.title).toBeDefined();
    expect(legendary.value).toBeGreaterThan(common.value);
    expect(levelScale(50)).toBeGreaterThan(levelScale(10));
  });

  it('gives weapons the class uses', () => {
    const w = generateItem(createRng(3), getClass('archer'), 'w', { level: 1, kind: 'weapon' });
    expect(w.baseId).toBe('bow');
  });

  it('grows with the forge', () => {
    expect(itemMods(ring({ plus: 0 })).damage).toBe(10);
    expect(itemMods(ring({ plus: 10 })).damage).toBeCloseTo(10 * (1 + PLUS_BONUS[10]));
    expect(itemMods(ring({ plus: 12 })).damage).toBeCloseTo(25);
  });
});

describe('forge', () => {
  it('is safe and cheap at first, then costs more', () => {
    expect(forgeChance(ring({ plus: 0 }), 0)).toBe(1);
    expect(forgeChance(ring({ plus: 2 }), 0)).toBeLessThan(1);
    expect(forgeCost(ring({ plus: 5 })).stones).toBeGreaterThan(
      forgeCost(ring({ plus: 1 })).stones
    );
    expect(forgeCost(ring({ plus: 6 })).cores).toBe(0);
    expect(forgeCost(ring({ plus: 7 })).cores).toBeGreaterThan(0);
  });

  it('drops one level on a failure up to +10, and gets likelier', () => {
    const item = ring({ plus: 7 });
    const r = applyForge(item, 0.999, 0);
    expect(r.outcome).toBe('downgrade');
    expect(r.item?.plus).toBe(6);
    expect(r.item?.fails).toBe(1);
    expect(forgeChance({ ...item, fails: 3 }, 0)).toBeGreaterThan(forgeChance(item, 0));
    const win = applyForge({ ...item, fails: 3 }, 0, 0);
    expect(win.item).toMatchObject({ plus: 8, fails: 0 });
  });

  it('breaks the item when +11 or +12 fails, and the odds stay tiny', () => {
    const epic = ring({ rarity: 'epic', plus: 10, fails: 20 });
    expect(forgeChance(epic, 0.5)).toBeLessThan(0.05);
    expect(applyForge(epic, 0.5, 0)).toEqual({ outcome: 'broken' });
    expect(forgeChance(ring({ rarity: 'epic', plus: 11 }), 0)).toBeLessThan(0.02);
  });

  it('limits how far each rarity goes', () => {
    expect(maxPlusOf(ring({ rarity: 'common' }))).toBe(5);
    expect(maxPlusOf(ring({ rarity: 'rare' }))).toBe(10);
    expect(maxPlusOf(ring({ rarity: 'legendary' }))).toBe(12);
  });

  it('salvages rarer and forged items for more', () => {
    expect(salvageValue(ring({ rarity: 'epic' }), 0).stones).toBeGreaterThan(
      salvageValue(ring({ rarity: 'common' }), 0).stones
    );
    expect(salvageValue(ring({ plus: 5 }), 0).stones).toBeGreaterThan(
      salvageValue(ring(), 0).stones
    );
    expect(salvageValue(ring({ rarity: 'legendary' }), 0).cores).toBeGreaterThan(0);
  });
});

describe('talents', () => {
  it('opens rows as points go in the branch', () => {
    const deep = TALENTS.find((t) => t.branch === 'fury' && t.row === 1);
    if (!deep) throw new Error('no row 1');
    expect(rowOpen({}, deep)).toBe(false);
    expect(rowOpen({ sharpness: ROW_NEEDS[1] }, deep)).toBe(true);
    expect(rowOpen({ toughness: ROW_NEEDS[1] }, deep)).toBe(false);
  });

  it('adds ranks up', () => {
    expect(talentMods({ sharpness: 4 })[0].damagePct).toBeCloseTo(0.12);
  });

  it('takes far more points than one run gives', () => {
    const total = TALENTS.reduce((sum, t) => sum + t.maxRank, 0);
    expect(total).toBeGreaterThan(400);
  });
});

describe('prestige', () => {
  it('asks for deeper stages each time and pays more for deeper runs', () => {
    expect(rebirthStage(1)).toBeGreaterThan(rebirthStage(0));
    expect(ashesFor(30)).toBe(0);
    expect(ashesFor(100)).toBeGreaterThan(ashesFor(60));
    expect(ashesFor(60)).toBeGreaterThan(0);
  });

  it('starts runs ahead, never past the best stage', () => {
    const p = { rebirths: 1, ashes: 0, ashesEarned: 0, altar: { head_start: 3 } };
    expect(startStage(p, 200)).toBe(31);
    expect(startStage(p, 12)).toBe(12);
  });

  it('costs more each level', () => {
    const might = ALTAR[0];
    expect(altarCost(might, 5)).toBeGreaterThan(altarCost(might, 1));
  });
});

describe('combat', () => {
  const stats = (extra: Partial<Stats> = {}): Stats => ({
    ...computeStats({ cls: getClass('warrior'), level: 5, mods: [] }),
    ...extra,
  });
  const battle = (hero: Stats, foe: Stats): Battle => ({
    hero: makeFighter('a', '', 5, hero, skillsOf(getClass('warrior'))),
    foe: makeFighter('b', '', 5, foe),
    elapsedMs: 0,
    boss: false,
    timeLimitMs: 60000,
  });

  it('ends, and the same seed gives the same fight', () => {
    const run = (seed: number) => {
      const a = getClass('warrior');
      const b = getClass('mage');
      const fight: Battle = {
        hero: makeFighter(
          'a',
          '',
          30,
          computeStats({ cls: a, level: 30, mods: [] }),
          skillsOf(a, 'berserker')
        ),
        foe: makeFighter(
          'b',
          '',
          30,
          computeStats({ cls: b, level: 30, mods: [] }),
          skillsOf(b, 'cryomancer')
        ),
        elapsedMs: 0,
        boss: false,
        timeLimitMs: 60000,
      };
      const rng = createRng(seed);
      while (!outcomeOf(fight)) stepBattle(fight, rng);
      return fight;
    };
    const one = run(5);
    const two = run(5);
    expect(outcomeOf(one)).not.toBeNull();
    expect(one.elapsedMs).toBe(two.elapsedMs);
    expect(one.hero.hp).toBe(two.hero.hp);
  });

  it('lets armor reduce but never block damage', () => {
    expect(mitigate(100, 0, 1)).toBe(100);
    expect(mitigate(100, 1e9, 1)).toBeGreaterThanOrEqual(0);
    expect(mitigate(100, 100, 1)).toBeLessThan(100);
  });

  it('hurts attackers with thorns', () => {
    const b = battle(stats({ thorns: 0.5, regen: 0 }), stats({ dodge: 0, regen: 0 }));
    const rng = createRng(1);
    const events = [];
    for (let i = 0; i < 30; i += 1) events.push(...stepBattle(b, rng));
    expect(events.some((e) => e.t === 'thorns' && e.from === 'hero')).toBe(true);
  });

  it('lets a companion hit on its own', () => {
    const b = battle(stats({ petPower: 0.5 }), stats());
    const rng = createRng(1);
    const events = [];
    for (let i = 0; i < 12; i += 1) events.push(...stepBattle(b, rng));
    expect(events.filter((e) => e.t === 'pet')).toHaveLength(1);
  });

  it('hits harder on a foe almost down with execute', () => {
    const avg = (execute: number) => {
      let total = 0;
      for (let seed = 1; seed <= 40; seed += 1) {
        const b = battle(
          stats({ execute, critChance: 0 }),
          stats({ dodge: 0, regen: 0, maxHp: 1e6 })
        );
        b.foe.hp = 1e5;
        b.hero.skills = [];
        const rng = createRng(seed);
        for (let i = 0; i < 20; i += 1) stepBattle(b, rng);
        total += 1e5 - b.foe.hp;
      }
      return total;
    };
    expect(avg(1)).toBeGreaterThan(avg(0) * 1.5);
  });
});
