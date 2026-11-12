import { describe, expect, it } from 'vitest';
import { ABILITY_COOLDOWN, SKIP_GOLD, TICK, xpToNext } from './data';
import {
  BURN_BOLT,
  banish,
  choose,
  closeChest,
  createRun,
  epicChance,
  evolutionsReady,
  rareChance,
  runStats,
  skip,
  step,
} from './run';
import { weaponSpec } from './weapons';
import { CharacterId, Enemy, GameEvent, Input, Mesa, RunState } from './types';
import { MAP_HALF } from './terrain';

const IDLE: Input = { moveX: 0, moveZ: 0, jump: false, jumpHeld: false, dash: false };

const quietRun = (character: CharacterId = 'lula', seed = 1): RunState => {
  const run = createRun(seed, character);
  run.spawnBudget = -1e9;
  run.nextEliteAt = 1e9;
  run.shrines = [];
  // No barrels or pots, and no set pieces of the horde.
  run.enemies = [];
  run.nextHordeEvent = 99;
  run.nextPotsAt = 1e9;
  run.weapons = [];
  return run;
};

let nextId = 20000;
const addEnemy = (run: RunState, at: Partial<Enemy> = {}): Enemy => {
  nextId += 1;
  const enemy: Enemy = {
    ...{ id: nextId, kind: 'brute', elite: false, x: 3, z: 0, hp: 1e6, maxHp: 1e6 },
    ...{ speed: 0, radius: 1, damage: 0, xp: 1, shootCd: 99, urnCd: 0 },
    ...{ pushX: 0, pushZ: 0, flash: 0 },
    ...at,
  };
  run.enemies.push(enemy);
  return enemy;
};

// Gives the run one level-up and steps once, so it stops on an offer.
const levelUp = (run: RunState) => {
  run.pickups.push({
    id: 1,
    kind: 'xp',
    x: 0,
    z: 0,
    value: xpToNext(run.player.level),
    pulled: false,
  });
  step(run, IDLE, TICK);
};

describe('horde build: offers', () => {
  it('luck makes rare and epic offers likelier; epic gives three levels', () => {
    const lucky = quietRun();
    lucky.blessings.luck = 20;
    expect(epicChance(runStats(lucky))).toBeGreaterThan(epicChance(runStats(quietRun())));
    expect(rareChance(runStats(lucky))).toBeGreaterThan(rareChance(runStats(quietRun())));
    let epics = 0;
    for (let seed = 0; seed < 80; seed += 1) {
      const run = quietRun('lula', seed);
      run.blessings.luck = 40;
      levelUp(run);
      const found = (run.choices ?? []).filter(
        (c) => (c.kind === 'weapon' || c.kind === 'passive') && c.rarity === 'epic'
      );
      found.forEach((c) => expect('level' in c && c.level).toBe(3));
      epics += found.length;
    }
    expect(epics).toBeGreaterThan(0);
  });

  it('offers the evolution once a weapon is maxed and its Boleto is in the build', () => {
    const run = quietRun();
    run.weapons = [{ id: 'card', level: 6, cooldown: 0, angle: 0 }];
    expect(evolutionsReady(run)).toEqual([]);
    run.passives = [{ id: 'multi', level: 1 }];
    expect(evolutionsReady(run)).toEqual(['card']);
    let offered = false;
    for (let i = 0; i < 20 && !offered; i += 1) {
      levelUp(run);
      const index = run.choices?.findIndex((c) => c.kind === 'evolve') ?? -1;
      if (index >= 0) {
        offered = true;
        choose(run, index);
      } else choose(run, 0);
    }
    expect(offered).toBe(true);
    expect(run.weapons.find((w) => w.id === 'card')?.evolved).toBe(true);
    expect(evolutionsReady(run)).toEqual([]);
  });

  it('evolved weapons are much stronger than at max level', () => {
    const stats = runStats(quietRun());
    const power = (evolved: boolean) => {
      const spec = weaponSpec({ id: 'missile', level: 6, cooldown: 0, angle: 0, evolved }, stats);
      return (spec.damage * spec.count * spec.area ** 2) / spec.cooldown;
    };
    expect(power(true)).toBeGreaterThan(power(false) * 2);
    const run = quietRun();
    run.weapons = [{ id: 'card', level: 6, cooldown: 0, angle: 0, evolved: true }];
    addEnemy(run, { x: 6 });
    step(run, IDLE, TICK);
    expect(run.shots.filter((s) => s.kind === 'card')).toHaveLength(7);
  });

  it('a banished offer is replaced and never offered again in the run', () => {
    const run = quietRun();
    run.banishes = 1;
    levelUp(run);
    const gone = run.choices?.find((c) => c.kind === 'weapon' || c.kind === 'passive');
    const index = run.choices?.indexOf(gone as never) ?? -1;
    expect(banish(run, index)).toBe(true);
    expect(run.banishes).toBe(0);
    expect(banish(run, index)).toBe(false);
    const same = (c: { kind: string; id?: string }) =>
      gone && c.kind === gone.kind && 'id' in gone && c.id === gone.id;
    expect(run.choices?.some(same)).toBe(false);
    for (let i = 0; i < 30; i += 1) {
      choose(run, 0);
      levelUp(run);
      expect(run.choices?.some(same)).toBe(false);
    }
  });

  it('skipping passes on the offer for gold', () => {
    const run = quietRun();
    run.skips = 1;
    levelUp(run);
    const { gold } = run;
    expect(skip(run)).toBe(true);
    expect(run.phase).toBe('playing');
    expect(run.gold).toBe(gold + SKIP_GOLD);
    levelUp(run);
    expect(skip(run)).toBe(false);
  });
});

