import { describe, expect, it } from 'vitest';
import {
  HierarchyRoom,
  isAlwaysJoined,
  isAwaitingAutoJoin,
  roomsToAutoJoin,
  shouldSkipAutoJoin,
} from './spaceAutoJoin';

const child = (roomId: string, via = ['example.org']) => ({
  state_key: roomId,
  content: { via },
});

const rooms: HierarchyRoom[] = [
  {
    room_id: '!space',
    join_rule: 'invite',
    children_state: [child('!general'), child('!voice'), child('!sub'), child('!secret')],
  },
  { room_id: '!general', join_rule: 'restricted', children_state: [] },
  { room_id: '!voice', join_rule: 'public', children_state: [] },
  { room_id: '!sub', join_rule: 'restricted', children_state: [child('!inner', ['other.org'])] },
  { room_id: '!secret', join_rule: 'invite', children_state: [] },
  { room_id: '!inner', join_rule: 'knock_restricted', children_state: [] },
];

describe('roomsToAutoJoin', () => {
  it('joins the rooms and sub-spaces anyone in the space may join, parents first', () => {
    expect(roomsToAutoJoin(rooms, '!space', () => false)).toEqual([
      { roomId: '!general', via: ['example.org'] },
      { roomId: '!voice', via: ['example.org'] },
      { roomId: '!sub', via: ['example.org'] },
      { roomId: '!inner', via: ['other.org'] },
    ]);
  });

  it('skips rooms the caller says to skip', () => {
    const joined = new Set(['!general', '!sub']);
    expect(roomsToAutoJoin(rooms, '!space', (id) => joined.has(id)).map((r) => r.roomId)).toEqual([
      '!voice',
      '!inner',
    ]);
  });

  it('ignores rooms that no space in the list points to', () => {
    const stray = [...rooms, { room_id: '!stray', join_rule: 'public', children_state: [] }];
    expect(roomsToAutoJoin(stray, '!space', () => false).map((r) => r.roomId)).not.toContain(
      '!stray'
    );
  });
});

describe('shouldSkipAutoJoin', () => {
  it('joins again after leaving: a public room follows the space', () => {
    expect(shouldSkipAutoJoin('leave', false)).toBe(false);
  });

  it('joins a room the client knows nothing about', () => {
    expect(shouldSkipAutoJoin(undefined, false)).toBe(false);
  });

  it('skips rooms already joined, bans and earlier attempts', () => {
    expect(shouldSkipAutoJoin('join', false)).toBe(true);
    expect(shouldSkipAutoJoin('ban', false)).toBe(true);
    expect(shouldSkipAutoJoin(undefined, true)).toBe(true);
  });
});

describe('isAlwaysJoined', () => {
  it('holds for an open room inside a space you joined', () => {
    expect(isAlwaysJoined('restricted', true)).toBe(true);
    expect(isAlwaysJoined('public', true)).toBe(true);
    expect(isAlwaysJoined('knock_restricted', true)).toBe(true);
  });

  it('leaves private rooms and rooms outside your spaces alone', () => {
    expect(isAlwaysJoined('invite', true)).toBe(false);
    expect(isAlwaysJoined('knock', true)).toBe(false);
    expect(isAlwaysJoined(undefined, true)).toBe(false);
    expect(isAlwaysJoined('public', false)).toBe(false);
  });
});

describe('isAwaitingAutoJoin', () => {
  const children = ['!general', '!secret'];
  const state = (checked: string[], awaiting: string[]) => ({
    checkedSpaces: new Set(checked),
    awaiting: new Set(awaiting),
  });

  it('waits for any room of the space until the space was checked', () => {
    expect(isAwaitingAutoJoin('!secret', '!space', children, state([], []))).toBe(true);
  });

  it('then waits only for the rooms being joined', () => {
    const checked = state(['!space'], ['!general']);
    expect(isAwaitingAutoJoin('!general', '!space', children, checked)).toBe(true);
    expect(isAwaitingAutoJoin('!secret', '!space', children, checked)).toBe(false);
  });

  it('never waits for a room outside the space', () => {
    expect(isAwaitingAutoJoin('!other', '!space', children, state([], ['!other']))).toBe(false);
    expect(isAwaitingAutoJoin(undefined, '!space', children, state([], []))).toBe(false);
  });
});
