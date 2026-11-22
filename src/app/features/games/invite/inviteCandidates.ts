export type CandidateSource = 'call' | 'friend' | 'server';
export type Candidate = { userId: string; name: string; sources: CandidateSource[] };
export type TableStatus = 'member' | 'invited';

const ORDER: CandidateSource[] = ['call', 'friend', 'server'];
const rank = (c: Candidate) => Math.min(...c.sources.map((s) => ORDER.indexOf(s)));

const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * One row per person, whatever lists they came from: those in my call first, then friends, then
 * everyone else, each by name. Myself never.
 */
export const mergeCandidates = (
  lists: { source: CandidateSource; userIds: string[] }[],
  nameOf: (userId: string) => string,
  myId: string
): Candidate[] => {
  const byId = new Map<string, Candidate>();
  lists.forEach(({ source, userIds }) =>
    userIds.forEach((userId) => {
      if (userId === myId) return;
      const found = byId.get(userId);
      if (found) {
        if (!found.sources.includes(source)) found.sources.push(source);
      } else byId.set(userId, { userId, name: nameOf(userId), sources: [source] });
    })
  );
  return [...byId.values()].sort(
    (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
};

/** Matches the display name or the user id, ignoring case and accents. */
export const matchesQuery = (candidate: Candidate, query: string): boolean => {
  const q = fold(query.trim());
  if (!q) return true;
  return fold(candidate.name).includes(q) || fold(candidate.userId).includes(q);
};

/** Who "invite all" would add: shown, not at the table or invited yet. */
export const invitable = (shown: Candidate[], status: ReadonlyMap<string, TableStatus>): string[] =>
  shown.filter((c) => !status.has(c.userId)).map((c) => c.userId);
