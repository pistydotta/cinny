/* eslint-disable no-param-reassign */
import { describe, expect, it } from 'vitest';
import { VAR } from './data';
import { createMatch, step } from './match';
import { hashMatch } from './net';
import { RestartFor, foul, touch } from './referee';
import { canCallVar, varWinner } from './var';
import { MatchSetup, MatchState, NO_INPUT, Order, VarChoice } from './types';

// The video referee: people watching ask for a decision to be reviewed and vote on it; a changed
// decision is put right in the match, the same way on every copy.

const setup = (seed: number, over: Partial<MatchSetup> = {}): MatchSetup => ({
  seed,
  teams: ['flamengo', 'palmeiras'],
  slots: [0, 1],
  halfMinutes: 2,
  difficulty: 'normal',
  ...over,
});

const idle = (m: MatchState) => m.people.map(() => NO_INPUT);
const call = (voters: number): Order => ({ kind: 'var', voters });
const vote = (m: MatchState, choice: VarChoice): Order => ({
  kind: 'vote',
  choice: m.varReview?.options.indexOf(choice) ?? -1,
});

// Votes cast one per tick, then the match stepped until the verdict.
const decide = (m: MatchState, votes: VarChoice[]) => {
  votes.forEach((c) => step(m, idle(m), [vote(m, c)]));
  while (m.varReview && m.varReview.verdict < 0) step(m, idle(m));
  return m.varReview;
};

// Through the verdict on screen, back to the match.
const finish = (m: MatchState) => {
  while (m.varReview) step(m, idle(m));
};

// A match just after a goal, nobody's inputs: the CPU on both sides.
const afterGoal = (): MatchState => {
  const m = createMatch(setup(2, { slots: [] }));
  while (m.phase !== 'goal') step(m, []);
  for (let k = 0; k < 30; k += 1) step(m, []);
  return m;
};

// Restarts of our own, for fouls set up by hand: play stops, the real restart comes from the
// match once the review changes it.
const stop: RestartFor = (m) => {
  m.phase = 'restart';
};

// A foul on side 0's 9, running at goal past every defender just outside the box, by side 1's
// player `offender`: a clear chance, so often a red. Tries seeds until the card is `want`.
const fouled = (
  offender: (m: MatchState) => number,
  want: 'yellow' | 'red' | undefined,
  yellow = 0,
  // A defender still behind the 9: no clear chance, so a red is only a second yellow (or rare).
  covered = false
) => {
  for (let seed = 1; seed < 200; seed += 1) {
    const m = createMatch(setup(seed));
    Object.assign(m, { phase: 'play', restart: undefined, wait: 0 });
    m.players.slice(0, 22).forEach((p, i) => {
      if (p.side === 1 && p.role !== 'gk') p.x = 10 + (i % 11);
    });
    const nine = m.players.findIndex((p) => p.side === 0 && p.num === 9);
    Object.assign(m.players[nine], { x: 32, z: 2, face: 0 });
    const o = offender(m);
    Object.assign(m.players[o], { x: 31, z: 2.5, yellow });
    const back = m.players.find((p) => p.side === 1 && p.num === 2 && p !== m.players[o]);
    if (covered && back) back.x = 40;
    foul(m, o, nine, 'slideBehind', stop);
    const second = m.call?.kind !== 'offside' && m.call?.secondYellow;
    if (m.call?.kind !== 'offside' && m.call?.card === want && (!covered || second)) {
      m.scene = undefined;
      return { m, o, nine };
    }
  }
  throw new Error(`no ${want} card`);
};

const keeperOfOne = (m: MatchState) => m.players.findIndex((p) => p.side === 1 && p.role === 'gk');
const centreBack = (m: MatchState) => m.players.findIndex((p) => p.side === 1 && p.num === 3);

