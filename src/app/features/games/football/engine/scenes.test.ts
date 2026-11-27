/* eslint-disable no-param-reassign */
import { describe, expect, it } from 'vitest';
import { teammates } from './actions';
import { BENCH, MAX_SUBS } from './data';
import { createMatch, step } from './match';
import { hashMatch } from './net';
import { TUNNEL, inTunnel, requestSub } from './scenes';
import { GameEvent, MatchSetup, MatchState, NO_INPUT, Side } from './types';

// The scenes played while the ball is dead: fouls, cards, substitutions, goals, full time.

const setup = (seed: number, over: Partial<MatchSetup> = {}): MatchSetup => ({
  seed,
  teams: ['flamengo', 'palmeiras'],
  slots: [],
  halfMinutes: 2,
  difficulty: 'normal',
  ...over,
});

const run = (m: MatchState, ticks: number, seen?: GameEvent[]) => {
  for (let k = 0; k < ticks && m.phase !== 'over'; k += 1) {
    step(
      m,
      m.people.map(() => NO_INPUT)
    );
    seen?.push(...m.events);
  }
  return m;
};

// A live match with side 1's player 20 on the ball at (x, 0) running at -x, and our player 9
// sliding in from behind (as in referee.test.ts).
const slideFromBehind = (seed: number, x = 10, yellow = 0): MatchState => {
  const m = createMatch(setup(seed, { slots: [0], halfMinutes: 4 }));
  Object.assign(m, { phase: 'play', restart: undefined, wait: 0 });
  m.players.slice(0, 22).forEach((p, i) => {
    Object.assign(p, {
      x: p.side === 0 ? -30 - (i % 11) : 30 + (i % 11),
      z: (i % 11) * 5 - 25,
      vx: 0,
      vz: 0,
    });
  });
  Object.assign(m.players[20], { x, z: 0, face: Math.PI, vx: -5 });
  m.ball.owner = 20;
  m.think[1] = 10000;
  m.aim[1] = Math.PI;
  Object.assign(m.players[9], { x: x + 1.3, z: 0, face: Math.PI, yellow });
  m.people[0].control = 9;
  step(m, [{ ...NO_INPUT, mx: -100, shoot: true }]);
  for (let k = 0; k < 30 && !m.call; k += 1) step(m, [NO_INPUT]);
  return m;
};

const firstFoul = (yellow: number, want?: (m: MatchState) => boolean): MatchState => {
  for (let seed = 1; seed <= 60; seed += 1) {
    const m = slideFromBehind(seed, 10, yellow);
    if (m.scene?.kind === 'foul' && (!want || want(m))) return m;
  }
  throw new Error('no foul in 60 tries');
};

const onPitch = (m: MatchState, side: Side) => teammates(m, side).length;

