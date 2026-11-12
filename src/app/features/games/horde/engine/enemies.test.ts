import { describe, expect, it } from 'vitest';
import { CHALLENGE_SECONDS, CURSE_SECONDS, HORDE_EVENTS, TICK, TIER_DIFFICULTY } from './data';
import { SHIELD_FRONT, createRun, runStats, step } from './run';
import { CharacterId, Enemy, GameEvent, Input, RunState } from './types';

const IDLE: Input = { moveX: 0, moveZ: 0, jump: false, jumpHeld: false, dash: false };

const quietRun = (character: CharacterId = 'lula', seed = 1): RunState => {
  const run = createRun(seed, character);
  run.spawnBudget = -1e9;
  run.nextEliteAt = 1e9;
  run.shrines = [];
  run.weapons = [];
  run.enemies = [];
  run.nextHordeEvent = 99;
  run.nextPotsAt = 1e9;
  return run;
};

let nextId = 30000;
const addEnemy = (run: RunState, at: Partial<Enemy> = {}): Enemy => {
  nextId += 1;
  const enemy: Enemy = {
    ...{ id: nextId, kind: 'husk', elite: false, x: 5, z: 0, hp: 1e6, maxHp: 1e6 },
    ...{ speed: 0, radius: 0.6, damage: 10, xp: 1, shootCd: 99, urnCd: 0 },
    ...{ pushX: 0, pushZ: 0, flash: 0, actCd: 0 },
    ...at,
  };
  run.enemies.push(enemy);
  return enemy;
};

const ticks = (run: RunState, n: number, input = IDLE): GameEvent[] => {
  const events: GameEvent[] = [];
  for (let i = 0; i < n; i += 1) events.push(...step(run, input, TICK));
  return events;
};

describe('horde enemies', () => {
  it('a charger marks its lane, waits, then charges along it', () => {
    const run = quietRun();
    const charger = addEnemy(run, { kind: 'charger', x: 8, speed: 3 });
    step(run, IDLE, TICK);
    expect(charger.act?.kind).toBe('aim');
    expect(run.hazards.some((h) => h.kind === 'lane')).toBe(true);
    const aimedAt = charger.x;
    ticks(run, 30);
    expect(charger.x).toBe(aimedAt);
    ticks(run, 40);
    expect(charger.x).toBeLessThan(aimedAt - 5);
  });

  it('a bomber warns with a circle and then blows up next to the hero', () => {
    const run = quietRun();
    const bomber = addEnemy(run, { kind: 'bomber', x: 1.5, damage: 30 });
    step(run, IDLE, TICK);
    expect(run.hazards.some((h) => h.kind === 'blast')).toBe(true);
    const { hp } = run.player;
    const events = ticks(run, 40);
    expect(events.some((e) => e.type === 'explode')).toBe(true);
    expect(run.player.hp).toBeLessThan(hp);
    expect(run.enemies.includes(bomber)).toBe(false);
  });

  it('a shield blocks hits from the front but not area damage or hits from behind', () => {
    const lost = (weapon: 'card' | 'nova', behind = false) => {
      const run = quietRun();
      run.blessings.crit = -100;
      run.weapons = [{ id: weapon, level: 1, cooldown: 0, angle: 0 }];
      const shield = addEnemy(run, { kind: 'shield', x: 4, radius: 0.8 });
      if (behind) {
        // A card that comes back from the far side.
        run.player.x = 0;
        run.shots.push({
          ...{ id: 1, kind: 'card', hostile: false, x: 5, z: 0, vx: -10, vz: 0 },
          ...{ radius: 0.4, damage: 50, pierce: 0, life: 1, blast: 0, hit: [] },
        });
        run.weapons = [];
      }
      ticks(run, 30);
      return 1e6 - shield.hp;
    };
    expect(lost('card')).toBeGreaterThan(0);
    expect(lost('card')).toBeCloseTo(20 * 1.12 * SHIELD_FRONT, 0);
    expect(lost('nova')).toBeCloseTo(19 * 1.12, 0);
    expect(lost('card', true)).toBeCloseTo(50, 0);
  });

  it('a summoner stays back and calls swarms', () => {
    const run = quietRun();
    const summoner = addEnemy(run, { kind: 'summoner', x: 10, speed: 2.4, actCd: 0.1 });
    ticks(run, 20);
    expect(run.enemies.filter((e) => e.kind === 'swarm').length).toBe(5);
    ticks(run, 60);
    expect(summoner.x).toBeGreaterThan(10);
  });

  it('elites get a twist; burning ones leave fire that hurts', () => {
    const run = createRun(2, 'lula');
    run.time = 100;
    run.nextEliteAt = 100;
    step(run, IDLE, TICK);
    const elite = run.enemies.find((e) => e.elite);
    expect(['fast', 'giant', 'regen', 'burning']).toContain(elite?.mod);

    const fire = quietRun();
    // Close enough for its fire to reach the hero, not close enough to touch.
    addEnemy(fire, { elite: true, mod: 'burning', x: 1.4, damage: 0, shootCd: 0 });
    const { hp } = fire.player;
    ticks(fire, 60);
    expect(fire.hazards.some((h) => h.kind === 'fire')).toBe(true);
    expect(fire.player.hp).toBeLessThan(hp);

    const regen = quietRun();
    const healer = addEnemy(regen, { elite: true, mod: 'regen', hp: 500, maxHp: 1000 });
    ticks(regen, 60);
    expect(healer.hp).toBeGreaterThan(510);
  });
});

