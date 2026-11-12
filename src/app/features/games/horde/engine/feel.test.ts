import { describe, expect, it } from 'vitest';
import { MID_BOSS_AT, TICK } from './data';
import { createRun, step } from './run';
import { Input, RunState } from './types';

const IDLE: Input = { moveX: 0, moveZ: 0, jump: false, jumpHeld: false, dash: false };

const quietRun = (): RunState => {
  const run = createRun(1, 'lula');
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

describe('horde game feel', () => {
  it('pulled gems speed up on their way to the hero', () => {
    const run = quietRun();
    run.pickups.push({ id: 1, kind: 'xp', x: 2.9, z: 0, value: 1, pulled: false });
    run.pickups[0].x = 20;
    run.pickups[0].pulled = true;
    const gaps: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      const before = run.pickups[0].x;
      step(run, IDLE, TICK);
      gaps.push(before - run.pickups[0].x);
    }
    expect(gaps[9]).toBeGreaterThan(gaps[0] * 2);
  });

  it('a dead boss pulls every gem and coin on the map', () => {
    const run = quietRun();
    run.pickups.push({ id: 1, kind: 'xp', x: 60, z: 0, value: 1, pulled: false });
    run.pickups.push({ id: 2, kind: 'gold', x: -60, z: 0, value: 1, pulled: false });
    run.enemies.push({
      ...{ id: 900, kind: 'boss', elite: false, x: 30, z: 0, hp: 0, maxHp: 1000 },
      ...{ speed: 0, radius: 2.3, damage: 0, xp: 1, shootCd: 99, urnCd: 0 },
      ...{ pushX: 0, pushZ: 0, flash: 0 },
    });
    step(run, IDLE, TICK);
    const far = run.pickups.filter((p) => p.id === 1 || p.id === 2);
    expect(far.every((p) => p.pulled)).toBe(true);
  });

  it('the horde thins out for a few seconds when a boss arrives', () => {
    const spawned = (boss: boolean) => {
      const run = createRun(3, 'janja');
      run.time = MID_BOSS_AT - (boss ? 0.01 : 30);
      run.nextEliteAt = 1e9;
      run.nextHordeEvent = 99;
      run.nextPotsAt = 1e9;
      run.spawnBudget = 0;
      const before = run.enemies.length;
      for (let i = 0; i < 180; i += 1) step(run, IDLE, TICK);
      return run.enemies.length - before;
    };
    expect(spawned(true)).toBeLessThan(spawned(false) * 0.5);
  });
});
