import { describe, expect, it } from 'vitest';
import { filterFriends, pickChatTarget } from './newChat';

describe('pickChatTarget', () => {
  const dms: Record<string, string> = { '@ann:s': '!dm-ann' };
  const findDM = (id: string) => dms[id];

  it('opens the existing DM for one person', () => {
    expect(pickChatTarget(['@ann:s'], findDM)).toEqual({ kind: 'open', roomId: '!dm-ann' });
  });

  it('creates a DM for one person without one', () => {
    expect(pickChatTarget(['@bob:s'], findDM)).toEqual({ kind: 'create', invite: ['@bob:s'] });
  });

  it('creates a group for two or more, even if one has a DM', () => {
    expect(pickChatTarget(['@ann:s', '@bob:s'], findDM)).toEqual({
      kind: 'create',
      invite: ['@ann:s', '@bob:s'],
    });
  });

  it('counts a person picked twice once', () => {
    expect(pickChatTarget(['@ann:s', '@ann:s'], findDM)).toEqual({
      kind: 'open',
      roomId: '!dm-ann',
    });
  });

  it('returns nothing when nobody is picked', () => {
    expect(pickChatTarget([], findDM)).toBeUndefined();
  });
});

describe('filterFriends', () => {
  const ids = ['@ann:s', '@bob:s'];
  const names: Record<string, string> = { '@ann:s': 'Annie', '@bob:s': 'Robert' };
  const nameOf = (id: string) => names[id];

  it('keeps everyone for an empty query', () => {
    expect(filterFriends(ids, '  ', nameOf)).toEqual(ids);
  });

  it('matches the display name, ignoring case', () => {
    expect(filterFriends(ids, 'ROB', nameOf)).toEqual(['@bob:s']);
  });

  it('matches the user ID', () => {
    expect(filterFriends(ids, 'ann:', nameOf)).toEqual(['@ann:s']);
  });
});
