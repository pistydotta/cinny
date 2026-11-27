import { describe, expect, it } from 'vitest';
import { createMatch, step } from './engine/match';
import { noteHighlight } from './engine/replay';
import { Highlight, MatchState, Replay } from './engine/types';
import { ReplayTape, TAPE_TICKS, replayMarks } from './replayTape';
import { localSource } from './source';

// The tape a replay is drawn from: the last seconds as they were, between ticks too.

const replayOf = (h: Highlight | undefined): Replay => {
  if (!h) throw new Error('no moment noted');
  return { ...h, t: 0, length: 10, skip: [false, false] };
};

const match = (): MatchState =>
  createMatch({
    seed: 3,
    teams: ['flamengo', 'palmeiras'],
    slots: [],
    halfMinutes: 2,
    difficulty: 'normal',
  });

describe('football replay tape', () => {
  it('gives back a tick as it was, and halfway between two', () => {
    const source = localSource(match());
    for (let k = 0; k < 600; k += 1) source.advance([]);
    const m = source.match;
    const a = source.tape.get(500);
    const b = source.tape.get(501);
    expect(a?.tick).toBe(500);
    const view = source.tape.view(m, 500.5) as MatchState;
    expect(view.ball.x).toBeCloseTo(((a?.ball.x ?? 0) + (b?.ball.x ?? 0)) / 2);
    expect(view.players[3].z).toBeCloseTo(((a?.players[3].z ?? 0) + (b?.players[3].z ?? 0)) / 2);
    // The live match is left as it is.
    expect(m.ball.x).not.toBe(view.ball.x);
    expect(view.phase).toBe('play');
  });

  it('forgets what is older than the tape and keeps no frozen ticks', () => {
    const tape = new ReplayTape();
    const m = match();
    for (let k = 0; k < TAPE_TICKS + 10; k += 1) {
      step(m, []);
      tape.record(m);
    }
    expect(tape.get(5)).toBeUndefined();
    expect(tape.get(m.tick)).toBeDefined();
    noteHighlight(m, 'goal', 9, 50, 0);
    m.replay = replayOf(m.highlight);
    m.tick += 1;
    tape.record(m);
    expect(tape.get(m.tick)).toBeUndefined();
  });

  it('marks the offside line and the end of the pitch', () => {
    const m = match();
    step(m, []);
    noteHighlight(m, 'offside', 9, 30, 0);
    const r = replayOf(m.highlight);
    const marks = replayMarks(r, m);
    // Side 0 attacks +x in the first half: the line is side 1's second player from its goal.
    expect(marks.end).toBe(1);
    const xs = m.players
      .filter((p) => p.side === 1 && !p.off)
      .map((p) => p.x)
      .sort((x, y) => y - x);
    expect(marks.line).toBe(xs[1]);
    expect(replayMarks({ ...r, kind: 'goal', x: -50 }, m)).toEqual({ end: -1, line: undefined });
  });
});