describe('horde build: chests', () => {
  const openChest = (run: RunState): GameEvent[] => {
    run.pickups.push({ id: 7, kind: 'chest', x: 0, z: 0, value: 0, pulled: false });
    return step(run, IDLE, TICK);
  };

  it('a chest gives one, three or five upgrades at once and waits to be closed', () => {
    const counts = new Set<number>();
    for (let seed = 0; seed < 60; seed += 1) {
      const run = quietRun('lula', seed);
      run.blessings.luck = 30;
      run.weapons = [{ id: 'card', level: 1, cooldown: 0, angle: 0 }];
      const events = openChest(run);
      expect(run.phase).toBe('chest');
      const opened = events.find((e) => e.type === 'chest');
      if (opened?.type === 'chest') counts.add(opened.count);
      expect(run.chest).toHaveLength(opened?.type === 'chest' ? opened.count : -1);
      const { time } = run;
      step(run, IDLE, TICK);
      expect(run.time).toBe(time);
      expect(closeChest(run)).toBe(true);
      expect(run.phase).toBe('playing');
    }
    expect([...counts].sort()).toEqual([1, 3, 5]);
  });

  it('a chest gives the evolution first when one is ready', () => {
    const run = quietRun();
    run.weapons = [{ id: 'bolt', level: 6, cooldown: 0, angle: 0 }];
    run.passives = [{ id: 'crit', level: 1 }];
    openChest(run);
    expect(run.chest?.[0]).toEqual({ kind: 'evolve', id: 'bolt' });
    expect(run.weapons[0].evolved).toBe(true);
  });
});

describe('horde build: abilities', () => {
  const use = (hero: CharacterId) => {
    const run = quietRun(hero);
    run.player.hp = run.player.maxHp / 2;
    for (let i = 0; i < 12; i += 1) addEnemy(run, { x: 3 + (i % 4), z: (i - 6) * 0.8 });
    const events = step(run, { ...IDLE, ability: true }, TICK);
    return { run, events };
  };

  it('starts the cooldown and does nothing again until it is over', () => {
    const { run, events } = use('eneas');
    expect(events.some((e) => e.type === 'ability')).toBe(true);
    expect(run.player.abilityCd).toBeCloseTo(ABILITY_COOLDOWN.eneas - TICK, 1);
    const again = step(run, { ...IDLE, ability: true }, TICK);
    expect(again.some((e) => e.type === 'ability')).toBe(false);
  });

  it('Enéas drops bombs, Lula throws cards all around', () => {
    expect(use('eneas').run.shots.filter((s) => s.kind === 'missile')).toHaveLength(10);
    expect(use('lula').run.shots.filter((s) => s.kind === 'card')).toHaveLength(24);
  });

  it('Janja heals and pushes, Bolsonaro sprints untouchable', () => {
    const janja = use('janja').run;
    expect(janja.player.hp).toBeGreaterThan(janja.player.maxHp * 0.75);
    expect(janja.enemies.some((e) => Math.hypot(e.pushX, e.pushZ) > 10)).toBe(true);
    const bolsonaro = use('bolsonaro').run;
    expect(bolsonaro.buffs.sprint).toBeGreaterThan(3);
    expect(bolsonaro.buffs.star).toBeGreaterThan(1);
    expect(runStats(bolsonaro).moveSpeed).toBeGreaterThan(7.9 * 1.5);
  });
});

describe('horde build: synergies', () => {
  it('lightning hits burning enemies harder', () => {
    const hit = (burning: boolean) => {
      const run = quietRun();
      run.blessings.crit = -100;
      run.weapons = [{ id: 'bolt', level: 1, cooldown: 0, angle: 0 }];
      const enemy = addEnemy(run, { burn: burning ? 5 : 0 });
      step(run, IDLE, TICK);
      return 1e6 - enemy.hp;
    };
    expect(hit(true)).toBeCloseTo(hit(false) * BURN_BOLT);
  });

  it('enemies knocked into the edge of the map or a cliff take damage', () => {
    const run = quietRun();
    const enemy = addEnemy(run, { x: MAP_HALF - 0.6, pushX: 40 });
    step(run, IDLE, TICK);
    expect(enemy.hp).toBeLessThan(1e6);
    const resting = addEnemy(run, { x: MAP_HALF - 0.6, pushX: 1 });
    step(run, IDLE, TICK);
    expect(resting.hp).toBe(1e6);
    // Against the side of a mesa: stopped there, and hurt.
    // A big mesa, beside the middle of a side (ramps start at the middle).
    const mesa = run.map.mesas.find((m) => m.kind === 'mesa' && m.w >= 8 && m.d >= 8) as Mesa;
    const thrown = addEnemy(run, { x: mesa.x - mesa.w - 0.7, z: mesa.z + mesa.d * 0.5, pushX: 40 });
    step(run, IDLE, TICK);
    expect(thrown.hp).toBeLessThan(1e6);
    expect(thrown.x).toBeLessThan(mesa.x - mesa.w);
  });
});
