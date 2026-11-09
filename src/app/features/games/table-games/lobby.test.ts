import { describe, expect, it } from 'vitest';
import { lobbySections, wonBy } from './lobby';
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
      t('full-stranger', { players: ['@a:x', '@b:x', '@c:x', '@d:x'] }),
      t('friend-playing', { phase: 'play', players: ['@ana:x', 'bot:1', 'bot:2', 'bot:3'] }),
      t('stranger-playing', { phase: 'play', players: ['@bia:x', 'bot:1', 'bot:2', 'bot:3'] }),
      t('old', { phase: 'finished', players: ['@me:x'], winners: [0], updatedAt: 1 }),
      t('newer', { phase: 'finished', players: ['bot:1', '@me:x'], winners: [0], updatedAt: 2 }),
      t('stranger-finished', { phase: 'finished', players: ['@bia:x'], updatedAt: 3 }),
    ],
    '@me:x',
    friends
  );
  const ids = (list: TableSummary[]) => list.map((x) => x.id);

  it('keeps your tables, invitations and open seats', () => {
    expect(ids(sections.mine)).toEqual(['mine']);
    expect(ids(sections.invited)).toEqual(['invite']);
    expect(ids(sections.open)).toEqual(['open']);
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
