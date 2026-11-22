import { GameTable, TableSummary } from './types';

export type LeaveStep = 'leave' | 'cancel' | 'resign' | null;

/**
 * What going to another table does to my place at this one, by the table's own rules: before the
 * start a player leaves with a refund and the owner cancels (refunding everyone); in a running game
 * only resigning frees me, and it forfeits the stake. Spectators and finished games leave nothing.
 */
export const leaveStep = (table: GameTable, myId: string): LeaveStep => {
  const me = table.players[table.mySeat];
  if (!me || table.phase === 'finished') return null;
  if (table.phase === 'waiting') return table.ownerId === myId ? 'cancel' : 'leave';
  return me.eliminated ? null : 'resign';
};

/**
 * Where I can go from this table: the other waiting tables with a free seat that let me in (not
 * invite-only, or I was invited), and my own unfinished tables, which I just open.
 */
export const switchTargets = (
  tables: TableSummary[],
  currentId: string,
  myId: string
): (TableSummary & { mine: boolean })[] =>
  tables
    .filter((t) => t.id !== currentId && t.phase !== 'finished')
    .map((t) => ({ ...t, mine: t.players.includes(myId) }))
    .filter(
      (t) =>
        t.mine ||
        (t.phase === 'waiting' &&
          t.players.length < t.capacity &&
          (!t.inviteOnly || !!t.invited?.includes(myId)))
    )
    .sort((a, b) => Number(b.mine) - Number(a.mine));
