import { TableSummary } from './types';

export type LobbySections = {
  invited: TableSummary[];
  mine: TableSummary[];
  open: TableSummary[];
  friends: TableSummary[];
  recent: TableSummary[];
};

/**
 * What the card-game lobby shows: your invitations and tables, tables with a free seat, games
 * your friends are in (to watch), and your own recent results. Other people's running or
 * finished games are left out.
 */
export function lobbySections(
  tables: TableSummary[],
  me: string,
  friends: ReadonlySet<string>
): LobbySections {
  const s: LobbySections = { invited: [], mine: [], open: [], friends: [], recent: [] };
  tables.forEach((t) => {
    const seated = t.players.includes(me);
    if (t.phase === 'finished') {
      if (seated) s.recent.push(t);
    } else if (seated) s.mine.push(t);
    else if (t.phase === 'waiting' && t.invited?.includes(me)) s.invited.push(t);
    else if (t.phase === 'waiting' && t.players.length < t.capacity) s.open.push(t);
    else if (t.players.some((p) => friends.has(p))) s.friends.push(t);
  });
  s.recent.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  return s;
}

/** Whether you were on the winning side of one of your finished games. */
export const wonBy = (t: TableSummary, me: string) =>
  (t.winners ?? []).some((seat) => t.players[seat] === me);
