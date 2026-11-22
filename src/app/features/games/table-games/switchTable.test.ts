import { describe, expect, it } from 'vitest';
import { leaveStep, switchTargets } from './switchTable';
import { GameTable, TableSummary } from './types';

const table = (over: Partial<GameTable>): GameTable =>
  ({
    id: 't',
    ownerId: '@o:x',
    name: 'T',
    kind: 'truco',
    stake: 0,
    capacity: 4,
    players: [{ userId: '@o:x' }, { userId: '@me:x' }],
    phase: 'waiting',
    mySeat: 1,
    comments: [],
    ...over,
  } as GameTable);

describe('leaveStep', () => {
  it('follows the refund rules of the current table', () => {
    expect(leaveStep(table({}), '@me:x')).toBe('leave');
    expect(leaveStep(table({ mySeat: 0 }), '@o:x')).toBe('cancel');
    expect(leaveStep(table({ phase: 'play' }), '@me:x')).toBe('resign');
    expect(leaveStep(table({ phase: 'finished' }), '@me:x')).toBe(null);
    expect(leaveStep(table({ mySeat: -1 }), '@w:x')).toBe(null);
  });
});

describe('switchTargets', () => {
  const t = (id: string, over: Partial<TableSummary> = {}): TableSummary => ({
    id,
    name: id,
    kind: 'truco',
    stake: 0,
    capacity: 4,
    phase: 'waiting',
    players: ['@a:x'],
    ...over,
  });
  it('offers open tables that let me in and my own, never this one or full ones', () => {
    const list = [
      t('here', { players: ['@me:x'] }),
      t('open'),
      t('full', { players: ['@a:x', '@b:x', '@c:x', '@d:x'] }),
      t('closed', { inviteOnly: true }),
      t('invited', { inviteOnly: true, invited: ['@me:x'] }),
      t('running', { phase: 'play' }),
      t('mine', { phase: 'play', players: ['@me:x'] }),
      t('done', { phase: 'finished', players: ['@me:x'] }),
    ];
    expect(switchTargets(list, 'here', '@me:x').map((x) => x.id)).toEqual([
      'mine',
      'open',
      'invited',
    ]);
  });
});
