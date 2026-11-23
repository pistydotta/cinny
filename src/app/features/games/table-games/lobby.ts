import { TableSummary } from './types';

export type LobbySections = {
  invited: TableSummary[];
  mine: TableSummary[];
  open: TableSummary[];
  friends: TableSummary[];
  recent: TableSummary[];
};

/** Free seats: empty ones before the start, seats left to a bot after it. */
export const seatsLeft = (t: TableSummary) =>
  t.phase === 'waiting' ? t.capacity - t.players.length : t.vacant ?? 0;

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
    else if (t.phase === 'waiting' && t.players.length < t.capacity && !t.inviteOnly)
      s.open.push(t);
    // A running Fodinha with a seat someone left can be taken over.
    else if (t.phase !== 'waiting' && t.vacant && !t.inviteOnly) s.open.push(t);
    else if (t.players.some((p) => friends.has(p))) s.friends.push(t);
  });
  s.recent.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  const active = (a: TableSummary, b: TableSummary) => (b.activeAt ?? 0) - (a.activeAt ?? 0);
  s.mine.sort(active);
  s.friends.sort(active);
  // The table you'd want first: a waiting one (taking over a running seat can't be undone),
  // with a friend, closest to starting, then the one people last played at.
  const withFriend = (t: TableSummary) => t.players.some((p) => friends.has(p));
  s.open.sort(
    (a, b) =>
      Number(b.phase === 'waiting') - Number(a.phase === 'waiting') ||
      Number(withFriend(b)) - Number(withFriend(a)) ||
      seatsLeft(a) - seatsLeft(b) ||
      active(a, b)
  );
  return s;
}

/** Where "Play now" seats you: the best waiting table, or none (then you create one). */
export const playNowTable = (s: LobbySections) => s.open.find((t) => t.phase === 'waiting');

// No move by a person for this long and a running game shows as stopped: the server is
// playing absent people's turns, and closes the table after 30 minutes.
export const IDLE_MS = 3 * 60_000;
export const isIdle = (t: TableSummary, now: number) =>
  t.phase !== 'waiting' &&
  t.phase !== 'finished' &&
  t.activeAt !== undefined &&
  now - t.activeAt >= IDLE_MS;

/** Whether you were on the winning side of one of your finished games. */
export const wonBy = (t: TableSummary, me: string) =>
  (t.winners ?? []).some((seat) => t.players[seat] === me);
