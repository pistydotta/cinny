import { describe, expect, it } from 'vitest';
import { createMatch, step } from './match';
import { loft, pickReceiver, release } from './actions';
import { Input, MatchState, NO_INPUT, Side } from './types';

// A live match with everyone parked far away, so a drill only has the players it places.
const live = (seed: number, slots: Side[] = [0]): MatchState => {
  const m = createMatch({
    seed,
    teams: ['brasil', 'argentina'],
    slots,
    halfMinutes: 4,
    difficulty: 'normal',
  });
  m.phase = 'play';
  m.restart = undefined;
  m.wait = 0;
  m.players.forEach((p, i) => {
    Object.assign(p, { x: -50, z: (i % 11) * 6 - 30 + (p.side ? 3 : 0), vx: 0, vz: 0 });
  });
  return m;
};

const PASSER = 5;
const ME = 9;

type Steer = [number, number] | ((tick: number) => [number, number]);

// A pass from (0, 0) to ME at distance d, aimed up to 2.5 m off; the person steers `steer`
// (always, or by the tick). The match after `ticks`, or once ME has the ball.
const pass = (seed: number, kind: 'ground' | 'lob', steer: Steer, ticks = 420): MatchState => {
  const m = live(seed);
  const d = 10 + (seed % 5) * 6;
  Object.assign(m.players[PASSER], { x: 0, z: 0, face: 0 });
  Object.assign(m.players[ME], { x: d, z: 0, vz: ((seed % 5) - 2) * 2 });
  m.ball.owner = PASSER;
  m.people[0].control = ME;
  const a = Math.atan2((((seed * 7) % 11) - 5) * 0.5, d);
  if (kind === 'lob') loft(m, PASSER, a, d, ME);
  else {
    const speed = Math.sqrt(2 * 2.6 * d) + 2;
    release(m, PASSER, Math.cos(a) * speed, 0.3, Math.sin(a) * speed, { target: ME });
  }
  m.players[PASSER].noTouch = 60;
  m.ball.offside = [];
  for (let k = 0; k < ticks; k += 1) {
    const [mx, mz] = typeof steer === 'function' ? steer(k) : steer;
    const input: Input = { ...NO_INPUT, mx, mz };
    step(m, [input]);
    if (m.ball.owner === ME) return m;
  }
  return m;
};

// True when ME has the ball within seven seconds.
const receives = (seed: number, kind: 'ground' | 'lob', steer: Steer): boolean =>
  pass(seed, kind, steer).ball.owner === ME;

describe('receiving a pass', () => {
  // At rest, with the ball, toward it and a little across it: the help to meet the ball.
  const steers: [number, number][] = [
    [0, 0],
    [100, 0],
    [70, -70],
    [-100, 0],
    [-70, 70],
  ];
  steers.forEach((steer) => {
    it(`keeps nearly every ground pass and lob while steering ${steer}`, () => {
      let got = 0;
      for (let seed = 1; seed <= 20; seed += 1) {
        got += receives(seed, 'ground', steer) ? 1 : 0;
        got += receives(seed, 'lob', steer) ? 1 : 0;
      }
      expect(got).toBeGreaterThanOrEqual(38);
    });
  });
});

describe("the receiver is not stuck on the ball's line", () => {
  it('runs where the stick points when it points across the pass', () => {
    // Compared with the same pass and the stick at rest, which meets the ball on its line;
    // pointed away from the side the pass is aimed at.
    for (let seed = 1; seed <= 5; seed += 1) {
      const way = ((seed * 7) % 11) - 5 > 0 ? -1 : 1;
      const free = pass(seed, 'ground', [0, 100 * way], 45).players[ME].z;
      const helped = pass(seed, 'ground', [0, 0], 45).players[ME].z;
      expect((free - helped) * way).toBeGreaterThan(2);
    }
  });

  it('still keeps the pass after a quick touch across it', () => {
    let got = 0;
    for (let seed = 1; seed <= 20; seed += 1) {
      const tap = (k: number): [number, number] => (k < 8 ? [0, 100] : [0, 0]);
      got += receives(seed, 'ground', tap) ? 1 : 0;
      got += receives(seed, 'lob', tap) ? 1 : 0;
    }
    expect(got).toBeGreaterThanOrEqual(38);
  });

  it('comes to meet the ball when pointed at it', () => {
    const still = pass(2, 'ground', [0, 0], 30).players[ME].x;
    const coming = pass(2, 'ground', [-100, 0], 30).players[ME].x;
    expect(coming).toBeLessThan(still - 1);
  });

  it('can turn away from a ball that has stopped', () => {
    const m = live(6);
    Object.assign(m.players[ME], { x: 10, z: 0 });
    Object.assign(m.ball, { x: 6, z: 0, vx: 0, vz: 0, owner: -1, target: ME });
    m.people[0].control = ME;
    for (let k = 0; k < 40; k += 1) step(m, [{ ...NO_INPUT, mx: 100 }]);
    expect(m.players[ME].x).toBeGreaterThan(12);
  });
});

describe('passing between several people a side', () => {
  it('gives the receiver to the person whose player is nearest', () => {
    const m = live(3, [0, 0]);
    Object.assign(m.players[PASSER], { x: 0, z: 0, face: 0 });
    Object.assign(m.players[7], { x: 22, z: 6 });
    Object.assign(m.players[ME], { x: 25, z: 0 });
    m.ball.owner = PASSER;
    m.people[0].control = PASSER;
    m.people[1].control = 7;
    release(m, PASSER, 11, 0.3, 0, { target: ME });
    m.players[PASSER].noTouch = 60;
    m.ball.offside = [];
    step(m, [NO_INPUT, NO_INPUT]);
    expect(m.people[1].control).toBe(ME);
    expect(m.people[0].control).toBe(PASSER);
  });

  it("aims at another person's player before a CPU teammate", () => {
    const m = live(4, [0, 0]);
    Object.assign(m.players[PASSER], { x: 0, z: 0, face: 0 });
    Object.assign(m.players[7], { x: 18, z: 0 });
    Object.assign(m.players[ME], { x: 18, z: 6 });
    m.people[0].control = PASSER;
    expect(pickReceiver(m, PASSER, 1, 0)).toBe(7);
    m.people[1].control = ME;
    expect(pickReceiver(m, PASSER, 1, 0)).toBe(ME);
  });

  it('passes straight back only when aimed there clearly', () => {
    const m = live(5);
    Object.assign(m.players[PASSER], { x: 0, z: 0, face: 0 });
    Object.assign(m.players[7], { x: 15, z: 5 });
    Object.assign(m.players[ME], { x: 15, z: -6 });
    m.ball.from = 7;
    expect(pickReceiver(m, PASSER, 1, 0)).toBe(ME);
    expect(pickReceiver(m, PASSER, 15, 5)).toBe(7);
  });
});
