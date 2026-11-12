import { describe, expect, it } from 'vitest';
import { TICK, chestPrice } from './data';
import { blessingLevels, choose, createRun, step } from './run';
import { MAP_HALF, heightAt, mesaTops } from './terrain';
import { Input, Mesa, Ramp, RunState } from './types';

const IDLE: Input = { moveX: 0, moveZ: 0, jump: false, jumpHeld: false, dash: false };

// A run with nothing else going on: no horde, no shrines, no props.
const quietRun = (seed = 5): RunState => {
  const run = createRun(seed, 'lula');
  run.spawnBudget = -1e9;
  run.nextEliteAt = 1e9;
  run.shrines = [];
  run.enemies = [];
  run.nextHordeEvent = 99;
  run.nextPotsAt = 1e9;
  run.weapons = [];
  return run;
};

// Puts the hero at (x, z) on the ground, standing still.
const standAt = (run: RunState, x: number, z: number) => {
  Object.assign(run.player, { x, z, y: heightAt(run.map, x, z), vx: 0, vz: 0, vy: 0 });
  Object.assign(run.player, { grounded: true });
};

const walk = (run: RunState, moveX: number, moveZ: number, ticks: number, jump = false) => {
  for (let i = 0; i < ticks; i += 1) {
    step(run, { ...IDLE, moveX, moveZ, jump: jump && i % 20 === 0, jumpHeld: jump }, TICK);
  }
};

const bigMesa = (run: RunState): Mesa =>
  run.map.mesas.find((m) => m.kind === 'mesa' && m.w >= 8 && m.d >= 8) as Mesa;

describe('horde map', () => {
  it('is the same map for the same seed, and another for another seed', () => {
    expect(createRun(7, 'lula').map).toEqual(createRun(7, 'eneas').map);
    expect(createRun(8, 'lula').map).not.toEqual(createRun(7, 'lula').map);
  });

  it('has mesas with ramps, ledges and pillars, and an open start', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const { map } = createRun(seed, 'lula');
      expect(map.mesas.filter((m) => m.kind === 'mesa').length).toBeGreaterThanOrEqual(4);
      expect(map.mesas.filter((m) => m.kind === 'ledge').length).toBeGreaterThanOrEqual(6);
      expect(map.ramps.length).toBeGreaterThanOrEqual(4);
      for (let x = -12; x <= 12; x += 3) {
        for (let z = -12; z <= 12; z += 3) expect(heightAt(map, x, z)).toBeLessThan(1.2);
      }
    }
  });

  it('stops the hero at a cliff', () => {
    const run = quietRun();
    const mesa = bigMesa(run);
    // West of the mesa, beside the middle of its side, walking east into it.
    const z = mesa.z + mesa.d * 0.5;
    standAt(run, mesa.x - mesa.w - 4, z);
    walk(run, 1, 0, 120);
    expect(run.player.x).toBeLessThan(mesa.x - mesa.w + 0.1);
    expect(run.player.y).toBeLessThan(1.5);
  });

  it('walks up a ramp onto the mesa', () => {
    const run = quietRun();
    // The first ramp is a big mesa's, from the ground.
    const [ramp] = run.map.ramps as [Ramp];
    const length = Math.hypot(ramp.x2 - ramp.x1, ramp.z2 - ramp.z1);
    const dx = (ramp.x2 - ramp.x1) / length;
    const dz = (ramp.z2 - ramp.z1) / length;
    standAt(run, ramp.x1 - dx * 3, ramp.z1 - dz * 3);
    walk(run, dx, dz, 60 * 4);
    expect(run.player.y).toBeGreaterThan(ramp.h2 - 0.3);
    expect(run.player.grounded).toBe(true);
  });

  it('jumps onto a low ledge, and falls off its edge', () => {
    const run = quietRun();
    const ledge = run.map.mesas.find((m) => m.kind === 'ledge' && m.w >= 3) as Mesa;
    standAt(run, ledge.x - ledge.w - 3, ledge.z);
    walk(run, 1, 0, 60);
    // Walking alone doesn't climb it.
    expect(run.player.y).toBeLessThan(ledge.h - 0.5);
    walk(run, 1, 0, 50, true);
    expect(run.player.y).toBeGreaterThan(ledge.h - 0.3);
    // Off the far side: in the air for a moment, then on the ground below.
    walk(run, 0, 0, 30);
    let fell = false;
    for (let i = 0; i < 300; i += 1) {
      step(run, { ...IDLE, moveX: 1 }, TICK);
      if (!run.player.grounded) fell = true;
      if (run.player.x > ledge.x + ledge.w + 2) break;
    }
    expect(fell).toBe(true);
    walk(run, 0, 0, 30);
    expect(run.player.y).toBeLessThan(ledge.h - 0.8);
  });

  it('keeps the hero inside the square', () => {
    const run = quietRun();
    standAt(run, 0, 0);
    walk(run, 0, 1, 60 * 20);
    expect(run.player.z).toBeLessThan(MAP_HALF);
  });

  it('puts the best rewards on the high tops', () => {
    for (let seed = 1; seed <= 10; seed += 1) {
      const run = createRun(seed, 'lula');
      const top = mesaTops(run.map)[0];
      const near = (x: number, z: number) => Math.hypot(x - top.x, z - top.z) < 4;
      expect(run.shrines.some((s) => s.kind === 'blessing' && near(s.x, s.z))).toBe(true);
      expect(run.chests.length).toBeGreaterThanOrEqual(6);
    }
  });
});

describe('horde map chests', () => {
  it('opens for gold when stood on, each one dearer', () => {
    const run = quietRun();
    const [first, second] = run.chests;
    standAt(run, first.x, first.z);
    walk(run, 0, 0, 120);
    // No gold: nothing happens.
    expect(first.opened).toBe(false);
    run.gold = 100;
    const bought: number[] = [];
    const watch = (ticks: number) => {
      for (let i = 0; i < ticks; i += 1) {
        step(run, IDLE, TICK).forEach((e) => e.type === 'chestBuy' && bought.push(e.price));
      }
    };
    watch(60);
    expect(first.opened).toBe(true);
    expect(run.phase).toBe('chest');
    expect(chestPrice(1)).toBeGreaterThan(chestPrice(0));
    run.phase = 'playing';
    run.chest = undefined;
    run.gold = 100;
    standAt(run, second.x, second.z);
    watch(60);
    expect(bought).toEqual([chestPrice(0), chestPrice(1)]);
    expect(run.chestsBought).toBe(2);
  });
});

describe('horde blessing totems', () => {
  it('may offer rare and epic blessings worth more levels', () => {
    const seen = new Set<string | undefined>();
    for (let seed = 1; seed <= 40; seed += 1) {
      const run = quietRun(seed);
      run.pendingBlessings = 1;
      step(run, IDLE, TICK);
      run.choices?.forEach((c) => seen.add(c.kind === 'blessing' ? c.rarity : 'other'));
      const choice = run.choices?.[0];
      if (choice?.kind === 'blessing') {
        const before = run.blessings[choice.id] ?? 0;
        choose(run, 0);
        expect(run.blessings[choice.id]).toBe(before + blessingLevels(choice));
      }
    }
    expect(seen.has(undefined)).toBe(true);
    expect(seen.has('rare')).toBe(true);
    expect(seen.has('epic')).toBe(true);
  });
});
