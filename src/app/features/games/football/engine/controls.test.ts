/* eslint-disable no-param-reassign */
import { describe, expect, it } from 'vitest';
import { createMatch, step } from './match';
import { HALF_LENGTH } from './data';
import { Input, MatchState, NO_INPUT } from './types';

// A person's controls in open play, from positions set up by hand.

const live = (): MatchState => {
  const m = createMatch({
    seed: 3,
    teams: ['brasil', 'argentina'],
    humans: [true, false],
    halfMinutes: 4,
    difficulty: 'normal',
  });
  m.phase = 'play';
  m.restart = undefined;
  m.wait = 0;
  // Everyone out of the way, at their own end.
  m.players.forEach((p, i) => {
    p.x = p.side === 0 ? -30 - i : 30 + i;
    p.z = (i % 11) * 5 - 25;
    p.vx = 0;
    p.vz = 0;
  });
  return m;
};

const hold = (m: MatchState, input: Input, ticks: number) => {
  for (let k = 0; k < ticks; k += 1) step(m, [input, NO_INPUT]);
};

describe('football controls', () => {
  it('plays a pass pressed while the ball was still coming', () => {
    const m = live();
    const me = 9;
    Object.assign(m.players[me], { x: 0, z: 0, face: 0 });
    Object.assign(m.players[5], { x: 12, z: 0 });
    Object.assign(m.ball, { x: -6, z: 0, vx: 9, vz: 0, owner: -1, target: me, lastSide: 0 });
    m.control[0] = me;
    step(m, [{ ...NO_INPUT, mx: 100, pass: true }, NO_INPUT]);
    expect(m.ball.owner).toBe(-1);
    let passed = false;
    for (let k = 0; k < 60 && !passed; k += 1) {
      step(m, [NO_INPUT, NO_INPUT]);
      passed = m.ball.owner < 0 && m.ball.target === 5;
    }
    expect(passed).toBe(true);
  });

  it('does not slide in when shooting at a ball on its way', () => {
    const m = live();
    const me = 9;
    Object.assign(m.players[me], { x: 0, z: 0, face: 0 });
    Object.assign(m.ball, { x: -5, z: 0, vx: 8, vz: 0, owner: -1, target: me, lastSide: 0 });
    m.control[0] = me;
    hold(m, { ...NO_INPUT, shoot: true }, 10);
    expect(m.players[me].action).not.toBe('slide');
    hold(m, NO_INPUT, 40);
    // The charge was let go once the ball arrived: it was shot.
    expect(m.ball.shot || m.ball.owner !== me).toBe(true);
  });

  it('presses the carrier while the through button is held', () => {
    const gap = (input: Input) => {
      const m = live();
      const me = 9;
      const carrier = 15;
      Object.assign(m.players[me], { x: 0, z: 0 });
      Object.assign(m.players[carrier], { x: 12, z: 6 });
      m.ball.owner = carrier;
      // The CPU carrier keeps dribbling across instead of passing.
      m.think[1] = 10000;
      m.aim[1] = Math.PI / 2;
      m.control[0] = me;
      hold(m, input, 60);
      const p = m.players[me];
      const c = m.players[carrier];
      return Math.hypot(p.x - c.x, p.z - c.z);
    };
    expect(gap({ ...NO_INPUT, through: true, sprint: true })).toBeLessThan(gap(NO_INPUT) - 4);
  });

  it('shows who a pass would go to', () => {
    const m = live();
    const me = 9;
    Object.assign(m.players[me], { x: 0, z: 0, face: 0 });
    Object.assign(m.players[5], { x: 0, z: 15 });
    m.ball.owner = me;
    m.control[0] = me;
    step(m, [{ ...NO_INPUT, mz: 100 }, NO_INPUT]);
    expect(m.preview[0]).toBe(5);
  });

  it('credits a goal that went in off the keeper to the kicker', () => {
    const m = live();
    const striker = 9;
    const keeper = 11;
    const end = HALF_LENGTH;
    Object.assign(m.ball, {
      x: end - 0.1,
      z: 0,
      y: 0.5,
      vx: 10,
      vz: 0,
      owner: -1,
      lastSide: 1,
      lastPlayer: keeper,
      credit: striker,
    });
    step(m, [NO_INPUT, NO_INPUT]);
    expect(m.score).toEqual([1, 0]);
    expect(m.scorers[0]).toMatchObject({ side: 0, num: 9, own: false });
  });
});
