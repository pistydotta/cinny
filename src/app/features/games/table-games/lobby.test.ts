import { describe, expect, it } from 'vitest';
import { isIdle, lobbySections, playNowTable, seatsLeft, wonBy } from './lobby';
import { TableSummary } from './types';

const t = (id: string, over: Partial<TableSummary>): TableSummary => ({
  id,
  name: id,
  kind: 'truco',
  stake: 0,
  capacity: 4,
  phase: 'waiting',
  players: [],
  ...over,
});

describe('card-game lobby', () => {
  const friends = new Set(['@ana:x']);
  const sections = lobbySections(
    [
      t('mine', { phase: 'play', players: ['@me:x', 'bot:1', 'bot:2', 'bot:3'] }),
      t('invite', { players: ['@ana:x'], invited: ['@me:x'] }),
      t('open', { players: ['@bia:x'] }),
      t('invite-only', { players: ['@bia:x'], inviteOnly: true }),
      t('full-stranger', { players: ['@a:x', '@b:x', '@c:x', '@d:x'] }),
      t('friend-playing', { phase: 'play', players: ['@ana:x', 'bot:1', 'bot:2', 'bot:3'] }),
      t('stranger-playing', { phase: 'play', players: ['@bia:x', 'bot:1', 'bot:2', 'bot:3'] }),
      t('seat-left', { kind: 'fodinha', phase: 'play', players: ['@bia:x', 'bot:1'], vacant: 1 }),
      t('old', { phase: 'finished', players: ['@me:x'], winners: [0], updatedAt: 1 }),
      t('newer', { phase: 'finished', players: ['bot:1', '@me:x'], winners: [0], updatedAt: 2 }),
      t('stranger-finished', { phase: 'finished', players: ['@bia:x'], updatedAt: 3 }),
    ],
    '@me:x',
    friends
  );
  const ids = (list: TableSummary[]) => list.map((x) => x.id);

  it('keeps your tables, invitations and open seats, without invite-only tables you are not in', () => {
    expect(ids(sections.mine)).toEqual(['mine']);
    expect(ids(sections.invited)).toEqual(['invite']);
    expect(ids(sections.open)).toEqual(['open', 'seat-left']);
  });
  it('shows running games only when a friend is in them', () => {
    expect(ids(sections.friends)).toEqual(['friend-playing']);
  });
  it('lists only your own finished games, newest first', () => {
    expect(ids(sections.recent)).toEqual(['newer', 'old']);
    expect(wonBy(sections.recent[0], '@me:x')).toBe(false);
    expect(wonBy(sections.recent[1], '@me:x')).toBe(true);
  });
});

describe('choosing a table', () => {
  const friends = new Set(['@ana:x']);
  const ids = (list: TableSummary[]) => list.map((x) => x.id);
  const open = lobbySections(
    [
      t('empty-new', { players: ['@a:x'], activeAt: 9 }),
      t('take-over', {
        kind: 'fodinha',
        phase: 'play',
        capacity: 3,
        players: ['@b:x', 'bot:1', '@c:x'],
        vacant: 1,
      }),
      t('one-left', { players: ['@a:x', '@b:x', '@c:x'], activeAt: 1 }),
      t('two-left-older', { players: ['@a:x', '@b:x'], activeAt: 2 }),
      t('two-left', { players: ['@a:x', '@b:x'], activeAt: 5 }),
      t('with-friend', { players: ['@ana:x'], activeAt: 0 }),
    ],
    '@me:x',
    friends
  );

  it('puts waiting tables with a friend first, then the closest to starting, then the latest played', () => {
    expect(ids(open.open)).toEqual([
      'with-friend',
      'one-left',
      'two-left',
      'two-left-older',
      'empty-new',
      'take-over',
    ]);
  });
  it('never sends Play now to a running game', () => {
    expect(playNowTable(open)?.id).toBe('with-friend');
    expect(playNowTable(lobbySections([open.open[5]], '@me:x', friends))).toBeUndefined();
  });
  it('counts seats left to a bot as free', () => {
    expect(seatsLeft(open.open[5])).toBe(1);
    expect(seatsLeft(open.open[1])).toBe(1);
  });
  it('shows a running game nobody has moved in for three minutes as stopped', () => {
    const running = t('r', { phase: 'play', activeAt: 0 });
    expect(isIdle(running, 3 * 60_000 - 1)).toBe(false);
    expect(isIdle(running, 3 * 60_000)).toBe(true);
    expect(isIdle(t('w', { activeAt: 0 }), 10 * 60_000)).toBe(false);
  });
});
