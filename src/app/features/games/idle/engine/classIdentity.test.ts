import { describe, expect, it } from 'vitest';
import { chooseSpec, equip, equipBest, learnTalent, sellIncompatible } from './actions';
import { CLASSES, SPEC_LEVEL, weaponsFor } from './classes';
import { canEquip, generateItem, starterWeapon } from './items';
import { advance, availableTalentPoints, heroStats, newGame, stash } from './progress';
import { createRng } from './rng';
import { deserialize, serialize } from './save';
import { talentsFor } from './talents';
import { catchUp } from './offline';
import { powerOf } from './stats';
import { withDeltas } from '../itemView';

describe('class identity and idle inventory', () => {
  it('rejects stronger foreign weapons in manual equip, recommendations and equip best', () => {
    const s = newGame('Mage', 'mage', 1, 0);
    const axe = { ...starterWeapon(CLASSES[0], 'foreign'), baseId: 'axe', mods: { damage: 9999 } };
    s.inventory.push(axe);
    expect(equip(s, axe.id)).toEqual({ ok: false, error: 'incompatible' });
    expect(equipBest(s).ok).toBe(false);
    expect(withDeltas(s)[0]).toMatchObject({ compatible: false, delta: 0 });
    const power = powerOf(heroStats(s));
    s.equipment.weapon = axe;
    expect(powerOf(heroStats(s))).toBeLessThan(power);
  });

  it('only offers and learns the class and chosen specialization paths', () => {
    CLASSES.forEach((cls) => {
      const s = newGame('Hero', cls.id, 1, 0);
      s.hero.level = 40;
      const defs = talentsFor(s.hero);
      expect(defs.filter((t) => t.branch === 'fury')).toHaveLength(5);
      expect(defs.some((t) => t.specId)).toBe(false);
      const foreign = CLASSES.find((c) => c.id !== cls.id);
      if (!foreign) throw new Error('missing other class');
      expect(learnTalent(s, `${foreign.id}_0`)).toEqual({ ok: false, error: 'incompatible' });
      expect(learnTalent(s, `${cls.specs[0].id}_0`).ok).toBe(false);
      cls.specs.forEach((spec) => {
        const result = chooseSpec(s, spec.id);
        if (!result.ok) throw new Error(result.error);
        const specialized = result.state;
        expect(
          talentsFor(specialized.hero)
            .filter((t) => t.specId)
            .every((t) => t.specId === spec.id)
        ).toBe(true);
        expect(learnTalent(specialized, `${spec.id}_0`).ok).toBe(true);
        const rng = createRng(123);
        for (let i = 0; i < 30; i += 1) {
          const item = generateItem(rng, cls, `drop${i}`, {
            level: SPEC_LEVEL,
            kind: 'weapon',
            specId: spec.id,
          });
          expect(weaponsFor(specialized.hero)).toContain(item.baseId);
          expect(canEquip(specialized.hero, item)).toBe(true);
        }
      });
    });
  });

  it('sells foreign items in bulk and on drop, protecting locks and forge investment', () => {
    const s = newGame('Mage', 'mage', 7, 0);
    const foreign = starterWeapon(CLASSES[0], 'sell');
    s.inventory = [
      foreign,
      { ...foreign, id: 'locked', locked: true },
      { ...foreign, id: 'forged', plus: 1 },
    ];
    const result = sellIncompatible(s);
    if (!result.ok) throw new Error(result.error);
    expect(result.state.inventory.map((i) => i.id)).toEqual(['locked', 'forged']);
    expect(result.state.gold).toBe(foreign.value);
    s.settings.autoSellIncompatible = true;
    s.settings.autoSalvage = 'mythic';
    stash(s, foreign, []);
    expect(s.loot[s.loot.length - 1]?.fate).toBe('sold');
    expect(s.gold).toBe(foreign.value);
    const upgrade = {
      ...starterWeapon(CLASSES[3], 'upgrade-base'),
      id: 'upgrade',
      mods: { damage: 999 },
    };
    stash(s, upgrade, []);
    expect(s.inventory.some((i) => i.id === upgrade.id)).toBe(true);
  });

  it('refunds legacy combat talents and moves incompatible equipped gear without deleting it', () => {
    const s = newGame('Mage', 'mage', 1, 0);
    s.hero.level = 20;
    s.hero.talents = { sharpness: 5, companion: 5, greed: 2 };
    s.equipment.weapon = starterWeapon(CLASSES[0], 'legacy');
    const loaded = deserialize(serialize(s));
    if (!loaded) throw new Error('save did not load');
    expect(loaded.hero.talents).toEqual({ greed: 2 });
    expect(availableTalentPoints(loaded)).toBe(17);
    expect(loaded.equipment.weapon).toBeUndefined();
    expect(loaded.inventory.some((i) => i.id === 'legacy')).toBe(true);
    expect(deserialize(serialize(loaded))?.inventory).toHaveLength(1);
  });

  it('simulates an hour per class followed by offline rewards with finite progression', () => {
    CLASSES.forEach((cls) => {
      let s = newGame('Hero', cls.id, 42, 0);
      s.settings.autoSellIncompatible = true;
      for (let minute = 0; minute < 60; minute += 1) {
        advance(s, 60000);
        const result = equipBest(s);
        if (result.ok) s = result.state;
      }
      const before = s.lifetime.kills;
      const report = catchUp(s, 2 * 3600000);
      expect(s.lifetime.kills).toBeGreaterThan(before);
      expect(report.gold).toBeGreaterThan(0);
      expect(Number.isFinite(powerOf(heroStats(s)))).toBe(true);
      expect(s.hero.level).toBeGreaterThan(1);
      expect(Object.values(s.equipment).every((i) => i && canEquip(s.hero, i))).toBe(true);
    });
  });
});
