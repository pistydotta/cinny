import { describe, expect, it } from 'vitest';
import { InviteState, inviteRows, inviteState, matchesQuery } from './inviteRows';

const person = (local: string, name = local, server = 'blz') => ({
  userId: `@${local}:${server}`,
  name,
});

const base = {
  myUserId: '@me:blz',
  domain: 'blz',
  friends: [person('ana', 'Ana'), person('bia', 'Bia')],
  known: [person('caio', 'Caio')],
  directory: [] as ReturnType<typeof person>[],
  stateOf: (): InviteState => 'can_invite',
};

describe('inviteState', () => {
  it('reads membership first, then what the space allows', () => {
    expect(inviteState('join', false, true)).toBe('member');
    expect(inviteState(undefined, true, true)).toBe('invited');
    expect(inviteState('invite', false, false)).toBe('invited');
    expect(inviteState('ban', false, true)).toBe('banned');
    expect(inviteState('leave', false, false)).toBe('outside_space');
    expect(inviteState(undefined, false, true)).toBe('can_invite');
  });
});

describe('inviteRows', () => {
  it('lists friends when nothing is typed', () => {
    const rows = inviteRows({ ...base, query: '' });
    expect(rows.map((r) => r.userId)).toEqual(['@ana:blz', '@bia:blz']);
    expect(rows.every((r) => r.friend)).toBe(true);
  });

  it('finds people who are not friends, from the directory and from rooms', () => {
    const rows = inviteRows({
      ...base,
      query: 'ca',
      directory: [person('carla', 'Carla'), person('caio', 'Caio'), person('cassio', 'C', 'other')],
    });
    expect(rows.map((r) => r.userId)).toEqual(['@caio:blz', '@carla:blz']);
    expect(rows.some((r) => r.friend)).toBe(false);
  });

  it('puts the typed ID first, then those you can invite, friends before others', () => {
    const states: Record<string, InviteState> = { '@ana:blz': 'member' };
    const rows = inviteRows({
      ...base,
      query: 'a',
      friends: [person('ana', 'Ana'), person('bia', 'Bia')],
      known: [person('caio', 'Caio'), person('me', 'Me')],
      typed: person('a'),
      stateOf: (id) => states[id] ?? 'can_invite',
    });
    expect(rows.map((r) => r.userId)).toEqual(['@a:blz', '@bia:blz', '@ana:blz', '@caio:blz']);
  });

  it('matches by display name or user name, ignoring "@" and the server', () => {
    expect(matchesQuery(person('xx', 'Joana'), 'jo')).toBe(true);
    expect(matchesQuery(person('joana', 'X'), '@joa:blz')).toBe(true);
    expect(matchesQuery(person('ana'), 'zz')).toBe(false);
  });
});
