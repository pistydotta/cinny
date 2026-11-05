import { describe, expect, it } from 'vitest';
import { musicDestination } from './musicDestination';

describe('private and shared music destinations', () => {
  it('stays private outside calls and on entry to a room', () => {
    expect(musicDestination()).toBe('personal');
    expect(musicDestination({ roomId: '!one:test', joined: true })).toBe('personal');
  });
  it('shares only with the explicitly selected call, never the next room or a rejoin', () => {
    const first = { roomId: '!one:test', joined: true };
    expect(musicDestination(first, first)).toBe(first.roomId);
    expect(musicDestination(undefined, first)).toBe('personal');
    expect(musicDestination({ roomId: '!two:test', joined: true }, first)).toBe('personal');
    expect(musicDestination({ ...first }, first)).toBe('personal');
    expect(musicDestination(first)).toBe('personal');
    first.joined = false;
    expect(musicDestination(first, first)).toBe('personal');
  });
});
