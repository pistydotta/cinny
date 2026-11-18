/* eslint-disable no-param-reassign */
import { describe, expect, it } from 'vitest';
import { TICK } from './data';
import { choose, createRun, runStats, step } from './run';
import { ITEMS, ITEM_IDS, ItemId, cameloPrice, itemBonuses } from './items';
import { Enemy, GameEvent, Input, RunState, ShrineKind } from './types';

const IDLE: Input = { moveX: 0, moveZ: 0, jump: false, jumpHeld: false, dash: false };

const quietRun = (seed = 1): RunState => {
  const run = createRun(seed, 'lula');
  run.spawnBudget = -1e9;
  run.nextEliteAt = 1e9;
  run.enemies = [];
  run.nextHordeEvent = 99;
  run.nextPotsAt = 1e9;
  run.weapons = [];
  run.chests = [];
  return run;
};

// One shrine of `kind` under the hero, and the others gone.
const standOn = (run: RunState, kind: ShrineKind) => {
  run.shrines = [{ id: 1, x: run.player.x, z: run.player.z, charge: 0, used: false, kind }];
};

const ticks = (run: RunState, n: number): GameEvent[] => {
  const events: GameEvent[] = [];
  for (let i = 0; i < n; i += 1) events.push(...step(run, IDLE, TICK));
  return events;
};

let nextId = 30000;
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

describe('horde items (Muambas)', () => {
  it('the Camelô sells only to who has the gold, then offers three different Muambas', () => {
    const run = quietRun();
    standOn(run, 'camelo');
    run.gold = cameloPrice(0) - 1;
    ticks(run, 60 * 5);
    expect(run.phase).toBe('playing');
    expect(run.shrines[0].used).toBe(false);
    run.gold = cameloPrice(0) + 5;
    ticks(run, 60 * 5);
    expect(run.phase).toBe('choosing');
    expect(run.gold).toBe(5);
    const offered = (run.choices ?? []).map((c) => (c.kind === 'item' ? c.id : undefined));
    expect(offered).toHaveLength(3);
    expect(new Set(offered).size).toBe(3);
    expect(choose(run, 0)).toBe(true);
    expect(run.items?.[offered[0] as ItemId]).toBe(1);
    expect(run.phase).toBe('playing');
    expect(cameloPrice(1)).toBeGreaterThan(cameloPrice(0));
  });

  it('the Agiota lends a rare or legendary Muamba for health and difficulty', () => {
    const run = quietRun();
    const before = runStats(run);
    standOn(run, 'agiota');
    const events = ticks(run, 60 * 5);
    const given = events.find((e) => e.type === 'item');
    expect(given).toBeDefined();
    if (given?.type !== 'item') return;
    expect(['rare', 'legendary']).toContain(ITEMS[given.id].rarity);
    expect(run.debt).toBe(1);
    const after = runStats(run);
    expect(after.difficulty).toBeCloseTo(before.difficulty + 0.1);
    // Max health loses 10%, after whatever the item itself adds.
    const without = { ...run, debt: 0 };
    expect(after.maxHp).toBeCloseTo(runStats(without).maxHp * 0.9);
  });

  it('copies stack: two of an item give twice its stats', () => {
    const one = quietRun();
    one.items = { whey: 1, lunchbox: 1 };
    const two = quietRun();
    two.items = { whey: 2, lunchbox: 2 };
    const base = runStats(quietRun());
    expect(runStats(one).damage).toBeCloseTo(base.damage * 1.1);
    expect(runStats(two).damage).toBeCloseTo(base.damage * 1.2);
    expect(runStats(two).maxHp - base.maxHp).toBeCloseTo(2 * (runStats(one).maxHp - base.maxHp));
    expect(itemBonuses(quietRun())).toEqual([]);
  });

  it('every item is defined, and every stat item adds what it says', () => {
    ITEM_IDS.forEach((id) => {
      expect(ITEMS[id]).toBeDefined();
      const run = quietRun();
      run.items = { [id]: 1 };
      expect(() => ticks(run, 30)).not.toThrow();
    });
  });

  it('the Jeitinho Brasileiro saves the hero once', () => {
    const run = quietRun();
    run.items = { jeitinho: 1 };
    run.player.hp = 1;
    addEnemy(run, { x: 0.2, damage: 50, speed: 0 });
    const events = ticks(run, 60);
    expect(events.some((e) => e.type === 'jeitinho')).toBe(true);
    expect(run.phase).toBe('playing');
    expect(run.items?.jeitinho).toBe(0);
    run.player.hp = 1;
    run.player.invuln = 0;
    run.buffs.freeze = 0;
    ticks(run, 120);
    expect(run.phase).toBe('dead');
  });

  it('item blasts never chain and are capped each tick', () => {
    const run = quietRun();
    run.items = { pepper: 4, blackout: 4 };
    run.weapons = [{ id: 'aura', level: 6, cooldown: 0, angle: 0 }];
    for (let i = 0; i < 40; i += 1) addEnemy(run, { x: Math.cos(i) * 2, z: Math.sin(i) * 2 });
    const events = ticks(run, 60);
    expect(events.some((e) => e.type === 'itemBlast')).toBe(true);
    // The aura's hits fire at most 12 blasts a tick, and blasts never fire blasts.
    for (let i = 0; i < 10; i += 1) {
      const one = step(run, IDLE, TICK).filter((e) => e.type === 'itemBlast').length;
      expect(one).toBeLessThanOrEqual(12);
    }
  });

  it('the Gambiarra rolls three stats on each weapon level', () => {
    const run = quietRun();
    run.items = { gambiarra: 1 };
    run.weapons = [{ id: 'axe', level: 2, cooldown: 0, angle: 0 }];
    run.passives = [];
    for (let i = 0; i < 30; i += 1) {
      run.pendingChoices += 1;
      ticks(run, 1);
      const index = run.choices?.findIndex((c) => c.kind === 'weapon' && c.level > 1) ?? -1;
      if (index >= 0) {
        const offer = run.choices?.[index];
        expect(offer?.kind === 'weapon' && offer.bonuses).toHaveLength(3);
        return;
      }
      choose(run, 0);
    }
    throw new Error('no weapon level offered');
  });

  it('a Treta shrine adds 15% difficulty until the end, and the map has many to choose', () => {
    const full = createRun(4, 'lula');
    expect(full.shrines.filter((sh) => sh.kind === 'treta').length).toBeGreaterThanOrEqual(4);
    expect(full.shrines.filter((sh) => sh.kind === 'camelo').length).toBeGreaterThanOrEqual(3);
    expect(full.chests.length).toBeGreaterThanOrEqual(14);
    const run = quietRun();
    const before = runStats(run).difficulty;
    standOn(run, 'treta');
    ticks(run, 60 * 5);
    expect(run.tretas).toBe(1);
    expect(runStats(run).difficulty).toBeCloseTo(before + 0.15);
    ticks(run, 60 * 30);
    expect(runStats(run).difficulty).toBeCloseTo(before + 0.15);
  });
});
