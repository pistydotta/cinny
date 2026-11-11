import { describe, expect, it } from 'vitest';
import { playBot } from './bot';
import { TICK, metaCost, xpToNext } from './data';
import { buyMeta, finishRun, newMeta, parseMeta, runGold } from './meta';
import { choose, createRun, reroll, step } from './run';
import { RunState } from './types';

const IDLE = { moveX: 0, moveZ: 0, dash: false };

const summary = (s: RunState) => ({
  time: s.time,
  phase: s.phase,
  kills: s.kills,
  level: s.player.level,
  hp: s.player.hp,
  x: s.player.x,
  z: s.player.z,
  enemies: s.enemies.length,
});

describe('horde run', () => {
  it('gives the same run for the same seed and inputs', () => {
    const a = playBot(createRun(42, 'lula'), 1, 90);
    const b = playBot(createRun(42, 'lula'), 1, 90);
    expect(summary(a)).toEqual(summary(b));
    const c = playBot(createRun(43, 'lula'), 1, 90);
    expect(summary(c)).not.toEqual(summary(a));
  });

  it('kills a player who stands still', () => {
    const run = playBot(createRun(7, 'bolsonaro'), 0, 600);
    expect(run.phase).toBe('dead');
    expect(run.time).toBeLessThan(240);
  });

  it('stops for a choice on level up and applies it', () => {
    const run = createRun(1, 'lula');
    run.pickups.push({ id: 999, kind: 'xp', x: 0, z: 0, value: xpToNext(1), pulled: false });
    step(run, IDLE, TICK);
    expect(run.phase).toBe('choosing');
    expect(run.choices).toHaveLength(3);
    const timeBefore = run.time;
    step(run, IDLE, TICK);
    expect(run.time).toBe(timeBefore);
    const picked = run.choices?.[0];
    expect(choose(run, 0)).toBe(true);
    expect(run.phase).toBe('playing');
    if (picked?.kind === 'weapon') {
      expect(run.weapons.find((w) => w.id === picked.id)?.level).toBe(picked.level);
    } else if (picked?.kind === 'passive') {
      expect(run.passives.find((p) => p.id === picked.id)?.level).toBe(picked.level);
    }
  });

  it('rerolls only while there are rerolls left', () => {
    const run = createRun(1, 'lula', { ...newMeta().upgrades, reroll: 1 });
    run.pendingChoices = 1;
    step(run, IDLE, TICK);
    expect(reroll(run)).toBe(true);
    expect(reroll(run)).toBe(false);
  });

  it('never offers more than four weapons or four passives', () => {
    const run = playBot(createRun(5, 'janja'), 1, 400);
    expect(run.weapons.length).toBeLessThanOrEqual(4);
    expect(run.passives.length).toBeLessThanOrEqual(4);
  });

  it('keeps everything inside the arena', () => {
    const run = createRun(3, 'bolsonaro');
    for (let i = 0; i < 60 * 30; i += 1) {
      if (run.phase === 'choosing') choose(run, 0);
      step(run, { moveX: 1, moveZ: 0, dash: i % 200 === 0 }, TICK);
    }
    expect(Math.hypot(run.player.x, run.player.z)).toBeLessThanOrEqual(70);
  });
});

describe('horde meta', () => {
  it('buys upgrades with gold and stops at the cap', () => {
    let meta = { ...newMeta(), gold: metaCost('reroll', 0) };
    const bought = buyMeta(meta, 'reroll');
    expect(bought?.upgrades.reroll).toBe(1);
    expect(bought?.gold).toBe(0);
    expect(buyMeta(bought ?? meta, 'reroll')).toBeUndefined();
    meta = { ...meta, gold: 1e9, upgrades: { ...meta.upgrades, reroll: 3 } };
    expect(buyMeta(meta, 'reroll')).toBeUndefined();
  });

  it('pays the run and keeps the records', () => {
    const run = playBot(createRun(9, 'lula'), 1, 60);
    const meta = finishRun(newMeta(), run);
    expect(meta.gold).toBe(runGold(run));
    expect(meta.runs).toBe(1);
    expect(meta.bestKills).toBe(run.kills);
  });

  it('reads a saved game back and ignores a broken one', () => {
    const meta = { ...newMeta(), gold: 12, character: 'janja' as const };
    expect(parseMeta(JSON.stringify(meta))).toEqual(meta);
    expect(parseMeta('{oops')).toEqual(newMeta());
    expect(parseMeta(JSON.stringify({ ...meta, character: 'pyro' })).character).toBe('eneas');
    expect(parseMeta(JSON.stringify({ ...meta, character: 'lula' })).character).toBe('lula');
    expect(parseMeta(JSON.stringify({ version: 1, gold: -5, upgrades: { reroll: 99 } }))).toEqual({
      ...newMeta(),
      upgrades: { ...newMeta().upgrades, reroll: 3 },
    });
  });
});
