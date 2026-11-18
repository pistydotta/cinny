import { describe, expect, it } from 'vitest';
import { TICK, chestPrice } from './data';
import { blessingLevels, choose, createRun, step } from './run';
import { LEVEL, MAP_HALF, Obstacle, heightAt, highSpots, landSurvey, obstaclesOf } from './terrain';
import { Input, RunState } from './types';

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

// A cliff that faces west: level ground at its foot, and level ground a level higher a few steps
// to the east.
const findCliff = (run: RunState): { x: number; z: number; low: number; high: number } => {
  for (let z = -120; z <= 120; z += 2) {
    for (let x = -120; x <= 120; x += 1) {
      const low = heightAt(run.map, x, z);
      const high = heightAt(run.map, x + 6, z);
      const level = (at: number, h: number) => Math.abs(heightAt(run.map, at, z) - h) < 0.5;
      if (high - low > LEVEL * 0.8 && level(x - 3, low) && level(x + 9, high)) {
        return { x, z, low, high };
      }
    }
  }
  throw new Error('no cliff on this map');
};

describe('horde map', () => {
  it('is the same map for the same seed, and another for another seed', () => {
    expect(createRun(7, 'lula').map).toEqual(createRun(7, 'eneas').map);
    expect(createRun(8, 'lula').map).not.toEqual(createRun(7, 'lula').map);
  });

  it('has high and low ground, an open start, and nowhere the hero is stuck', () => {
    for (let seed = 1; seed <= 12; seed += 1) {
      const { map } = createRun(seed, 'lula');
      let highest = -Infinity;
      let lowest = Infinity;
      for (let x = -130; x <= 130; x += 5) {
        for (let z = -130; z <= 130; z += 5) {
          highest = Math.max(highest, heightAt(map, x, z));
          lowest = Math.min(lowest, heightAt(map, x, z));
        }
      }
      expect(highest).toBeGreaterThan(LEVEL * 1.5);
      expect(lowest).toBeLessThan(-LEVEL * 0.4);
      for (let x = -12; x <= 12; x += 3) {
        for (let z = -12; z <= 12; z += 3) expect(Math.abs(heightAt(map, x, z))).toBeLessThan(1.5);
      }
      const survey = landSurvey(map);
      expect(survey.traps).toBe(0);
      expect(survey.openShare).toBeGreaterThan(0.8);
    }
  });

  it('is the same land again from the numbers of a saved map', () => {
    const { map } = createRun(3, 'lula');
    const loaded = JSON.parse(JSON.stringify(map));
    for (let x = -140; x <= 140; x += 7) {
      expect(heightAt(loaded, x, x * 0.6)).toBe(heightAt(map, x, x * 0.6));
    }
  });

  it('stops the hero at a cliff, and lets it fall from the top', () => {
    const run = quietRun(6);
    const cliff = findCliff(run);
    standAt(run, cliff.x - 2, cliff.z);
    walk(run, 1, 0, 120);
    expect(run.player.x).toBeLessThan(cliff.x + 5);
    expect(run.player.y).toBeLessThan(cliff.low + LEVEL * 0.5);
    // From the top, walking west: off the edge, in the air for a moment, then on the ground below.
    standAt(run, cliff.x + 9, cliff.z);
    let fell = false;
    for (let i = 0; i < 300; i += 1) {
      step(run, { ...IDLE, moveX: -1 }, TICK);
      if (!run.player.grounded) fell = true;
      if (run.player.x < cliff.x - 2) break;
    }
    expect(fell).toBe(true);
    walk(run, 0, 0, 30);
    expect(run.player.y).toBeLessThan(cliff.low + 1);
  });

  it('grows trees and boulders that stop the hero, with room between them', () => {
    const run = quietRun();
    const obstacles = obstaclesOf(run.map);
    expect(obstacles.filter((o) => o.kind === 'tree').length).toBeGreaterThan(120);
    expect(obstacles.filter((o) => o.kind === 'rock').length).toBeGreaterThan(20);
    obstacles.forEach((a, i) => {
      expect(Math.hypot(a.x, a.z)).toBeGreaterThan(12);
      obstacles.slice(i + 1).forEach((b) => {
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(a.r + b.r + 3);
      });
    });
    // Shrines and chests stand clear of them.
    const spots = [...createRun(5, 'lula').shrines, ...run.chests];
    spots.forEach((s) =>
      obstacles.forEach((o) => expect(Math.hypot(s.x - o.x, s.z - o.z)).toBeGreaterThan(o.r + 1.5))
    );
    // Walking east into a tree: stopped at its trunk, then around it.
    const tree = obstacles.find((o) => o.kind === 'tree') as Obstacle;
    standAt(run, tree.x - tree.r - 2, tree.z);
    walk(run, 1, 0, 40);
    expect(Math.hypot(run.player.x - tree.x, run.player.z - tree.z)).toBeGreaterThan(tree.r + 0.49);
    expect(run.player.x).toBeLessThan(tree.x);
    standAt(run, tree.x - tree.r - 2, tree.z + 0.3);
    walk(run, 1, 0, 90);
    expect(run.player.x).toBeGreaterThan(tree.x + tree.r);
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
      const top = highSpots(run.map)[0];
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
