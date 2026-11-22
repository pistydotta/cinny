import { describe, expect, it } from 'vitest';
import { invitable, matchesQuery, mergeCandidates } from './inviteCandidates';

const names: Record<string, string> = {
  '@a:x': 'Ana',
  '@b:x': 'Bruno',
  '@c:x': 'Cláudio',
  '@me:x': 'Me',
};
const nameOf = (id: string) => names[id] ?? id;

describe('mergeCandidates', () => {
  it('merges sources, drops me, orders call then friends then server', () => {
    const list = mergeCandidates(
      [
        { source: 'friend', userIds: ['@b:x', '@a:x', '@me:x'] },
        { source: 'server', userIds: ['@c:x', '@a:x'] },
        { source: 'call', userIds: ['@c:x'] },
      ],
      nameOf,
      '@me:x'
    );
    expect(list.map((c) => c.userId)).toEqual(['@c:x', '@a:x', '@b:x']);
    expect(list[0].sources).toEqual(['server', 'call']);
    expect(list[1].sources).toEqual(['friend', 'server']);
  });
});

describe('matchesQuery', () => {
  const claudio = { userId: '@c:x', name: 'Cláudio', sources: [] };
  it('ignores case and accents and matches the id', () => {
    expect(matchesQuery(claudio, 'CLAU')).toBe(true);
    expect(matchesQuery(claudio, '@c:')).toBe(true);
    expect(matchesQuery(claudio, 'ana')).toBe(false);
    expect(matchesQuery(claudio, '  ')).toBe(true);
  });
});

describe('invitable', () => {
  it('skips members and invitees', () => {
    const shown = ['@a:x', '@b:x', '@c:x'].map((userId) => ({ userId, name: userId, sources: [] }));
    const status = new Map([
      ['@a:x', 'member' as const],
      ['@b:x', 'invited' as const],
    ]);
    expect(invitable(shown, status)).toEqual(['@c:x']);
  });
});
