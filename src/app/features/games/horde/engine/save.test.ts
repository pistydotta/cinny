import { describe, expect, it } from 'vitest';
import { playFighter } from './fighter';
import { createRun } from './run';
import { loadRun, saveRun } from './save';
import { RunState } from './types';

const summary = (run: RunState) => ({
  time: run.time,
  kills: run.kills,
  level: run.player.level,
  hp: run.player.hp,
  x: run.player.x,
  enemies: run.enemies.length,
  gold: run.gold,
});

describe('horde saved runs', () => {
  it('picks a run up exactly where it was', () => {
    const run = playFighter(createRun(11, 'janja'), 90);
    const copy = loadRun(saveRun(run));
    expect(copy?.resumed).toBe(true);
    const original = playFighter(run, 150);
    const resumed = playFighter(copy as RunState, 150);
    expect(summary(resumed)).toEqual(summary(original));
  });

  it('ignores a broken save, a finished run and one from another version', () => {
    expect(loadRun('{oops')).toBeUndefined();
    expect(loadRun(null)).toBeUndefined();
    const run = createRun(1, 'lula');
    run.phase = 'dead';
    expect(loadRun(saveRun(run))).toBeUndefined();
    const old = JSON.parse(saveRun(createRun(1, 'lula')));
    old.version = 1;
    expect(loadRun(JSON.stringify(old))).toBeUndefined();
  });
});
