import { describe, expect, it } from 'vitest';
import { handOrder, manilhaRank, predictionTotal, seatBadge, shownTrick } from './fodinhaSeat';
import { GamePlayer, GameTable } from './types';

const player = (over: Partial<GamePlayer> = {}): GamePlayer => ({
  userId: '@a:x',
  cardCount: 2,
  eliminated: false,
  prediction: null,
  penalties: 0,
  won: 0,
  ...over,
});
const table = (over: Partial<GameTable>): GameTable =>
  ({ phase: 'predict', turn: 0, players: [], ...over } as GameTable);

describe('seatBadge', () => {
  it('shows who is thinking and what was predicted', () => {
    const t = table({ phase: 'predict', turn: 1 });
    expect(seatBadge(t, player(), 1)).toEqual({ kind: 'thinking' });
    expect(seatBadge(t, player(), 2)).toEqual({ kind: 'waiting' });
    expect(seatBadge(t, player({ prediction: 2 }), 0)).toEqual({
      kind: 'predicted',
      prediction: 2,
    });
  });

  it('counts tricks during play and scores the round at its end', () => {
    const p = player({ prediction: 2, won: 1 });
    expect(seatBadge(table({ phase: 'play' }), p, 0)).toEqual({
      kind: 'progress',
      won: 1,
      prediction: 2,
    });
    expect(seatBadge(table({ phase: 'round_end' }), p, 0)).toEqual({ kind: 'missed', penalty: 1 });
    expect(seatBadge(table({ phase: 'round_end' }), player({ prediction: 0 }), 0)).toEqual({
      kind: 'exact',
      prediction: 0,
    });
  });

  it('marks eliminated players whatever the phase', () => {
    expect(seatBadge(table({ phase: 'play' }), player({ eliminated: true }), 0)).toEqual({
      kind: 'out',
    });
  });
});

describe('predictionTotal', () => {
  it('adds the predictions of players still in', () => {
    const t = table({
      players: [
        player({ prediction: 1 }),
        player({ prediction: 2 }),
        player({ prediction: null }),
        player({ prediction: 3, eliminated: true }),
      ],
    });
    expect(predictionTotal(t)).toBe(3);
  });
});

describe('shownTrick', () => {
  const c = { seat: 0, card: { rank: 'K', suit: 'd' } };
  it('prefers the trick being played, then the last one', () => {
    expect(shownTrick(table({ trick: [c], lastTrick: [] }))).toEqual({ cards: [c], done: false });
    expect(shownTrick(table({ trick: [], lastTrick: [c] }))).toEqual({ cards: [c], done: true });
    expect(shownTrick(table({}))).toEqual({ cards: [], done: false });
  });
});

describe('handOrder', () => {
  const c = (rank: string, suit = 'd') => ({ rank, suit });
  it('names the manilha after the vira, wrapping 3 to 4', () => {
    expect(manilhaRank(c('7'))).toBe('Q');
    expect(manilhaRank(c('3'))).toBe('4');
  });

  it('sorts like Truco with the manilhas on top and suits breaking ties', () => {
    const vira = c('7');
    const hand = [c('3', 'c'), c('Q', 'd'), c('4', 'h'), c('K', 'c'), c('K', 's')];
    const sorted = [...hand].sort((a, b) => handOrder(a, vira) - handOrder(b, vira));
    expect(sorted).toEqual([c('4', 'h'), c('K', 's'), c('K', 'c'), c('3', 'c'), c('Q', 'd')]);
  });

  it('keeps the first version order for old tables without a vira', () => {
    expect(handOrder(c('★', 'r'))).toBeGreaterThan(handOrder(c('K', 'c')));
  });
});
