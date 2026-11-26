import { describe, expect, it } from 'vitest';
import { getClass } from './classes';
import { makeFighter, outcomeOf, stepBattle } from './combat';
import { computeStats } from './stats';
import { Battle } from './types';

const rng = { next: () => 0.5, state: () => 1 };
const encounter = (damage = 90): Battle => {
  const stats = {
    ...computeStats({ cls: getClass('warrior'), level: 1, mods: [] }),
    maxHp: 1000,
    damage,
    critChance: 0,
    dodge: 0,
    armor: 0,
    regen: 0,
  };
  const hero = makeFighter('hero', '', 1, stats);
  const foe = makeFighter('boss', '', 1, { ...stats, damage: 0 });
  hero.attackMs = 0;
  foe.attackMs = 1e9;
  foe.hp = 220;
  return { hero, foe, boss: true, elapsedMs: 0 };
};

describe('boss last stand', () => {
  it.each([100, 130, 150])('heals exactly 50%% of max HP when a hit leaves %i HP', (hp) => {
    const b = encounter(220 - hp);
    const events = stepBattle(b, rng);
    expect(b.foe.hp).toBeCloseTo(hp + 500);
    expect(b.foe.bossRecovery).toBe('used');
    expect(events.filter((e) => e.t === 'boss_recovery')).toEqual([
      { t: 'boss_recovery', from: 'foe', amount: 500 },
    ]);
  });

  it('is not triggered early and is only available once per encounter', () => {
    const b = encounter(20);
    stepBattle(b, rng);
    expect(b.foe.hp).toBe(200);
    expect(b.foe.bossRecovery).toBe('ready');
    b.hero.stats.damage = 70;
    b.hero.attackMs = 0;
    stepBattle(b, rng);
    expect(b.foe.hp).toBe(630);
    b.foe.hp = 200;
    b.hero.attackMs = 0;
    expect(stepBattle(b, rng).some((e) => e.t === 'boss_recovery')).toBe(false);
    expect(b.foe.hp).toBe(130);
  });

  it.each([90, 0])('allows burst damage to skip the band and leave %i HP', (hp) => {
    const b = encounter(220 - hp);
    expect(stepBattle(b, rng).some((e) => e.t === 'boss_recovery')).toBe(false);
    expect(b.foe.hp).toBe(hp);
    expect(b.foe.bossRecovery).toBe('bypassed');
    if (hp === 0) expect(outcomeOf(b)).toBe('hero');
    else {
      b.foe.hp = 200;
      b.hero.stats.damage = 70;
      b.hero.attackMs = 0;
      expect(stepBattle(b, rng).some((e) => e.t === 'boss_recovery')).toBe(false);
    }
  });

  it('checks between individual hits of a multi-hit skill', () => {
    const b = encounter(90);
    b.hero.attackMs = 1e9;
    b.hero.stats.skillPower = 1;
    b.hero.skills = [
      {
        ms: 0,
        def: {
          id: 'double',
          cooldownMs: 10000,
          effects: [{ kind: 'strike', multiplier: 1, hits: 2 }],
        },
      },
    ];
    stepBattle(b, rng);
    expect(b.foe.bossRecovery).toBe('used');
    expect(b.foe.hp).toBeCloseTo(540);
  });

  it('handles damage over time, pets and reflected damage', () => {
    const dot = encounter();
    dot.hero.attackMs = 1e9;
    dot.foe.dots = [{ dps: 900, ms: 2000 }];
    expect(stepBattle(dot, rng).some((e) => e.t === 'boss_recovery')).toBe(true);
    const pet = encounter();
    pet.hero.attackMs = 1e9;
    pet.hero.stats.petPower = 1;
    pet.hero.petMs = 0;
    expect(stepBattle(pet, rng).some((e) => e.t === 'boss_recovery')).toBe(true);
    const reflect = encounter();
    reflect.hero.attackMs = 1e9;
    reflect.hero.stats.thorns = 1;
    reflect.foe.stats.damage = 90;
    reflect.foe.attackMs = 0;
    expect(stepBattle(reflect, rng).some((e) => e.t === 'boss_recovery')).toBe(true);
  });

  it('does not trigger on fully shielded damage, normal enemies or arena opponents', () => {
    const shield = encounter();
    shield.foe.shield = 100;
    stepBattle(shield, rng);
    expect(shield.foe.hp).toBe(220);
    expect(shield.foe.bossRecovery).toBe('ready');
    const normal = encounter();
    normal.boss = false;
    expect(stepBattle(normal, rng).some((e) => e.t === 'boss_recovery')).toBe(false);
    expect(normal.foe.hp).toBe(130);
  });
});
