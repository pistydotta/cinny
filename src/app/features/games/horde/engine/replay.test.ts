import { describe, expect, it } from 'vitest';
import { playRecorded, recordedReport } from './recorded';
import { decodeLog, encodeLog, runFrom, startOf } from './replay';
import { replayRun, verifyReplay } from './replayCheck';
import { createRun } from './run';
import { loadRun, saveRun } from './save';
import { CharacterId, RunState } from './types';

const summary = (run: RunState) => ({
  tick: run.tick,
  phase: run.phase,
  kills: run.kills,
  level: run.player.level,
  hp: run.player.hp,
  gold: run.gold,
  x: run.player.x,
});

const play = (hero: CharacterId, seed: number, seconds: number) => {
  const run = createRun(seed, hero);
  const start = startOf(run);
  return { start, run: playRecorded(run, seconds) };
};

describe('horde replays', () => {
  it('plays a recorded run again to the very same state', () => {
    const { start, run } = play('lula', 5, 150);
    const log = decodeLog(encodeLog(run.replay?.log ?? []));
    const again = replayRun(start, log ?? [], run.tick);
    expect(again.ok).toBe(true);
    expect(summary(again.run)).toEqual(summary(run));
  });

  it('keeps a whole run short', () => {
    const { run } = play('janja', 2, 300);
    // The bot turns every tick, more than a person does: an upper bound.
    expect(encodeLog(run.replay?.log ?? []).length).toBeLessThan(90000);
  });

  it('still replays after the run was saved and picked up in the middle', () => {
    const run = createRun(8, 'eneas');
    const start = startOf(run);
    playRecorded(run, 60);
    const resumed = loadRun(saveRun(run)) as RunState;
    playRecorded(run, 120);
    playRecorded(resumed, 120);
    expect(summary(resumed)).toEqual(summary(run));
    const again = replayRun(start, resumed.replay?.log ?? [], resumed.tick);
    expect(summary(again.run)).toEqual(summary(resumed));
  });

  it('notices a log that was tampered with', () => {
    const { start, run } = play('bolsonaro', 3, 90);
    const log = [...(run.replay?.log ?? [])];
    // A choice slipped in where nothing was offered.
    log.splice(2, 0, 0, 1);
    expect(replayRun(start, log, run.tick).ok).toBe(false);
    expect(decodeLog('@@')).toBeUndefined();
  });

  it('starts from the same state as the run did', () => {
    const run = createRun(77, 'janja', undefined, 2, { locked: ['weapon:axe'], mastery: 3 });
    expect(saveRun(runFrom(startOf(run)))).toEqual(saveRun(run));
  });

  it('checks a report against its replay', () => {
    const report = recordedReport(4, 'lula', 60);
    expect(verifyReplay(report.replay, report)).toEqual({ ok: true });
    expect(verifyReplay(report.replay, { ...report, kills: report.kills + 1 }).ok).toBe(false);
    expect(verifyReplay(report.replay, { ...report, seed: 5 }).ok).toBe(false);
  });
});
