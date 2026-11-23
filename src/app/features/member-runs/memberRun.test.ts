import { describe, expect, it } from 'vitest';
import {
  findMemberRun,
  memberRunKind,
  memberRunName,
  memberRunSummary,
  MemberRunItem,
  MemberRunKind,
  nameList,
} from './memberRun';

const person = (name: string, kind: MemberRunKind = 'join') => ({
  kind,
  userId: `@${name.toLowerCase()}:local`,
  name,
});

describe('memberRunKind', () => {
  it('tells joins, own leaves and invites from the rest', () => {
    expect(memberRunKind({ membership: 'join' }, { membership: 'invite' }, '@a', '@a')).toBe(
      'join'
    );
    expect(memberRunKind({ membership: 'leave' }, { membership: 'join' }, '@a', '@a')).toBe(
      'leave'
    );
    expect(memberRunKind({ membership: 'invite' }, {}, '@a', '@b')).toBe('invite');
    // A kick and a refused invite aren't "left".
    expect(memberRunKind({ membership: 'leave' }, { membership: 'join' }, '@a', '@b')).toBe(
      'other'
    );
    expect(memberRunKind({ membership: 'leave' }, { membership: 'invite' }, '@b', '@b')).toBe(
      'other'
    );
  });
});

describe('memberRunName', () => {
  it('uses the display name, the old one when leaving, else the id', () => {
    expect(memberRunName({ displayname: 'Alex' }, {}, '@alex:local')).toBe('Alex');
    expect(memberRunName({}, { displayname: 'Sam' }, '@sam:local')).toBe('Sam');
    expect(memberRunName({}, {}, '@bia:local')).toBe('bia');
  });
});

describe('nameList', () => {
  it('lists up to three names and counts the rest', () => {
    expect(nameList(['A'])).toBe('A');
    expect(nameList(['A', 'B'])).toBe('A and B');
    expect(nameList(['A', 'B', 'C'])).toBe('A, B and C');
    expect(nameList(['A', 'B', 'C', 'D', 'E'])).toBe('A, B and 3 more');
  });
});

describe('memberRunSummary', () => {
  it('has one part per kind, each person once', () => {
    expect(
      memberRunSummary([
        person('Alex'),
        person('Sam'),
        person('Alex', 'leave'),
        person('Alex'),
        person('Bia', 'other'),
      ])
    ).toEqual(['Alex and Sam joined', 'Alex left', '1 other change']);
  });

  it('drops an invite that ends in a join', () => {
    expect(
      memberRunSummary([person('Alex', 'invite'), person('Sam', 'invite'), person('Alex')])
    ).toEqual(['Sam was invited', 'Alex joined']);
  });
});

describe('findMemberRun', () => {
  // m is a membership change, x anything else; `days` puts items on different days.
  const timeline =
    (pattern: string, days = '') =>
    (i: number): MemberRunItem | undefined =>
      pattern[i] === 'm' ? { id: `e${i}`, day: days[i] ?? 'd', entry: person(`P${i}`) } : undefined;

  it('finds the run around an item and its head', () => {
    const at = timeline('xmmmx');
    expect(findMemberRun(2, 0, 5, at)).toMatchObject({ headId: 'e1', isHead: false });
    expect(findMemberRun(1, 0, 5, at)?.entries).toHaveLength(3);
    expect(findMemberRun(1, 0, 5, at)?.isHead).toBe(true);
  });

  it('leaves a lone change alone', () => {
    expect(findMemberRun(1, 0, 3, timeline('xmx'))).toBeUndefined();
  });

  it('stops at a new day and at the rendered range', () => {
    expect(findMemberRun(0, 0, 3, timeline('mmm', 'aab'))?.entries).toHaveLength(2);
    expect(findMemberRun(2, 2, 4, timeline('mmmm'))).toMatchObject({ headId: 'e2', isHead: true });
  });
});
