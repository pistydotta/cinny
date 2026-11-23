import { tr } from '../translation/tr';

// Joins, leaves and invites in a row become one line in the timeline ("Alex, Sam e mais 2
// entraram"), so a busy room doesn't open on a wall of them. A run is two or more membership
// changes with nothing else between them, on the same day; the line opens into the events.

export type MemberRunKind = 'join' | 'leave' | 'invite' | 'other';

export type MemberRunEntry = { kind: MemberRunKind; userId: string; name: string };

type MemberContent = { membership?: unknown; displayname?: unknown };

export const memberRunKind = (
  content: MemberContent,
  prevContent: MemberContent,
  senderId: string | undefined,
  userId: string | undefined
): MemberRunKind => {
  if (content.membership === 'join' && prevContent.membership !== 'join') return 'join';
  if (content.membership === 'invite') return 'invite';
  // Leaving on your own after being in the room; a kick, a refused invite or a ban is "other".
  if (content.membership === 'leave' && prevContent.membership === 'join' && senderId === userId) {
    return 'leave';
  }
  return 'other';
};

export const memberRunName = (
  content: MemberContent,
  prevContent: MemberContent,
  userId: string
) => {
  const name = [content.displayname, prevContent.displayname].find(
    (n): n is string => typeof n === 'string' && n.length > 0
  );
  return name ?? userId.replace(/^@/, '').split(':')[0];
};

/** "A", "A e B", "A, B e C", "A, B e mais 3". */
export const nameList = (names: string[]): string => {
  if (names.length === 1) return names[0];
  if (names.length <= 3) {
    return tr('timeline.member_run.and', '{{first}} and {{last}}', {
      first: names.slice(0, -1).join(', '),
      last: names[names.length - 1],
    });
  }
  return tr('timeline.member_run.and_more', '{{first}} and {{count}} more', {
    first: names.slice(0, 2).join(', '),
    count: names.length - 2,
  });
};

const unique = (entries: MemberRunEntry[]) => {
  const seen = new Set<string>();
  return entries.filter((e) => !seen.has(e.userId) && seen.add(e.userId));
};

/** The run's summary, one part per kind in the order they first happen. */
export const memberRunSummary = (all: MemberRunEntry[]): string[] => {
  // An invite that ends in a join in the same run says nothing more than the join.
  const entries = all.filter(
    (e, i) =>
      e.kind !== 'invite' ||
      !all.slice(i + 1).some((later) => later.userId === e.userId && later.kind === 'join')
  );
  const kinds = [...new Set(entries.map((e) => e.kind))];
  return kinds.map((kind) => {
    const ofKind = entries.filter((e) => e.kind === kind);
    if (kind === 'other') {
      return ofKind.length === 1
        ? tr('timeline.member_run.other_one', '1 other change')
        : tr('timeline.member_run.other', '{{count}} other changes', { count: ofKind.length });
    }
    const people = unique(ofKind);
    const names = nameList(people.map((e) => e.name));
    const one = people.length === 1;
    if (kind === 'join') {
      return one
        ? tr('timeline.member_run.joined_one', '{{names}} joined', { names })
        : tr('timeline.member_run.joined', '{{names}} joined', { names });
    }
    if (kind === 'leave') {
      return one
        ? tr('timeline.member_run.left_one', '{{names}} left', { names })
        : tr('timeline.member_run.left', '{{names}} left', { names });
    }
    return one
      ? tr('timeline.member_run.invited_one', '{{names}} was invited', { names })
      : tr('timeline.member_run.invited', '{{names}} were invited', { names });
  });
};

export type MemberRunItem = { id: string; day: string; entry: MemberRunEntry };

export type MemberRun = { headId: string; isHead: boolean; entries: MemberRunEntry[] };

/**
 * The run `item` belongs to, looking only inside the rendered range [start, end): `at` gives a
 * membership change at an index, or undefined for anything else. Undefined for a lone change.
 */
export const findMemberRun = (
  item: number,
  start: number,
  end: number,
  at: (index: number) => MemberRunItem | undefined
): MemberRun | undefined => {
  const self = at(item);
  if (!self) return undefined;
  const inRun = (i: number) => {
    if (i < start || i >= end) return undefined;
    const other = at(i);
    return other && other.day === self.day ? other : undefined;
  };
  let head = item;
  while (inRun(head - 1)) head -= 1;
  let last = item;
  while (inRun(last + 1)) last += 1;
  if (head === last) return undefined;
  const entries: MemberRunEntry[] = [];
  for (let i = head; i <= last; i += 1) entries.push((inRun(i) as MemberRunItem).entry);
  return { headId: (inRun(head) as MemberRunItem).id, isHead: head === item, entries };
};
