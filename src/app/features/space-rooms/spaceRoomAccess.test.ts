import { describe, expect, it } from 'vitest';
import { canInviteToRoom, linkedSpaceIds, pickableMembers } from './spaceRoomAccess';

describe('linkedSpaceIds', () => {
  it('keeps only links that still have via', () => {
    expect(
      linkedSpaceIds([
        { stateKey: '!a:x', via: ['x'] },
        { stateKey: '!gone:x', via: [] },
        { stateKey: '!old:x' },
        { stateKey: '', via: ['x'] },
      ])
    ).toEqual(['!a:x']);
  });
});

describe('canInviteToRoom', () => {
  it('lets anyone into a room outside spaces', () => {
    expect(canInviteToRoom('@d:x', undefined)).toBe(true);
  });

  it('only lets space members into a space room', () => {
    const members = new Set(['@a:x']);
    expect(canInviteToRoom('@a:x', members)).toBe(true);
    expect(canInviteToRoom('@d:x', members)).toBe(false);
  });
});

describe('pickableMembers', () => {
  it('leaves you out and sorts by name', () => {
    expect(
      pickableMembers(
        [
          { userId: '@me:x', name: 'me' },
          { userId: '@b:x', name: 'bruno' },
          { userId: '@a:x', name: 'Ana' },
        ],
        '@me:x'
      ).map((m) => m.userId)
    ).toEqual(['@a:x', '@b:x']);
  });
});