describe('horde bosses', () => {
  const boss = (run: RunState, elite = false): Enemy =>
    addEnemy(run, {
      kind: 'boss',
      elite,
      x: 6,
      radius: 2.3,
      speed: 3.5,
      damage: 30,
      hp: 10000,
      maxHp: 10000,
      actCd: 0,
    });

  it('every attack is shown before it lands', () => {
    const run = quietRun();
    boss(run);
    const events: GameEvent[] = [];
    let warned = false;
    for (let i = 0; i < 60 * 20; i += 1) {
      events.push(...step(run, IDLE, TICK));
      if (run.hazards.length > 0) warned = true;
      // Nothing hurts before something was on the ground or a shot was flying.
      if (events.some((e) => e.type === 'hurt') && !warned) {
        expect(run.shots.some((s) => s.hostile)).toBe(true);
      }
    }
    expect(warned).toBe(true);
  });

  it('goes into a harder second phase at half health', () => {
    const run = quietRun();
    const b = boss(run);
    b.hp = 4900;
    const events = ticks(run, 2);
    expect(events.some((e) => e.type === 'bossPhase')).toBe(true);
    expect(b.phase2).toBe(true);
    expect(ticks(run, 60).some((e) => e.type === 'bossPhase')).toBe(false);
  });

  it('the final boss can rain blasts on the hero', () => {
    let rained = false;
    for (let seed = 0; seed < 10 && !rained; seed += 1) {
      const run = quietRun('lula', seed);
      boss(run, true);
      for (let i = 0; i < 60 * 20 && !rained; i += 1) {
        step(run, IDLE, TICK);
        rained = run.hazards.filter((h) => h.kind === 'blast' && h.radius < 3).length >= 8;
      }
    }
    expect(rained).toBe(true);
  });
});

