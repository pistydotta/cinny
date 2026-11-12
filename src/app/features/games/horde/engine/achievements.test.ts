import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  isDone,
  lockedContent,
  masteryKills,
  masteryLevel,
  nearestAchievement,
} from './achievements';
import { TICK, xpToNext } from './data';
import { finishRun, newMeta, parseMeta, progressOf } from './meta';
import { choose, createRun, runStats, step } from './run';

describe('horde achievements', () => {
  it('a new player has some weapons and Boletos locked; a veteran has none', () => {
    const fresh = lockedContent(progressOf(newMeta()));
    expect(fresh).toContain('weapon:axe');
    expect(fresh).toContain('passive:curse');
    const veteran = {
      ...newMeta(),
      runs: 50,
      wins: 3,
      bestTime: 640,
      bestKills: 3000,
      bestLevel: 40,
      totalKills: 60000,
    };
    expect(lockedContent(progressOf(veteran))).toEqual([]);
  });

  it('never offers locked content, in level-ups, chests or shrines', () => {
    const locked = ['weapon:axe', 'weapon:trail', 'weapon:bolt', 'passive:luck'];
    for (let seed = 0; seed < 40; seed += 1) {
      const run = createRun(seed, 'lula', undefined, 0, { locked });
      run.pickups.push({ id: 1, kind: 'xp', x: 0, z: 0, value: xpToNext(1), pulled: false });
      step(run, { moveX: 0, moveZ: 0, jump: false, jumpHeld: false, dash: false }, TICK);
      run.choices?.forEach((c) => {
        if (c.kind === 'weapon') expect(['axe', 'trail', 'bolt']).not.toContain(c.id);
        if (c.kind === 'passive') expect(c.id).not.toBe('luck');
      });
      if (run.phase === 'choosing') choose(run, 0);
    }
  });

  it('counts a finished run into the totals per hero', () => {
    const run = createRun(1, 'janja');
    run.kills = 500;
    run.phase = 'won';
    run.tier = 2;
    const meta = finishRun(newMeta(), run);
    expect(meta.totalKills).toBe(500);
    expect(meta.heroes.janja).toEqual({ wins: 1, kills: 500 });
    expect(meta.bestTier).toBe(2);
    expect(parseMeta(JSON.stringify(meta))).toEqual(meta);
    const winJanja = ACHIEVEMENTS.find((a) => a.id === 'winJanja');
    expect(winJanja && isDone(winJanja, progressOf(meta))).toBe(true);
  });

  it('points at the unfinished achievement closest to done', () => {
    const meta = { ...newMeta(), runs: 9, bestTime: 100 };
    expect(nearestAchievement(progressOf(meta))?.id).toBe('runs10');
  });

  it('mastery grows with kills and gives a little damage and health', () => {
    expect(masteryLevel(0)).toBe(0);
    expect(masteryLevel(masteryKills(3))).toBe(3);
    expect(masteryLevel(masteryKills(3) - 1)).toBe(2);
    expect(masteryLevel(1e9)).toBe(10);
    const plain = runStats(createRun(1, 'eneas'));
    const master = runStats(createRun(1, 'eneas', undefined, 0, { mastery: 5 }));
    expect(master.damage).toBeCloseTo(plain.damage * 1.05);
    expect(master.maxHp).toBe(plain.maxHp + 10);
  });
});
