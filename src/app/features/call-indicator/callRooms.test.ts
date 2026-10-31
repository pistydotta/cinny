import { describe, expect, it } from 'vitest';
import { anyCallUnderSpaces, anyRoomInCall, roomsInCall } from './callRooms';

describe('roomsInCall', () => {
  it('keeps joined rooms that have someone in a call', () => {
    expect(
      roomsInCall([
        { roomId: '!call', joined: true, callMembers: 2 },
        { roomId: '!quiet', joined: true, callMembers: 0 },
        { roomId: '!left', joined: false, callMembers: 1 },
      ])
    ).toEqual(new Set(['!call']));
  });
});

describe('anyRoomInCall', () => {
  it('looks only at the rooms given', () => {
    const inCall = new Set(['!call']);
    expect(anyRoomInCall(inCall, ['!quiet', '!call'])).toBe(true);
    expect(anyRoomInCall(inCall, ['!quiet'])).toBe(false);
  });
});

describe('anyCallUnderSpaces', () => {
  const parents = new Map([['!call', new Set(['$sub', '$top'])]]);
  const parentsOf = (roomId: string) => parents.get(roomId) ?? new Set<string>();

  it('finds a call in a room of the space or of a space inside it', () => {
    expect(anyCallUnderSpaces(new Set(['!call']), ['$top'], parentsOf)).toBe(true);
    expect(anyCallUnderSpaces(new Set(['!call']), ['$sub'], parentsOf)).toBe(true);
  });

  it('ignores calls elsewhere', () => {
    expect(anyCallUnderSpaces(new Set(['!call']), ['$other'], parentsOf)).toBe(false);
    expect(anyCallUnderSpaces(new Set(['!orphan']), ['$top'], parentsOf)).toBe(false);
  });
});
