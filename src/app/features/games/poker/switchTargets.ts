import { LobbyList } from './types';

export type PokerTarget = {
  id: string;
  name: string;
  smallBlind: number;
  bigBlind: number;
  members: number;
  /** How I get in: already a member, accept an invite, or sit at a public table. */
  via: 'member' | 'invite' | 'public';
};

/** The other friends' tables I can go to from this one: mine first, then invites, then public ones. */
export const pokerTargets = (list: LobbyList, currentId: string): PokerTarget[] => {
  const seen = new Set([currentId]);
  const out: PokerTarget[] = [];
  const add = (tables: LobbyList['tables'], via: PokerTarget['via']) =>
    tables.forEach((t) => {
      if (seen.has(t.id)) return;
      seen.add(t.id);
      out.push({
        id: t.id,
        name: t.name,
        smallBlind: t.smallBlind,
        bigBlind: t.bigBlind,
        members: t.memberCount,
        via,
      });
    });
  add(list.tables, 'member');
  add(list.invites, 'invite');
  add(list.publicTables, 'public');
  return out;
};
