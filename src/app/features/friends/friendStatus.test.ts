import { describe, expect, it } from 'vitest';
import { getFriendStatus } from './friendStatus';

const lists = {
  friends: [{ userId: '@a:x', since: '' }],
  incoming: [{ userId: '@b:x', at: '' }],
  outgoing: [{ userId: '@c:x', at: '' }],
};

describe('getFriendStatus', () => {
  it('is unknown before the list loads', () => {
    expect(getFriendStatus(undefined, '@a:x')).toBe('unknown');
  });

  it('finds friends and requests both ways', () => {
    expect(getFriendStatus(lists, '@a:x')).toBe('friend');
    expect(getFriendStatus(lists, '@b:x')).toBe('incoming');
    expect(getFriendStatus(lists, '@c:x')).toBe('outgoing');
    expect(getFriendStatus(lists, '@d:x')).toBe('none');
  });
});
