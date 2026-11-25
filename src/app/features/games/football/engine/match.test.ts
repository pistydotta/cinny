import { describe, expect, it } from 'vitest';
import { createMatch, step } from './match';
import { HALF_LENGTH, HALF_WIDTH } from './data';
import { TEAMS, keeperKit, matchKits, teamById } from './teams';
import { Input, MatchSetup, MatchState, NO_INPUT } from './types';

const setup = (seed: number, over: Partial<MatchSetup> = {}): MatchSetup => ({
  seed,
  teams: ['flamengo', 'palmeiras'],
  humans: [false, false],
  halfMinutes: 3,
  difficulty: 'normal',
  ...over,
});

const play = (
  m: MatchState,
  ticks = Infinity,
  input: (m: MatchState) => Input = () => NO_INPUT
) => {
  for (let t = 0; t < ticks && m.phase !== 'over'; t += 1) step(m, [input(m), NO_INPUT]);
  return m;
};

const fingerprint = (m: MatchState) =>
  [m.tick, m.score.join(':'), m.ball.x.toFixed(6), m.ball.z.toFixed(6), m.rng].join('|');

describe('football match', () => {
  it('plays a whole CPU match to the final whistle', () => {
    const m = play(createMatch(setup(7)));
    expect(m.phase).toBe('over');
    expect(m.clock).toBe(90 * 60);
    expect(m.half).toBe(2);
  });

  it('gives the same match for the same seed and inputs', () => {
    const a = play(createMatch(setup(42)), 4000);
    const b = play(createMatch(setup(42)), 4000);
    expect(fingerprint(a)).toBe(fingerprint(b));
    const c = play(createMatch(setup(43)), 4000);
    expect(fingerprint(c)).not.toBe(fingerprint(a));
  });

  it('a state copy steps on exactly like the original (rollback)', () => {
    const m = play(createMatch(setup(5)), 1500);
    const copy = structuredClone(m);
    play(m, 1500);
    play(copy, 1500);
    expect(fingerprint(copy)).toBe(fingerprint(m));
  });

  it('keeps the ball near the pitch and scores goals over many matches', () => {
    let goals = 0;
    let restarts = 0;
    for (let seed = 1; seed <= 6; seed += 1) {
      const m = createMatch(setup(seed));
      while (m.phase !== 'over') {
        step(m, [NO_INPUT, NO_INPUT]);
        restarts += m.events.filter((e) => e.type === 'out').length;
        expect(Math.abs(m.ball.x)).toBeLessThan(HALF_LENGTH + 6);
        expect(Math.abs(m.ball.z)).toBeLessThan(HALF_WIDTH + 6);
      }
      goals += m.score[0] + m.score[1];
    }
    // Six short matches: some goals, but not a shooting gallery.
    expect(goals).toBeGreaterThan(3);
    expect(goals).toBeLessThan(60);
    expect(restarts).toBeGreaterThan(20);
  });

  it('keeps a kick-off button pressed before the ball is ready', () => {
    const m = createMatch(setup(11, { humans: [true, false] }));
    step(m, [{ ...NO_INPUT, pass: true }, NO_INPUT]);
    play(m, 90);
    expect(m.phase).toBe('play');
  });

  it('lets a person run with the ball and shoot', () => {
    const m = createMatch(setup(9, { humans: [true, false] }));
    // Wait for the kick-off, then pass to start play.
    play(m, 80);
    step(m, [{ ...NO_INPUT, pass: true }, NO_INPUT]);
    expect(m.phase).toBe('play');
    let shots = 0;
    play(m, 3000, (s) => {
      const p = s.players[s.control[0]];
      const mine = s.ball.owner === s.control[0];
      const toGoal = HALF_LENGTH - p.x;
      // Run at goal with the ball, shoot when near; chase it otherwise.
      if (mine && toGoal < 20) {
        shots += s.tick % 30 === 0 ? 1 : 0;
        return { ...NO_INPUT, shoot: s.tick % 30 < 20 };
      }
      const tx = mine ? HALF_LENGTH : s.ball.x;
      const tz = mine ? 0 : s.ball.z;
      const l = Math.hypot(tx - p.x, tz - p.z) || 1;
      return {
        ...NO_INPUT,
        mx: Math.round(((tx - p.x) / l) * 100),
        mz: Math.round(((tz - p.z) / l) * 100),
        sprint: true,
        through: s.ball.owner >= 0 && s.players[s.ball.owner].side === 1 && s.tick % 20 === 0,
      };
    });
    expect(shots).toBeGreaterThan(0);
  });
});

describe('football teams', () => {
  it('has unique ids and the 20 Série A clubs', () => {
    expect(new Set(TEAMS.map((t) => t.id)).size).toBe(TEAMS.length);
    expect(TEAMS.filter((t) => t.league === 'br')).toHaveLength(20);
  });

  it('changes the visitors kit when the shirts clash', () => {
    const [, away] = matchKits(teamById('santos'), teamById('corinthians'));
    expect(away.shirt).not.toBe(teamById('corinthians').home.shirt);
    const kits = matchKits(teamById('flamengo'), teamById('palmeiras'));
    expect(keeperKit(kits, 0).shirt).not.toBe(keeperKit(kits, 1).shirt);
  });
});
