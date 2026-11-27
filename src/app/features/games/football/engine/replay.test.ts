import { describe, expect, it } from 'vitest';
import { REPLAY_AFTER, REPLAY_STALE, REPLAY_TAKES } from './data';
import { createMatch, step } from './match';
import { hashMatch } from './net';
import { noteHighlight, replayDue, replayLength, replayShot } from './replay';
import { sceneHolds } from './scenes';
import { Input, MatchSetup, MatchState, NO_INPUT, ReplayKind } from './types';

// Replays: the moment is shown again once the ball is dead, the match standing still meanwhile,
// the same on every copy; people skip it with pass or shoot.

const setup = (seed: number, over: Partial<MatchSetup> = {}): MatchSetup => ({
  seed,
  teams: ['flamengo', 'palmeiras'],
  slots: [],
  halfMinutes: 2,
  difficulty: 'normal',
  ...over,
});

const idle = (m: MatchState): Input[] => m.people.map(() => NO_INPUT);

// What a frozen match must keep: everything but the tick and the replay's own count.
const still = (m: MatchState) => hashMatch({ ...m, tick: 0, replay: undefined });

// A match that has just noted a moment, waiting at its first restart.
const waiting = (slots: MatchSetup['slots'], kind: ReplayKind = 'foul'): MatchState => {
  const m = createMatch(setup(5, { slots }));
  step(m, idle(m));
  noteHighlight(m, kind, 9, 0, 0);
  return m;
};

describe('football replays', () => {
  it('shows a goal again after the celebration, standing still meanwhile', () => {
    const m = createMatch(setup(2));
    while (m.phase !== 'over' && !m.events.some((e) => e.type === 'goal')) step(m, []);
    expect(m.phase).toBe('goal');
    const at = m.tick;
    expect(m.highlight?.kind).toBe('goal');
    while (!m.replay) step(m, []);
    expect(m.phase).toBe('goal');
    expect(m.replay.at).toBe(at);
    expect(m.replay.length).toBe(replayLength(m.replay));
    const frozen = still(m);
    const { clock } = m;
    // The tick it started was its first.
    for (let k = 1; k < m.replay.length - 1; k += 1) {
      step(m, []);
      expect(still(m)).toBe(frozen);
    }
    expect(m.clock).toBe(clock);
    step(m, []);
    expect(m.replay).toBeUndefined();
    expect(m.events).toContainEqual({ type: 'replay', kind: 'goal', stage: 'end' });
    step(m, []);
    expect(m.phase).toBe('restart');
    expect(m.restart?.kind).toBe('kickoff');
  });

  it('starts a replay only once the moment has played out and the ball is dead', () => {
    const m = createMatch(setup(11, { halfMinutes: 4 }));
    const kinds = new Set<ReplayKind>();
    while (m.phase !== 'over') {
      step(m, []);
      const start = m.events.find((e) => e.type === 'replay' && e.stage === 'start');
      if (start && m.replay) {
        kinds.add(m.replay.kind);
        expect(['goal', 'restart']).toContain(m.phase);
        expect(sceneHolds(m)).toBe(false);
        const last = REPLAY_TAKES[m.replay.kind].reduce((a, t) => Math.max(a, t.after), 0);
        expect(m.replay.at + last).toBeLessThan(m.tick);
        expect(m.replay.floor).toBeLessThanOrEqual(m.replay.at);
      }
    }
    expect(kinds.size).toBeGreaterThan(1);
  });

  it('waits REPLAY_AFTER into a stoppage, and nobody can skip a CPU match', () => {
    const m = waiting([]);
    const from = m.tick;
    while (!m.replay) step(m, []);
    expect(m.tick - from).toBe(REPLAY_AFTER + 1);
    let ticks = 1;
    while (m.replay) {
      step(m, []);
      ticks += 1;
    }
    expect(ticks).toBe(replayLength({ kind: 'foul', at: from, floor: 0 }));
  });

  it('ends at once when the only person presses pass', () => {
    const m = waiting([0]);
    while (!m.replay) step(m, idle(m));
    step(m, idle(m));
    step(m, [{ ...NO_INPUT, pass: true }]);
    expect(m.replay).toBeUndefined();
    expect(m.replayEnd).toBe(m.tick);
  });

  it('needs every side with people to skip, and a held button is no press', () => {
    const m = waiting([0, 1]);
    while (!m.replay) step(m, idle(m));
    step(m, [{ ...NO_INPUT, shoot: true }, NO_INPUT]);
    expect(m.replay?.skip).toEqual([true, false]);
    step(m, [{ ...NO_INPUT, shoot: true }, NO_INPUT]);
    expect(m.replay).toBeDefined();
    step(m, [NO_INPUT, { ...NO_INPUT, pass: true }]);
    expect(m.replay).toBeUndefined();
  });

  it('a copy taken in the middle of a replay steps on the same (rollback)', () => {
    const m = createMatch(setup(2));
    while (!m.replay && m.phase !== 'over') step(m, []);
    for (let k = 0; k < 100; k += 1) step(m, []);
    const copy = structuredClone(m);
    for (let k = 0; k < 900; k += 1) {
      step(m, []);
      step(copy, []);
    }
    expect(hashMatch(copy)).toBe(hashMatch(m));
  });

  it('forgets a moment play ran on from, and one before half time', () => {
    const m = waiting([]);
    m.phase = 'play';
    m.tick += REPLAY_STALE + 1;
    expect(replayDue(m)).toBe(false);
    expect(m.highlight).toBeUndefined();
    noteHighlight(m, 'save', 1, 50, 0);
    m.phase = 'halftime';
    expect(replayDue(m)).toBe(false);
    expect(m.highlight).toBeUndefined();
  });

  it('plays its takes in order, slow ones stretched, never before the last replay', () => {
    const r = { kind: 'goal' as const, at: 1000, floor: 0 };
    const [wide, close] = REPLAY_TAKES.goal;
    expect(replayShot(r, 0)).toMatchObject({ take: 0, cam: wide.cam, tick: 1000 - wide.before });
    const firstSpan = wide.before + wide.after;
    expect(replayShot(r, firstSpan - 1).tick).toBe(1000 + wide.after - 1);
    const second = replayShot(r, firstSpan + close.slow * 10);
    expect(second).toMatchObject({ take: 1, cam: close.cam, slow: close.slow });
    expect(second.tick).toBe(1000 - close.before + 10);
    expect(replayShot(r, replayLength(r)).tick).toBe(1000 + close.after);
    // A replay that ended 100 ticks before the moment: nothing older is shown.
    const near = { ...r, floor: 900 };
    expect(replayShot(near, 0).tick).toBe(900);
    expect(replayLength(near)).toBeLessThan(replayLength(r));
  });
});