describe('football video referee', () => {
  it('rules a goal out: off the score, and a goal kick instead of the kick-off', () => {
    const m = afterGoal();
    const [a, b] = m.score;
    const scored = m.scorers.length;
    expect(canCallVar(m)).toBe(true);
    step(m, [], [call(3)]);
    expect(m.varReview?.options).toEqual(['goal', 'nogoal_offside', 'nogoal_foul']);
    const i = m.varReview?.incident;
    if (i?.kind !== 'goal') throw new Error('not a goal');
    const r = decide(m, ['nogoal_offside', 'goal', 'nogoal_offside']);
    expect(r && r.options[r.verdict]).toBe('nogoal_offside');
    expect(m.score[i.side]).toBe((i.side === 0 ? a : b) - 1);
    expect(m.scorers.length).toBe(scored - 1);
    expect(m.restart).toMatchObject({ kind: 'goalkick', side: 1 - i.side });
    expect(m.events).toContainEqual({
      type: 'var',
      stage: 'verdict',
      choice: 'nogoal_offside',
      changed: true,
    });
    expect(m.varLog).toEqual([
      { minute: expect.any(Number), choice: 'nogoal_offside', changed: true },
    ]);
    finish(m);
    expect(m.phase).toBe('restart');
    expect(m.restart?.kind).toBe('goalkick');
    // Reviewed once: it can't be asked for again.
    expect(canCallVar(m)).toBe(false);
  });

  it('keeps the referee’s call on a tie or with no votes', () => {
    const m = afterGoal();
    const score = [...m.score];
    step(m, [], [call(2)]);
    const r = decide(m, ['goal', 'nogoal_foul']);
    expect(r?.verdict).toBe(r?.called);
    expect(m.score).toEqual(score);
    expect(varWinner({ votes: [0, 0, 0], called: 2 })).toBe(2);
    expect(varWinner({ votes: [0, 2, 2], called: 0 })).toBe(0);
    expect(varWinner({ votes: [1, 3, 2], called: 0 })).toBe(1);
  });

  it('closes the vote once everyone watching voted and the moment played once', () => {
    const m = afterGoal();
    step(m, [], [call(1)]);
    const watch = m.varReview?.watch ?? 0;
    step(m, [], [vote(m, 'goal')]);
    while (m.varReview && m.varReview.verdict < 0) step(m, []);
    expect(m.varReview?.t).toBe(watch);
    expect(watch).toBeLessThan(VAR.review);
  });

  it('stands the match still while it reviews, and a copy steps on the same', () => {
    const m = afterGoal();
    const { clock, wait } = m;
    step(m, [], [call(4)]);
    for (let k = 0; k < 50; k += 1) step(m, []);
    expect([m.clock, m.wait]).toEqual([clock, wait]);
    const copy = structuredClone(m);
    const orders = [vote(m, 'nogoal_foul'), vote(m, 'nogoal_foul')];
    [m, copy].forEach((x) => {
      orders.forEach((o) => step(x, [], [o]));
      for (let k = 0; k < 1500; k += 1) step(x, []);
    });
    expect(hashMatch(copy)).toBe(hashMatch(m));
  });

  it('ignores orders out of time: in play, twice, or a vote with no review', () => {
    const m = createMatch(setup(4));
    while (m.phase !== 'play') step(m, idle(m));
    step(m, idle(m), [call(2), { kind: 'vote', choice: 0 }]);
    expect(m.varReview).toBeUndefined();
    const g = afterGoal();
    step(g, [], [call(2), call(5)]);
    expect(g.varReview?.voters).toBe(2);
    step(
      g,
      [],
      [
        { kind: 'vote', choice: 7 },
        { kind: 'vote', choice: 1.5 },
      ]
    );
    expect(g.varReview?.votes).toEqual([0, 0, 0]);
  });

  it('gives a red back: the keeper back in goal and the stand-in back in defence', () => {
    const { m, o } = fouled(keeperOfOne, 'red');
    const standIn = m.players.findIndex((p, i) => p.side === 1 && p.role === 'gk' && i !== o);
    expect(standIn).toBeGreaterThanOrEqual(0);
    expect(m.varReview).toBeUndefined();
    expect(m.players[o].off).toBe(true);
    step(m, idle(m), [call(1)]);
    expect(m.varReview?.options[m.varReview.called]).toBe('red');
    decide(m, ['foul']);
    expect(m.players[o]).toMatchObject({ off: false, out: undefined, role: 'gk' });
    expect(m.players[standIn].role).not.toBe('gk');
    expect(m.cards.filter((c) => c.color === 'red')).toEqual([]);
    expect(m.call).toMatchObject({ kind: 'foul', card: undefined });
    expect(m.subQueue).toEqual([]);
  });

  it('a yellow on a booked player is a second yellow and a red', () => {
    // No card from the referee for a player booked earlier in the match.
    const { m, o } = fouled(centreBack, undefined);
    m.players[o].yellow = 1;
    step(m, idle(m), [call(1)]);
    decide(m, ['yellow']);
    expect(m.players[o]).toMatchObject({ off: true, out: 'red', yellow: 2 });
    expect(m.call).toMatchObject({ card: 'red', secondYellow: true });
    // And taking a second yellow's red back leaves the first yellow.
    const twice = fouled(centreBack, 'red', 1, true);
    step(twice.m, idle(twice.m), [call(1)]);
    decide(twice.m, ['foul']);
    expect(twice.m.players[twice.o]).toMatchObject({ off: false, yellow: 1 });
  });

  it('no foul: the card taken back and the ball to the challenger’s side', () => {
    const { m, o, nine } = fouled(centreBack, 'yellow');
    step(m, idle(m), [call(2)]);
    decide(m, ['nofoul', 'nofoul']);
    expect(m.players[o].yellow).toBe(0);
    expect(m.cards).toEqual([]);
    expect(m.call).toBeUndefined();
    expect(m.restart).toMatchObject({ kind: 'freekick', side: 1 });
    expect(m.players[nine].action).not.toBe('down');
  });

  it('a straight red from a yellow: shown, sent off', () => {
    const { m, o } = fouled(centreBack, 'yellow');
    step(m, idle(m), [call(1)]);
    decide(m, ['red']);
    expect(m.players[o]).toMatchObject({ off: true, out: 'red', yellow: 0 });
    expect(m.cards.map((c) => c.color)).toEqual(['red']);
  });

  it('onside after all: the flag down and the ball to the attackers', () => {
    const m = createMatch(setup(6));
    Object.assign(m, { phase: 'play', restart: undefined, wait: 0 });
    const nine = m.players.findIndex((p) => p.side === 0 && p.num === 9);
    m.ball.offside = [[nine, 30, 5]];
    expect(touch(m, nine, stop)).toBe(true);
    while (!canCallVar(m)) step(m, idle(m));
    step(m, idle(m), [call(1)]);
    decide(m, ['onside']);
    expect(m.restart).toMatchObject({ kind: 'freekick', side: 0 });
    expect(m.officials.some((x) => x.action === 'flag' || x.action === 'indirect')).toBe(false);
    expect(m.scene?.kind).not.toBe('offside');
  });
});
