import { describe, expect, it } from 'vitest';
import { pokerTargets } from './switchTargets';
import { LobbyList, LobbyTable } from './types';

const t = (id: string): LobbyTable => ({
  id,
  name: id,
  smallBlind: 10,
  bigBlind: 20,
  ownerId: '@o:x',
  memberCount: 2,
  myChips: 0,
});

describe('pokerTargets', () => {
  it('lists my other tables, then invites, then public ones, each once and never this one', () => {
    const list: LobbyList = {
      tables: [t('here'), t('mine')],
      invites: [{ ...t('invited'), invitedBy: '@o:x' }],
      publicTables: [t('open'), t('mine')],
      practiceId: null,
    };
    expect(pokerTargets(list, 'here').map((x) => [x.id, x.via])).toEqual([
      ['mine', 'member'],
      ['invited', 'invite'],
      ['open', 'public'],
    ]);
  });
});
