import { describe, expect, it } from 'vitest';
import { MOVE, TICK } from './data';
import { createRun, runStats, step } from './run';
import { heightAt } from './terrain';
import { GameEvent, Input, RunState } from './types';

const IDLE: Input = { moveX: 0, moveZ: 0, jump: false, jumpHeld: false, dash: false };

// A run with no enemies coming, so only the movement counts.
const quietRun = (): RunState => {
  const run = createRun(1, 'lula');
  run.spawnBudget = -1e9;
  run.nextEliteAt = 1e9;
  run.shrines = [];
  return run;
};

const speedOf = (run: RunState) => Math.hypot(run.player.vx, run.player.vz);

// Runs forward on the ground until at full speed.
const runUp = (run: RunState) => {
  for (let i = 0; i < 60; i += 1) step(run, { ...IDLE, moveZ: -1 }, TICK);
};

// Hops for `seconds`, strafing at a right angle to the velocity (what a player does by holding a
// side key and turning the camera with it). `late` presses jump that many ticks after landing.
const hop = (run: RunState, seconds: number, late = 0) => {
  let sinceLanding = -1;
  for (let i = 0; i < seconds * 60; i += 1) {
    const { vx, vz } = run.player;
    const len = Math.hypot(vx, vz) || 1;
    const onGround = run.player.grounded;
    if (onGround && sinceLanding < 0) sinceLanding = 0;
    const press = i === 0 || (onGround && sinceLanding === late);
    const events = step(
      run,
      { moveX: -vz / len, moveZ: vx / len, jump: press, jumpHeld: press, dash: false },
      TICK
    );
    if (events.some((e) => e.type === 'jump')) sinceLanding = -1;
    else if (sinceLanding >= 0) sinceLanding += 1;
  }
};

describe('horde movement', () => {
  it('jumps on a press and lands back on the ground', () => {
    const run = quietRun();
    const events: GameEvent[] = [];
    events.push(...step(run, { ...IDLE, jump: true, jumpHeld: true }, TICK));
    expect(run.player.grounded).toBe(false);
    let top = 0;
    for (let i = 0; i < 120; i += 1) {
      events.push(...step(run, { ...IDLE, jumpHeld: true }, TICK));
      top = Math.max(top, run.player.y - heightAt(run.player.x, run.player.z));
    }
    expect(top).toBeGreaterThan(1.8);
    expect(run.player.grounded).toBe(true);
    expect(events.filter((e) => e.type === 'jump')).toHaveLength(1);
    expect(events.filter((e) => e.type === 'land')).toHaveLength(1);
  });

  it('jumps lower on a tap than when the key is held', () => {
    const height = (held: boolean) => {
      const run = quietRun();
      step(run, { ...IDLE, jump: true, jumpHeld: true }, TICK);
      let top = 0;
      for (let i = 0; i < 60; i += 1) {
        step(run, { ...IDLE, jumpHeld: held }, TICK);
        top = Math.max(top, run.player.y - heightAt(run.player.x, run.player.z));
      }
      return top;
    };
    expect(height(false)).toBeLessThan(height(true) * 0.6);
  });

  it('never jumps again while the key is only held', () => {
    const run = quietRun();
    let jumps = 0;
    for (let i = 0; i < 240; i += 1) {
      const events = step(run, { ...IDLE, jump: i === 0, jumpHeld: true }, TICK);
      jumps += events.filter((e) => e.type === 'jump').length;
    }
    expect(jumps).toBe(1);
  });

  it('counts a press made just before landing', () => {
    const run = quietRun();
    step(run, { ...IDLE, jump: true, jumpHeld: true }, TICK);
    let jumps = 0;
    let pressed = false;
    for (let i = 0; i < 120; i += 1) {
      const lift = run.player.y - heightAt(run.player.x, run.player.z);
      // Pressed once on the way down, a few ticks before touching the ground.
      const press: boolean =
        !run.player.grounded && run.player.vy < 0 && lift < 0.45 && lift > 0.2 && !pressed;
      pressed = pressed || press;
      const events = step(run, { ...IDLE, jump: press, jumpHeld: press }, TICK);
      jumps += events.filter((e) => e.type === 'jump').length;
      if (press) expect(events.some((e) => e.type === 'jump')).toBe(false);
    }
    expect(jumps).toBe(1);
  });

  it('gains speed hopping in time while strafing, and loses it jumping late', () => {
    const base = runStats(quietRun()).speed;
    const timed = quietRun();
    runUp(timed);
    hop(timed, 4);
    expect(speedOf(timed)).toBeGreaterThan(base * 1.5);

    const late = quietRun();
    runUp(late);
    hop(late, 4, 20);
    expect(speedOf(late)).toBeLessThan(base * 1.15);
  });

  it('caps the speed', () => {
    const run = quietRun();
    runUp(run);
    hop(run, 20);
    expect(speedOf(run)).toBeLessThanOrEqual(runStats(run).speed * MOVE.maxSpeed + 1e-9);
    run.player.vx = 500;
    step(run, IDLE, TICK);
    expect(speedOf(run)).toBeLessThanOrEqual(runStats(run).speed * MOVE.maxSpeed + 1e-9);
  });

  it('dashes in the air and keeps only the speed it had', () => {
    const run = quietRun();
    runUp(run);
    const before = speedOf(run);
    step(run, { ...IDLE, moveZ: -1, jump: true, jumpHeld: true }, TICK);
    const events = step(run, { ...IDLE, moveZ: -1, jumpHeld: true, dash: true }, TICK);
    expect(events.some((e) => e.type === 'dash')).toBe(true);
    expect(speedOf(run)).toBeGreaterThan(before * 2);
    for (let i = 0; i < 20; i += 1) step(run, { ...IDLE, moveZ: -1, jumpHeld: true }, TICK);
    expect(speedOf(run)).toBeLessThanOrEqual(before + 1e-9);
  });

  it('jumps over a low enemy and its shots', () => {
    const run = quietRun();
    run.weapons = [];
    run.enemies.push({
      ...{ id: 9001, kind: 'runner', elite: false, x: 0, z: 0, hp: 50, maxHp: 50 },
      ...{ speed: 0, radius: 0.45, damage: 10, xp: 1, shootCd: 9, urnCd: 0 },
      ...{ pushX: 0, pushZ: 0, flash: 0 },
    });
    // Up in the air before the enemy is there, then nothing touches the hero.
    run.enemies[0].x = 100;
    step(run, { ...IDLE, jump: true, jumpHeld: true }, TICK);
    for (let i = 0; i < 12; i += 1) step(run, { ...IDLE, jumpHeld: true }, TICK);
    run.enemies[0].x = run.player.x + 0.3;
    run.enemies[0].z = run.player.z;
    const { hp } = run.player;
    step(run, { ...IDLE, jumpHeld: true }, TICK);
    expect(run.player.hp).toBe(hp);
    for (let i = 0; i < 60; i += 1) step(run, IDLE, TICK);
    expect(run.player.hp).toBeLessThan(hp);
  });
});
