// Ranks the hub's "Happening now" rows by how much a table is about you. Kept free of
// React so it can be tested.

export type Relevance = 'seated' | 'invited' | 'call' | 'friend';

export type RankInput = {
  people: string[];
  seated: boolean;
  invited: boolean;
  updatedAt?: number;
  // The last move by a person; timeouts and bots also change `updatedAt`.
  activeAt?: number;
  // A running game nobody has moved in for a while (lobby's `isIdle`).
  idle?: boolean;
};

export type Circle = { call: Set<string>; friends: Set<string> };

// Strangers' tables are left out: they are still in each game's own lobby.
export const relevance = (t: RankInput, circle: Circle): Relevance | undefined => {
  if (t.seated) return 'seated';
  if (t.invited) return 'invited';
  if (t.people.some((p) => circle.call.has(p))) return 'call';
  if (t.people.some((p) => circle.friends.has(p))) return 'friend';
  return undefined;
};

const ORDER: Record<Relevance, number> = { seated: 0, invited: 1, call: 2, friend: 3 };
const last = (t: RankInput) => t.activeAt ?? t.updatedAt ?? 0;

export const rank = <T extends RankInput>(
  tables: T[],
  circle: Circle
): (T & { relevance: Relevance })[] =>
  tables
    .flatMap((t) => {
      const r = relevance(t, circle);
      return r ? [{ ...t, relevance: r }] : [];
    })
    // Stopped games go below every live one: a table nobody plays isn't happening now.
    .sort(
      (a, b) =>
        Number(!!a.idle) - Number(!!b.idle) ||
        ORDER[a.relevance] - ORDER[b.relevance] ||
        last(b) - last(a)
    );
