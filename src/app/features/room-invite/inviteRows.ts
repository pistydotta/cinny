// The people the invite dialog lists, and what it can do for each one. Plain logic, so it can be
// tested without React or a Matrix client.

export type InviteState = 'can_invite' | 'member' | 'invited' | 'banned' | 'outside_space';

export type Person = { userId: string; name: string; avatarMxc?: string };

export type InviteRow = Person & { state: InviteState; friend: boolean };

// `membership` is the person's membership in the room; `inSpace` says whether a room inside a
// space may take them (always true for rooms outside spaces).
export const inviteState = (
  membership: string | undefined,
  invitedHere: boolean,
  inSpace: boolean
): InviteState => {
  if (membership === 'join') return 'member';
  if (membership === 'invite' || invitedHere) return 'invited';
  if (membership === 'ban') return 'banned';
  if (!inSpace) return 'outside_space';
  return 'can_invite';
};

const localpart = (userId: string) => userId.slice(1).split(':')[0];

export const matchesQuery = (person: Person, query: string): boolean => {
  const q = query.trim().toLowerCase().replace(/^@/, '').split(':')[0];
  if (!q) return true;
  return (
    person.name.toLowerCase().includes(q) || localpart(person.userId).toLowerCase().includes(q)
  );
};

type RowsInput = {
  query: string;
  myUserId: string;
  domain: string;
  friends: Person[];
  // People we know from rooms, DMs and the space, matched against the query here.
  known: Person[];
  // What the server's directory found for the query; already matched there.
  directory: Person[];
  // The full user ID the query spells out, if it can be one.
  typed?: Person;
  stateOf: (userId: string) => InviteState;
  limit?: number;
};

// With no query: your friends. With one: friends, then everyone else who matches, with the exact
// ID typed first if nobody else is it. Those you can invite come first; your own account and
// other servers never show.
export const inviteRows = ({
  query,
  myUserId,
  domain,
  friends,
  known,
  directory,
  typed,
  stateOf,
  limit = 30,
}: RowsInput): InviteRow[] => {
  const friendIds = new Set(friends.map((f) => f.userId));
  const searching = query.trim().length > 0;
  const pool = searching
    ? [
        ...friends.filter((p) => matchesQuery(p, query)),
        ...known.filter((p) => matchesQuery(p, query)),
        ...directory,
      ]
    : friends;

  const seen = new Set<string>();
  const rows: InviteRow[] = [];
  const add = (person: Person) => {
    if (seen.has(person.userId) || person.userId === myUserId) return;
    if (!person.userId.endsWith(`:${domain}`)) return;
    seen.add(person.userId);
    rows.push({ ...person, state: stateOf(person.userId), friend: friendIds.has(person.userId) });
  };
  pool.forEach(add);

  const rank = (row: InviteRow) => (row.state === 'can_invite' ? 0 : 1) + (row.friend ? 0 : 2);
  rows.sort(
    (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
  // An ID nobody else matched still gets a row, so anyone can be invited by their exact ID.
  if (searching && typed && !seen.has(typed.userId)) {
    add(typed);
    const last = rows.pop();
    if (last) rows.unshift(last);
  }
  return rows.slice(0, limit);
};