describe('horde set pieces', () => {
  it('runs the horde events at their minutes: a ring, a stampede, a rain', () => {
    const run = createRun(4, 'janja');
    run.nextEliteAt = 1e9;
    const kinds: string[] = [];
    HORDE_EVENTS.slice(0, 3).forEach((ev) => {
      run.time = ev.at;
      const before = run.enemies.length;
      const events = step(run, IDLE, TICK);
      events.forEach((e) => {
        if (e.type === 'horde') kinds.push(e.kind);
      });
      if (ev.kind === 'ring') expect(run.enemies.length - before).toBeGreaterThanOrEqual(36);
      if (ev.kind === 'stampede') {
        expect(run.hazards.some((h) => h.kind === 'lane' && h.radius > 5)).toBe(true);
      }
      if (ev.kind === 'rain') expect(run.hazards.filter((h) => h.kind === 'blast').length).toBe(14);
      if (run.phase === 'choosing') run.phase = 'playing';
    });
    expect(kinds).toEqual(['ring', 'stampede', 'rain']);
  });
});

describe('horde map things and shrines', () => {
  it('starts with barrels and pots that weapons do not aim at', () => {
    const run = createRun(1, 'lula');
    expect(run.enemies.filter((e) => e.kind === 'barrel')).toHaveLength(12);
    expect(run.enemies.filter((e) => e.kind === 'pot')).toHaveLength(18);
  });

  it('a broken barrel blows up the enemies around it and is no kill; a pot drops gold', () => {
    const run = quietRun();
    const barrel = addEnemy(run, { kind: 'barrel', prop: true, x: 10, hp: 0, damage: 0 });
    const near = addEnemy(run, { x: 12, damage: 0 });
    step(run, IDLE, TICK);
    expect(near.hp).toBeLessThan(1e6);
    expect(run.kills).toBe(0);
    expect(run.enemies.includes(barrel)).toBe(false);
    addEnemy(run, { kind: 'pot', prop: true, x: 20, hp: 0, damage: 0 });
    step(run, IDLE, TICK);
    expect(run.pickups.filter((p) => p.kind === 'gold').length).toBeGreaterThanOrEqual(2);
  });

  const shrine = (run: RunState, kind: 'curse' | 'gold' | 'heal' | 'challenge') => {
    run.shrines.splice(0, run.shrines.length, {
      ...{ id: 0, x: 0, z: 0, charge: 0.999, used: false, kind },
    });
    return step(run, IDLE, TICK);
  };

  it('a cursed shrine makes the horde tougher for a minute, then gives a chest', () => {
    const run = quietRun();
    shrine(run, 'curse');
    expect(runStats(run).difficulty).toBeGreaterThan(0.5);
    run.time += CURSE_SECONDS;
    const events = step(run, IDLE, TICK);
    expect(events.some((e) => e.type === 'shrineDone' && e.kind === 'curse')).toBe(true);
    expect(run.pickups.some((p) => p.kind === 'chest')).toBe(true);
    expect(runStats(run).difficulty).toBe(0);
  });

  it('gold and heal shrines pay at once', () => {
    const gold = quietRun();
    shrine(gold, 'gold');
    expect(gold.gold).toBeGreaterThan(20);
    const heal = quietRun();
    heal.player.hp = 10;
    shrine(heal, 'heal');
    expect(heal.player.hp).toBe(heal.player.maxHp);
  });

  it('a challenge shrine pays a chest only if the kills come in time', () => {
    const won = quietRun();
    shrine(won, 'challenge');
    expect(won.challenge).toBeDefined();
    won.kills += won.challenge?.need ?? 0;
    const events = step(won, IDLE, TICK);
    expect(events.some((e) => e.type === 'shrineDone' && e.ok)).toBe(true);
    expect(won.pickups.some((p) => p.kind === 'chest')).toBe(true);

    const lost = quietRun();
    shrine(lost, 'challenge');
    lost.time += CHALLENGE_SECONDS;
    const failed = step(lost, IDLE, TICK);
    expect(failed.some((e) => e.type === 'shrineDone' && !e.ok)).toBe(true);
    expect(lost.pickups.some((p) => p.kind === 'chest')).toBe(false);
  });

  it('difficulty tiers add difficulty', () => {
    expect(runStats(createRun(1, 'lula', undefined, 2)).difficulty).toBeCloseTo(
      2 * TIER_DIFFICULTY
    );
  });
});