describe('football scenes', () => {
  it('a fouled player lies hurt and the restart waits for the referee', () => {
    const m = firstFoul(0);
    const scene = m.scene as Extract<MatchState['scene'], { kind: 'foul' }>;
    expect(m.players[scene.victim].action).toBe('down');
    expect(m.restart?.taker).not.toBe(scene.victim);
    expect(m.scene?.hold).toBe(true);
    let gestured = false;
    for (let k = 0; k < 600 && m.phase === 'restart'; k += 1) {
      step(m, [NO_INPUT]);
      const ref = m.officials[0];
      gestured ||= ref.action === (scene.card ? 'card' : 'point');
      // Nothing is taken while the scene holds it.
      if (m.scene?.hold) expect(m.phase).toBe('restart');
    }
    expect(gestured).toBe(true);
    expect(m.phase).toBe('play');
    expect(m.scene).toBeUndefined();
  });

  it('the referee runs to the offender to show a card', () => {
    const m = firstFoul(0, (s) => s.scene?.kind === 'foul' && s.scene.card === 'yellow');
    for (let k = 0; k < 400 && m.officials[0].action !== 'card'; k += 1) step(m, [NO_INPUT]);
    const ref = m.officials[0];
    expect(ref.action).toBe('card');
    expect(ref.card).toBe('yellow');
    expect(Math.hypot(ref.x - m.players[9].x, ref.z - m.players[9].z)).toBeLessThan(3.5);
  });

  it('someone sent off sees the card, then walks to the tunnel', () => {
    const m = firstFoul(1, (s) => s.call?.kind !== 'offside' && s.players[9].out === 'red');
    const p = m.players[9];
    expect(p.off).toBe(true);
    const start = { x: p.x, z: p.z };
    // Still there while the referee comes over.
    run(m, 20);
    expect(Math.hypot(p.x - start.x, p.z - start.z)).toBeLessThan(0.5);
    run(m, 3000);
    expect(inTunnel(p) || Math.hypot(p.x - TUNNEL.x, p.z - TUNNEL.z) < 1).toBe(true);
  });

  it('the CPU coach makes changes in the second half, one scene each', () => {
    const seen: GameEvent[] = [];
    const m = run(createMatch(setup(4)), Infinity, seen);
    expect(m.phase).toBe('over');
    ([0, 1] as Side[]).forEach((side) => {
      const subs = m.subs.filter((s) => s.side === side);
      expect(subs.length).toBeGreaterThanOrEqual(1);
      expect(subs.length).toBeLessThanOrEqual(MAX_SUBS);
      subs.forEach((s) => expect(s.minute).toBeGreaterThan(45));
      const reds = m.players.filter((p) => p.side === side && p.out === 'red').length;
      expect(onPitch(m, side)).toBe(11 - reds);
      const seats = m.players.filter((p) => p.side === side && p.seat >= 0).map((p) => p.seat);
      expect(new Set(seats).size).toBe(seats.length);
      expect(seats.length).toBe(BENCH.length);
    });
    const subScenes = seen.filter(
      (e) => e.type === 'scene' && e.kind === 'sub' && e.stage === 'start'
    );
    expect(subScenes.length).toBe(m.subs.length);
  });

  it('a substitution swaps the two at the line and hands the person the new player', () => {
    const m = createMatch(setup(8, { slots: [0], halfMinutes: 4 }));
    const out = m.players.findIndex((p) => p.side === 0 && p.num === 7);
    const on = m.players.findIndex((p) => p.side === 0 && p.num === 14);
    expect(requestSub(m, 0, out, on)).toBe(true);
    // Not twice, and not someone already off.
    expect(requestSub(m, 0, out, on)).toBe(false);
    expect(requestSub(m, 0, on, out)).toBe(false);
    m.people[0].control = out;
    run(m, 2);
    expect(m.scene?.kind).toBe('sub');
    expect(m.people[0].control).not.toBe(out);
    expect(m.officials[3].action).toBe('board');
    expect(m.officials[3].board).toEqual([7, 14]);
    for (let k = 0; k < 1200 && m.scene; k += 1) {
      step(m, [NO_INPUT]);
      expect(m.phase).toBe('restart');
    }
    expect(m.players[on].off).toBe(false);
    expect(m.players[on].role).toBe('mid');
    expect(m.players[out].out).toBe('subbed');
    expect(m.subs).toMatchObject([{ side: 0, out: 7, on: 14 }]);
    // The kick-off is the person's: the game takes it for them after a while.
    run(m, 600);
    expect(m.phase).toBe('play');
  });

  it('allows at most MAX_SUBS changes a side', () => {
    const m = createMatch(setup(2));
    const bench = m.players.flatMap((p, i) => (p.side === 1 && p.out === 'bench' ? [i] : []));
    const starters = teammates(m, 1).filter((i) => m.players[i].role !== 'gk');
    const asked = bench.map((on, k) => requestSub(m, 1, starters[k], on));
    expect(asked.filter(Boolean)).toHaveLength(MAX_SUBS);
  });

  it('brings the bench keeper on for a stand-in after a red', () => {
    const m = createMatch(setup(6));
    // Side 0's keeper is off; defender 3 has gone in goal.
    const gk = m.players.findIndex((p) => p.side === 0 && p.num === 1);
    const three = m.players.findIndex((p) => p.side === 0 && p.num === 3);
    Object.assign(m.players[gk], { off: true, out: 'red', x: 0, z: -41 });
    Object.assign(m.players[three], { role: 'gk', homeX: -50, homeZ: 0 });
    run(m, 1500);
    const twelve = m.players.find((p) => p.side === 0 && p.num === 12);
    expect(twelve?.off).toBe(false);
    expect(twelve?.role).toBe('gk');
    expect(m.players[three].out).toBe('subbed');
  });

  it('a scorer runs off to celebrate and the team follows', () => {
    for (let seed = 1; seed <= 10; seed += 1) {
      const m = createMatch(setup(seed));
      while (m.phase !== 'over' && m.phase !== 'goal') step(m, []);
      const s = m.scene;
      if (s?.kind === 'goal' && !s.own && s.scorer >= 0) {
        const scorer = m.players[s.scorer];
        const mates = teammates(m, s.side).filter(
          (i) => i !== s.scorer && m.players[i].role !== 'gk'
        );
        const spread = () =>
          mates.reduce(
            (sum, i) => sum + Math.hypot(m.players[i].x - scorer.x, m.players[i].z - scorer.z),
            0
          );
        const before = spread();
        const d0 = Math.hypot(scorer.x - s.x, scorer.z - s.z);
        run(m, 60);
        expect(m.players.some((p) => p.side !== s.side && p.action === 'dejected')).toBe(true);
        run(m, 140);
        expect(Math.hypot(scorer.x - s.x, scorer.z - s.z)).toBeLessThan(Math.max(3, d0));
        expect(spread()).toBeLessThan(before);
        run(m, 400);
        // The goal plays again before the kick-off (replay.ts).
        expect(m.replay?.kind).toBe('goal');
        while (m.replay) step(m, []);
        run(m, 60);
        expect(m.scene?.kind).not.toBe('goal');
        return;
      }
    }
    throw new Error('no goal in 10 matches');
  });

  it('a copy taken in the middle of a scene steps on the same (rollback)', () => {
    const m = createMatch(setup(4));
    while (m.phase !== 'over' && m.scene?.kind !== 'sub') step(m, []);
    expect(m.scene?.kind).toBe('sub');
    const copy = structuredClone(m);
    run(m, 900);
    run(copy, 900);
    expect(hashMatch(copy)).toBe(hashMatch(m));
  });

  it('ends with the winners cheering and the losers holding their heads', () => {
    const m = run(createMatch(setup(3)), Infinity);
    const [a, b] = m.score;
    const onIt = m.players.filter((p) => !p.off);
    if (a === b) expect(onIt.every((p) => p.action === 'clap')).toBe(true);
    else {
      const winner = a > b ? 0 : 1;
      onIt.forEach((p) => expect(p.action).toBe(p.side === winner ? 'cheer' : 'dejected'));
    }
  });
});
