import { describe, expect, it } from 'vitest';
import {
  botName,
  isBotId,
  livesLeft,
  nextRaise,
  ourTeam,
  placedCards,
  trickMarks,
  trickResult,
} from './tentosView';
import { GameTable } from './types';

const table = (over: Partial<GameTable>) => ({ mySeat: 0, players: [], ...over } as GameTable);

describe('tentos view', () => {
  it('names bots and spots them', () => {
    expect(isBotId('bot:2')).toBe(true);
    expect(isBotId('@bot:2.example')).toBe(false);
    expect(botName('bot:1')).toBe('Bot Zé');
    expect(botName('bot:7')).toBe('Bot Zé');
  });
  it('raises 1 → 3 → 6 → 9 → 12', () => {
    expect([1, 3, 6, 9].map(nextRaise)).toEqual([3, 6, 9, 12]);
  });
  it('says who took a finished trick, and nothing while it is open', () => {
    expect(trickResult({ lastWinner: 2 }, true)).toEqual({ kind: 'won', seat: 2 });
    expect(trickResult({ lastWinner: null }, true)).toEqual({ kind: 'tie' });
    expect(trickResult({ lastWinner: 2 }, false)).toBeNull();
  });
  it('marks the three Truco tricks from the viewer’s pair', () => {
    expect(trickMarks(table({ mySeat: 1, tricks: [1, null] }))).toEqual(['us', 'tie', 'open']);
    expect(trickMarks(table({ mySeat: 0, tricks: [1] }))).toEqual(['them', 'open', 'open']);
  });
  it('shows spectators the first pair as ours', () => {
    expect(ourTeam(table({ mySeat: -1 }))).toBe(0);
    expect(ourTeam(table({ mySeat: 3 }))).toBe(1);
  });
  it('ties each card to its seat, marking the last one and the trick winner', () => {
    const c = { rank: '3', suit: 's' };
    const open = placedCards(
      table({
        trick: [
          { seat: 2, card: c },
          { seat: 3, card: c },
        ],
      })
    );
    expect(open.map((p) => [p.seat, p.latest, p.win])).toEqual([
      [2, false, false],
      [3, true, false],
    ]);
    const done = placedCards(
      table({
        trick: [],
        lastTrick: [
          { seat: 0, card: c },
          { seat: 1, card: c },
        ],
        lastWinner: 1,
      })
    );
    expect(done.map((p) => [p.win, p.dim])).toEqual([
      [false, true],
      [true, false],
    ]);
  });
  it('counts lives down from five', () => {
    expect([0, 3, 5, 7].map(livesLeft)).toEqual([5, 2, 0, 0]);
  });
});
