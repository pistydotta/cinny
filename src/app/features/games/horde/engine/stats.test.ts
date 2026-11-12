import { describe, expect, it } from 'vitest';
import { BUFF_SECONDS, ELITE_EVERY, MOVE, TICK, xpToNext } from './data';
import { choose, createRun, rareChance, runStats, step } from './run';
import {
  BOLETOS,
  BOLETO_IDS,
  STATS,
  STAT_IDS,
  armorShare,
  computeStats,
  evasionChance,
} from './stats';
import { Enemy, GameEvent, Input, PassiveId, RunState } from './types';

const IDLE: Input = { moveX: 0, moveZ: 0, jump: false, jumpHeld: false, dash: false };

const quietRun = (character: RunState['character'] = 'lula', seed = 1): RunState => {
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

const bless = ({ blessings }: RunState, id: PassiveId, levels: number) => {
  // eslint-disable-next-line no-param-reassign
  blessings[id] = levels;
};

let nextEnemy = 9000;
const addEnemy = (run: RunState, at: Partial<Enemy> = {}): Enemy => {
  nextEnemy += 1;
  const enemy: Enemy = {
    ...{ id: nextEnemy, kind: 'brute', elite: false, x: 0.3, z: 0, hp: 500, maxHp: 500 },
    ...{ speed: 0, radius: 1, damage: 20, xp: 1, shootCd: 99, urnCd: 0 },
    ...{ pushX: 0, pushZ: 0, flash: 0 },
    ...at,
  };
  run.enemies.push(enemy);
  return enemy;
};

// Health lost to one touch of an enemy that deals 20.
const touchLoss = (setup: (run: RunState) => void): number => {
  const run = quietRun();
  setup(run);
  run.player.shield = 0;
  addEnemy(run);
  const before = run.player.hp;
  step(run, IDLE, TICK);
  return before - run.player.hp;
};

const allEvents = (run: RunState, ticks: number, input = IDLE): GameEvent[] => {
  const events: GameEvent[] = [];
  for (let i = 0; i < ticks; i += 1) events.push(...step(run, input, TICK));
  return events;
};

describe('horde stats: adding up', () => {
  it('has a Boleto for every stat, and every stat on one Boleto at most', () => {
    const covered = new Set(BOLETO_IDS.map((id) => BOLETOS[id].stat));
    expect([...covered].sort()).toEqual([...STAT_IDS].sort());
  });

  it('adds bonuses of one kind and multiplies the multipliers', () => {
    const base = {
      character: 'eneas' as const,
      hp: 100,
      speed: 7,
      meta: createRun(1, 'eneas').meta,
      passives: [{ id: 'might' as const, level: 2 }],
      blessings: { might: 1 },
    };
    // Three levels of +15% add up to +45%.
    expect(computeStats(base).damage).toBeCloseTo(1.45);
    // Five levels of the permanent +5% multiply on top: 1.45 * 1.25.
    expect(computeStats({ ...base, meta: { ...base.meta, might: 5 } }).damage).toBeCloseTo(
      1.45 * 1.25
    );
  });

  it('keeps stats under their caps and whole where they must be', () => {
    const stats = computeStats({
      character: 'eneas',
      hp: 100,
      speed: 7,
      meta: createRun(1, 'eneas').meta,
      passives: [],
      blessings: { crit: 100, multi: 100, lifesteal: 100 },
    });
    expect(stats.critChance).toBe(STATS.critChance.max);
    expect(stats.projectiles).toBe(STATS.projectiles.max);
    expect(stats.lifesteal).toBe(STATS.lifesteal.max);
    expect(armorShare(1e9)).toBeLessThanOrEqual(0.75);
    expect(evasionChance(1e9)).toBeLessThanOrEqual(0.6);
  });

  it('starts each hero with stats of its own', () => {
    expect(runStats(createRun(1, 'janja')).armor).toBeGreaterThan(0);
    expect(runStats(createRun(1, 'bolsonaro')).evasion).toBeGreaterThan(0);
    expect(runStats(createRun(1, 'lula')).damage).toBeGreaterThan(1);
    expect(runStats(createRun(1, 'eneas')).critChance).toBeGreaterThan(STATS.critChance.base);
  });
});

describe('horde stats: defense', () => {
  it('armor takes a share of every hit', () => {
    const plain = touchLoss(() => undefined);
    const armored = touchLoss((run) => bless(run, 'armor', 5));
    expect(plain).toBeCloseTo(20);
    expect(armored).toBeCloseTo(20 * (1 - armorShare(60)));
  });

  it('evasion dodges hits about as often as it says, using the run rng', () => {
    let dodged = 0;
    const tries = 400;
    for (let seed = 0; seed < tries; seed += 1) {
      const run = quietRun('lula', seed);
      bless(run, 'evasion', 5);
      addEnemy(run);
      if (step(run, IDLE, TICK).some((e) => e.type === 'evade')) dodged += 1;
    }
    expect(dodged / tries).toBeGreaterThan(evasionChance(60) - 0.08);
    expect(dodged / tries).toBeLessThan(evasionChance(60) + 0.08);
  });

  it('the shield takes hits first and fills again after a while', () => {
    const run = quietRun();
    bless(run, 'shield', 2);
    step(run, IDLE, TICK);
    run.player.shield = runStats(run).shield;
    const enemy = addEnemy(run, { damage: 10 });
    const { hp } = run.player;
    step(run, IDLE, TICK);
    expect(run.player.hp).toBe(hp);
    expect(run.player.shield).toBeCloseTo(20);
    enemy.hp = 0;
    allEvents(run, 60 * 6);
    expect(run.player.shield).toBeCloseTo(30);
  });

  it('overheal keeps healing past max health, and it fades', () => {
    const run = quietRun();
    bless(run, 'overheal', 2);
    run.pickups.push({ id: 1, kind: 'heart', x: 0, z: 0, value: 0, pulled: false });
    step(run, IDLE, TICK);
    expect(run.player.hp).toBe(run.player.maxHp);
    expect(run.player.overHp).toBeGreaterThan(20);
    const extra = run.player.overHp;
    allEvents(run, 60 * 3);
    expect(run.player.overHp).toBeLessThan(extra);
  });

  it('lifesteal heals on hits, but no faster than its budget', () => {
    const run = quietRun();
    run.weapons = [{ id: 'aura', level: 6, cooldown: 0, angle: 0 }];
    bless(run, 'lifesteal', 100);
    for (let i = 0; i < 30; i += 1) addEnemy(run, { x: 1 + (i % 3) * 0.5, damage: 0, hp: 1e6 });
    run.player.hp = 10;
    // Ten seconds, so the chance per hit evens out whatever the rng draws.
    allEvents(run, 600);
    expect(run.player.hp).toBeGreaterThan(20);
    expect(run.player.hp).toBeLessThanOrEqual(10 + 8 * 10 + 1);
  });

  it('thorns hurt what touches the hero', () => {
    const run = quietRun();
    bless(run, 'thorns', 3);
    const enemy = addEnemy(run);
    step(run, IDLE, TICK);
    expect(enemy.hp).toBeLessThan(500);
  });

  it('regen heals per minute', () => {
    const run = quietRun();
    bless(run, 'regen', 4);
    run.player.hp = 10;
    allEvents(run, 60 * 6);
    // 60 a minute for 6 seconds.
    expect(run.player.hp).toBeCloseTo(16, 0);
  });

  it('max health grows with the stat and heals the difference', () => {
    const run = quietRun();
    run.pendingChoices = 1;
    run.choices = [{ kind: 'passive', id: 'vigor', level: 1 }];
    run.phase = 'choosing';
    choose(run, 0);
    expect(run.player.maxHp).toBe(120);
    expect(run.player.hp).toBe(120);
  });

  it('bosses pierce part of the defense, so nothing makes the hero immortal', () => {
    // More defense than a run can hold: every defense Boleto maxed, a few blessings on top, and
    // the defense upgrades bought.
    const run = createRun(1, 'janja', {
      ...createRun(1, 'janja').meta,
      armor: 5,
      regen: 5,
      vigor: 5,
    });
    run.spawnBudget = -1e9;
    run.nextEliteAt = 1e9;
    run.shrines = [];
    // No barrels or pots, and no set pieces of the horde.
    run.enemies = [];
    run.nextHordeEvent = 99;
    run.nextPotsAt = 1e9;
    run.weapons = [];
    (['armor', 'evasion', 'shield', 'regen', 'lifesteal', 'overheal'] as PassiveId[]).forEach(
      (id) => bless(run, id, 7)
    );
    addEnemy(run, { kind: 'boss', radius: 2.3, damage: 60 });
    allEvents(run, 60 * 30);
    expect(run.player.hp).toBeLessThan(run.player.maxHp);
  });
});

describe('horde stats: attack and weapons', () => {
  const hits = (setup: (run: RunState) => void, at: Partial<Enemy> = {}) => {
    const run = quietRun();
    run.weapons = [{ id: 'aura', level: 1, cooldown: 0, angle: 0 }];
    setup(run);
    const enemy = addEnemy(run, { x: 2, damage: 0, hp: 1e6, ...at });
    const events = allEvents(run, 1).filter(
      (e): e is Extract<GameEvent, { type: 'hit' }> => e.type === 'hit'
    );
    return { events, enemy, run };
  };

  it('crit chance and crit damage', () => {
    const { events } = hits((run) => {
      bless(run, 'crit', 100);
      bless(run, 'critdmg', 2);
    });
    // Lula's aura level 1: 7 damage, times 1.12, times 2.6 on a crit.
    expect(events[0].crit).toBe(true);
    expect(events[0].amount).toBe(Math.round(7 * 1.12 * 2.6));
  });

  it('elite damage only against elites and bosses', () => {
    const lost = (elite: boolean) => {
      const { enemy, events } = hits((run) => bless(run, 'hunter', 4), { elite });
      return (1e6 - enemy.hp) / (events[0].crit ? 2 : 1);
    };
    expect(lost(true) / lost(false)).toBeCloseTo(1.6);
  });

  it('knockback pushes further', () => {
    const push = (levels: number) => {
      const run = quietRun();
      run.weapons = [{ id: 'nova', level: 1, cooldown: 0, angle: 0 }];
      bless(run, 'knockback', levels);
      const enemy = addEnemy(run, { x: 3, damage: 0, hp: 1e6 });
      step(run, IDLE, TICK);
      return enemy.pushX;
    };
    expect(push(4)).toBeCloseTo(push(0) * 2);
  });

  it('projectile speed and duration change the shots', () => {
    const shot = (setup: (run: RunState) => void) => {
      const run = quietRun();
      run.weapons = [{ id: 'card', level: 1, cooldown: 0, angle: 0 }];
      setup(run);
      addEnemy(run, { x: 15, damage: 0 });
      step(run, IDLE, TICK);
      return run.shots[0];
    };
    const plain = shot(() => undefined);
    const fast = shot((run) => bless(run, 'velocity', 5));
    const long = shot((run) => bless(run, 'duration', 5));
    expect(Math.hypot(fast.vx, fast.vz)).toBeCloseTo(Math.hypot(plain.vx, plain.vz) * 1.6);
    expect(long.life).toBeGreaterThan(plain.life * 1.5);
  });

  it('a card with ricochet bounces to the next enemy', () => {
    const run = quietRun();
    run.weapons = [{ id: 'card', level: 1, cooldown: 0, angle: 0 }];
    bless(run, 'ricochet', 1);
    const first = addEnemy(run, { x: 4, damage: 0, hp: 1e6 });
    const second = addEnemy(run, { x: 4, z: 6, damage: 0, hp: 1e6 });
    allEvents(run, 50);
    expect(first.hp).toBeLessThan(1e6);
    expect(second.hp).toBeLessThan(1e6);
  });

  it('projectiles add shots and size grows areas', () => {
    const base = quietRun();
    const more = quietRun();
    bless(more, 'multi', 1);
    bless(more, 'reach', 5);
    expect(runStats(more).projectiles).toBe(runStats(base).projectiles + 1);
    expect(runStats(more).size).toBeCloseTo(runStats(base).size * 1.6);
  });

  it('attack speed makes weapons fire sooner', () => {
    const fired = (levels: number) => {
      const run = quietRun();
      run.weapons = [{ id: 'nova', level: 1, cooldown: 0, angle: 0 }];
      bless(run, 'haste', levels);
      addEnemy(run, { x: 3, damage: 0, hp: 1e9 });
      return allEvents(run, 60 * 10).filter((e) => e.type === 'nova').length;
    };
    expect(fired(5)).toBeGreaterThan(fired(0));
  });

  it('counts the damage of each weapon', () => {
    const { run } = hits(() => undefined);
    expect(run.damageBy.aura).toBeGreaterThan(0);
  });
});

describe('horde stats: movement, luck and economy', () => {
  it('extra jumps jump again in the air, and jump height jumps higher', () => {
    const run = quietRun();
    bless(run, 'extrajump', 1);
    step(run, { ...IDLE, jump: true, jumpHeld: true }, TICK);
    allEvents(run, 10, { ...IDLE, jumpHeld: true });
    const air = step(run, { ...IDLE, jump: true, jumpHeld: true }, TICK);
    expect(air.some((e) => e.type === 'jump' && e.air)).toBe(true);

    const high = quietRun();
    bless(high, 'jump', 5);
    step(high, { ...IDLE, jump: true, jumpHeld: true }, TICK);
    expect(high.player.vy).toBeCloseTo(MOVE.jumpSpeed * 1.4 - MOVE.gravity * TICK);
  });

  it('move speed makes the hero faster', () => {
    const run = quietRun();
    bless(run, 'swift', 5);
    allEvents(run, 60, { ...IDLE, moveZ: -1 });
    expect(Math.hypot(run.player.vx, run.player.vz)).toBeCloseTo(7 * 1.4, 1);
  });

  it('luck makes rare offers likelier, and rare offers give two levels', () => {
    const lucky = quietRun();
    bless(lucky, 'luck', 10);
    expect(rareChance(runStats(lucky))).toBeGreaterThan(rareChance(runStats(quietRun())));
    let rare = 0;
    for (let seed = 0; seed < 60; seed += 1) {
      const run = quietRun('lula', seed);
      bless(run, 'luck', 40);
      run.pickups.push({ id: 1, kind: 'xp', x: 0, z: 0, value: xpToNext(1), pulled: false });
      step(run, IDLE, TICK);
      const rares = (run.choices ?? []).filter(
        (c) => (c.kind === 'weapon' || c.kind === 'passive') && c.rarity
      );
      rares.forEach((c) => expect('level' in c && c.level).toBeGreaterThanOrEqual(2));
      rare += rares.length;
    }
    expect(rare).toBeGreaterThan(20);
  });

  it('difficulty makes enemies tougher and pays more experience', () => {
    const run = quietRun();
    bless(run, 'curse', 4);
    run.spawnBudget = 1;
    step(run, IDLE, TICK);
    const plain = quietRun();
    plain.spawnBudget = 1;
    step(plain, IDLE, TICK);
    expect(run.enemies[0].maxHp).toBeCloseTo(plain.enemies[0].maxHp * 1.6);
    run.pickups.push({ id: 1, kind: 'xp', x: 0, z: 0, value: 1, pulled: false });
    step(run, IDLE, TICK);
    expect(run.player.xp).toBeCloseTo(1.6);
  });

  it('pickup range, experience and gold gain', () => {
    const run = quietRun();
    bless(run, 'magnet', 2);
    bless(run, 'xp', 5);
    run.pickups.push({ id: 1, kind: 'xp', x: 4, z: 0, value: 2, pulled: false });
    step(run, IDLE, TICK);
    expect(run.pickups[0].pulled).toBe(true);
    allEvents(run, 30);
    expect(run.player.xp).toBeCloseTo(3);
    expect(runStats(run).goldGain).toBe(1.15);
    // Lula's +15% and two Boletos of +15% are the same kind, so they add up.
    bless(run, 'gold', 2);
    expect(runStats(run).goldGain).toBeCloseTo(1.45);
  });

  it('elite rate brings elites sooner', () => {
    const run = quietRun();
    bless(run, 'elites', 5);
    run.nextEliteAt = 0;
    step(run, IDLE, TICK);
    expect(run.nextEliteAt).toBeCloseTo(ELITE_EVERY / 2);
  });

  it('powerups: rage, freeze, star, bomb and gold rain, longer with power', () => {
    const take = (kind: 'rage' | 'freeze' | 'star' | 'bomb' | 'goldrain', power = 0) => {
      const run = quietRun();
      bless(run, 'power', power);
      run.pickups.push({ id: 1, kind, x: 0, z: 0, value: 0, pulled: false });
      return run;
    };
    const rage = take('rage', 5);
    step(rage, IDLE, TICK);
    expect(rage.buffs.rage).toBeCloseTo(BUFF_SECONDS.rage * 2, 1);
    expect(runStats(rage).damage).toBeCloseTo(1.12 * 2);

    const freeze = take('freeze');
    const runner = addEnemy(freeze, { x: 10, speed: 5, damage: 0 });
    step(freeze, IDLE, TICK);
    const frozenAt = runner.x;
    allEvents(freeze, 30);
    expect(runner.x).toBe(frozenAt);

    const star = take('star');
    step(star, IDLE, TICK);
    addEnemy(star);
    allEvents(star, 30);
    expect(star.player.hp).toBe(star.player.maxHp);

    const bomb = take('bomb');
    addEnemy(bomb, { x: 10, damage: 0 });
    addEnemy(bomb, { x: 40, damage: 0 });
    // What the bomb kills is counted and cleared on the next tick.
    allEvents(bomb, 2);
    expect(bomb.enemies).toHaveLength(1);

    const rain = take('goldrain');
    step(rain, IDLE, TICK);
    expect(rain.pickups.filter((p) => p.kind === 'gold')).toHaveLength(10);
  });

  it('powerup chance makes kills drop more powerups', () => {
    const drops = (levels: number) => {
      let count = 0;
      for (let seed = 0; seed < 4; seed += 1) {
        const run = quietRun('lula', seed);
        bless(run, 'fortune', levels);
        for (let i = 0; i < 400; i += 1) addEnemy(run, { x: 30, hp: 0, damage: 0 });
        step(run, IDLE, TICK);
        count += run.pickups.filter((p) =>
          ['bomb', 'rage', 'freeze', 'star', 'goldrain'].includes(p.kind)
        ).length;
      }
      return count;
    };
    expect(drops(5)).toBeGreaterThan(drops(0));
  });

  it('shrines offer blessings that take no Boleto slot', () => {
    const run = quietRun();
    run.shrines = [{ id: 0, x: 0, z: 0, charge: 0.999, used: false }];
    run.passives = [
      { id: 'might', level: 1 },
      { id: 'haste', level: 1 },
      { id: 'reach', level: 1 },
      { id: 'swift', level: 1 },
    ];
    step(run, IDLE, TICK);
    expect(run.phase).toBe('choosing');
    expect(run.choices?.every((c) => c.kind === 'blessing')).toBe(true);
    const picked = run.choices?.[0];
    choose(run, 0);
    expect(run.passives).toHaveLength(4);
    if (picked?.kind === 'blessing') expect(run.blessings[picked.id]).toBe(1);
  });
});
