import { describe, expect, it } from 'vitest';
import { isOldPokerRoom, OLD_POKER_ROOM_TYPE } from './oldPokerRooms';

describe('isOldPokerRoom', () => {
  it('matches the old poker table type', () => {
    expect(isOldPokerRoom({ type: OLD_POKER_ROOM_TYPE })).toBe(true);
  });

  it('never matches an ordinary room', () => {
    expect(isOldPokerRoom({})).toBe(false);
    expect(isOldPokerRoom({ room_version: '12' } as { type?: unknown })).toBe(false);
  });

  it('never matches a space', () => {
    expect(isOldPokerRoom({ type: 'm.space' })).toBe(false);
  });

  it('never matches other custom types or lookalikes', () => {
    expect(isOldPokerRoom({ type: 'io.github.pistydotta.poker.table.v2' })).toBe(false);
    expect(isOldPokerRoom({ type: 'io.github.pistydotta.poker' })).toBe(false);
    expect(isOldPokerRoom({ type: undefined })).toBe(false);
    expect(isOldPokerRoom({ type: null })).toBe(false);
  });

  it('does not match when the create event is unknown', () => {
    expect(isOldPokerRoom(undefined)).toBe(false);
  });
});
