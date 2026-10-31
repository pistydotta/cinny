import { describe, expect, it } from 'vitest';
import { parsePinnedChats, pinnedFirst, togglePinnedChat } from './pinnedChats';

describe('parsePinnedChats', () => {
  it('reads the saved rooms', () => {
    expect(parsePinnedChats({ rooms: ['!a', '!b'] })).toEqual(['!a', '!b']);
  });

  it('copes with nothing saved or a bad value', () => {
    expect(parsePinnedChats(undefined)).toEqual([]);
    expect(parsePinnedChats({ rooms: 'nope' })).toEqual([]);
    expect(parsePinnedChats({ rooms: ['!a', 1] })).toEqual(['!a']);
  });
});

describe('togglePinnedChat', () => {
  it('adds a new pin at the end', () => {
    expect(togglePinnedChat(['!a'], '!b')).toEqual(['!a', '!b']);
  });

  it('removes a pin that exists', () => {
    expect(togglePinnedChat(['!a', '!b'], '!a')).toEqual(['!b']);
  });
});

describe('pinnedFirst', () => {
  it('puts pins first, in the order they were pinned, and keeps the rest in order', () => {
    expect(pinnedFirst(['!a', '!b', '!c', '!d'], ['!c', '!b'])).toEqual(['!c', '!b', '!a', '!d']);
  });

  it('ignores pins for chats not in the list', () => {
    expect(pinnedFirst(['!a'], ['!gone'])).toEqual(['!a']);
  });
});
