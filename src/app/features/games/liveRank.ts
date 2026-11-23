// Ranks the hub's "Happening now" rows by how much a table is about you. Kept free of
// React so it can be tested.

export type Relevance = 'seated' | 'invited' | 'call' | 'friend';

export type RankInput = {
  people: string[];
  seated: boolean;
  invited: boolean;
  updatedAt?: number;
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

export const rank = <T extends RankInput>(
  tables: T[],
  circle: Circle
): (T & { relevance: Relevance })[] =>
  tables
    .flatMap((t) => {
      const r = relevance(t, circle);
      return r ? [{ ...t, relevance: r }] : [];
    })
    .sort(
      (a, b) => ORDER[a.relevance] - ORDER[b.relevance] || (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
    );
