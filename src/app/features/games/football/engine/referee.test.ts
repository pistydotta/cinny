/* eslint-disable no-param-reassign */
import { describe, expect, it } from 'vitest';
import { createMatch, step } from './match';
import { HALF_LENGTH, WALL_DISTANCE } from './data';
import { teammates } from './actions';
import { Input, MatchState, NO_INPUT } from './types';

// The referee's calls, from positions set up by hand. Side 0 attacks +x in the first half.

const live = (seed = 3): MatchState => {
  const m = createMatch({
    seed,
    teams: ['brasil', 'argentina'],
    slots: [0],
    halfMinutes: 4,
    difficulty: 'normal',
  });
  m.phase = 'play';
  m.restart = undefined;
  m.wait = 0;
  m.players.forEach((p, i) => {
    p.x = p.side === 0 ? -30 - (i % 11) : 30 + (i % 11);
    p.z = (i % 11) * 5 - 25;
    p.vx = 0;
    p.vz = 0;
  });
  return m;
};

const hold = (m: MatchState, input: Input, ticks: number) => {
  for (let k = 0; k < ticks; k += 1) step(m, [input]);
};

// Side 1's carrier at (x, 0) running toward -x, and our player 9 sliding in from behind it.
const slideFromBehind = (x: number, seed = 3) => {
  const m = live(seed);
  const carrier = 20;
  Object.assign(m.players[carrier], { x, z: 0, face: Math.PI, vx: -5 });
  m.ball.owner = carrier;
  m.think[1] = 10000;
  m.aim[1] = Math.PI;
  Object.assign(m.players[9], { x: x + 1.3, z: 0, face: Math.PI });
  m.people[0].control = 9;
  step(m, [{ ...NO_INPUT, mx: -100, shoot: true }]);
  hold(m, NO_INPUT, 30);
  return m;
};

describe('football referee', () => {
  it('calls a slide from behind a foul, with a free kick to the other side', () => {
    let fouls = 0;
    for (let seed = 1; seed <= 6; seed += 1) {
      const m = slideFromBehind(10, seed);
      if (m.call?.kind === 'foul') {
        fouls += 1;
        expect(m.restart?.kind).toBe('freekick');
        expect(m.restart?.side).toBe(1);
      }
    }
    expect(fouls).toBeGreaterThan(2);
  });

  it('gives a penalty for a foul in the box', () => {
    // Side 1's carrier inside our box (we defend -x), fouled from behind.
    let penalties = 0;
    for (let seed = 1; seed <= 8; seed += 1) {
      const m = slideFromBehind(-HALF_LENGTH + 8, seed);
      if (m.restart?.kind === 'penalty') {
        penalties += 1;
        expect(m.call?.kind).toBe('penalty');
        expect(Math.abs(m.ball.x)).toBeCloseTo(HALF_LENGTH - 11, 1);
      }
    }
    expect(penalties).toBeGreaterThan(0);
  });

  it('catches a pass to a player behind the defence', () => {
    const m = live();
    const passer = 9;
    const runner = 10;
    Object.assign(m.players[passer], { x: 0, z: 0, face: 0 });
    // Side 1's defenders around x = 20, our runner past them at x = 30.
    m.players.forEach((p, i) => {
      if (p.side === 1 && p.role !== 'gk')
        Object.assign(p, { x: 20 + (i % 3), z: (i % 2 ? 1 : -1) * (8 + (i % 5) * 4) });
    });
    Object.assign(m.players[runner], { x: 30, z: 2 });
    m.ball.owner = passer;
    m.people[0].control = passer;
    step(m, [{ ...NO_INPUT, mx: 100, through: true }]);
    let caught = false;
    for (let k = 0; k < 200 && !caught; k += 1) {
      step(m, [NO_INPUT]);
      caught = m.call?.kind === 'offside';
    }
    expect(caught).toBe(true);
    expect(m.restart?.kind).toBe('freekick');
    expect(m.restart?.side).toBe(1);
    expect(m.officials[1].action).toBe('flag');
  });

  it('sends a player off for a second yellow', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const m = slideFromBehind(10, seed);
      if (m.call?.kind === 'foul' && m.call.card === 'yellow') {
        // A second one the same way, same player.
        Object.assign(m, { phase: 'play', restart: undefined, call: undefined, wait: 0 });
        m.players[9].yellow = 1;
        m.players[9].busy = 0;
        m.players[9].action = 'none';
        let red = false;
        for (let tries = 0; tries < 20 && !red; tries += 1) {
          Object.assign(m, { phase: 'play', restart: undefined, call: undefined });
          Object.assign(m.players[20], { x: 10, z: 0, face: Math.PI, busy: 0, action: 'none' });
          m.ball.owner = 20;
          Object.assign(m.players[9], { x: 11.3, z: 0, busy: 0, action: 'none', off: false });
          m.people[0].control = 9;
          step(m, [{ ...NO_INPUT, mx: -100, shoot: true }]);
          hold(m, NO_INPUT, 30);
          const call = m.call as { kind: string; card?: string } | undefined;
          red = call?.kind === 'foul' && call.card === 'red';
        }
        expect(red).toBe(true);
        expect(m.players[9].off).toBe(true);
        expect(teammates(m, 0)).not.toContain(9);
        expect(m.cards.some((c) => c.color === 'red' && c.num === 9)).toBe(true);
        return;
      }
    }
    throw new Error('no yellow card in 30 tries');
  });

  it('puts a wall 9.15 m from a free kick near goal', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      // Fouled 22 m out, in front of the goal side 1 defends (+x).
      const m = live(seed);
      const carrier = 9;
      Object.assign(m.players[carrier], { x: HALF_LENGTH - 22, z: 0, face: 0 });
      m.ball.owner = carrier;
      const slider = 20;
      Object.assign(m.players[slider], { x: HALF_LENGTH - 23.3, z: 0, face: 0 });
      // Our carrier stands still under a person's control; their defender slides in.
      m.people[0].control = carrier;
      m.players[slider].action = 'slide';
      m.players[slider].busy = 36;
      m.players[slider].actX = 1;
      m.players[slider].actZ = 0;
      hold(m, NO_INPUT, 20);
      if (m.restart?.kind === 'freekick') {
        const { x, z } = m.restart;
        const near = m.players.filter(
          (p) => p.side === 1 && !p.off && Math.hypot(p.x - x, p.z - z) < WALL_DISTANCE - 1
        );
        expect(near).toEqual([]);
        const wall = m.players.filter(
          (p) => p.side === 1 && Math.abs(Math.hypot(p.x - x, p.z - z) - WALL_DISTANCE) < 1
        );
        expect(wall.length).toBeGreaterThanOrEqual(3);
        return;
      }
    }
    throw new Error('no free kick in 20 tries');
  });
});
