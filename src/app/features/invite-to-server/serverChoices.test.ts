import { describe, expect, it } from 'vitest';
import { ServerChoice, serverChoiceList } from './serverChoices';

const choice = (roomId: string, name: string, lastActive: number): ServerChoice => ({
  roomId,
  name,
  lastActive,
});

const servers = [
  choice('!a', 'alpha', 10),
  choice('!b', 'Bravo', 50),
  choice('!c', 'charlie', 30),
  choice('!d', 'delta', 40),
  choice('!e', 'echo', 0),
];

const ids = (list: ServerChoice[]) => list.map((c) => c.roomId);

describe('serverChoiceList', () => {
  it('puts the three most used first and the rest by name', () => {
    const list = serverChoiceList(servers, '');
    expect(ids(list.recent)).toEqual(['!b', '!d', '!c']);
    expect(ids(list.others)).toEqual(['!a', '!e']);
  });

  it('searches by name, ignoring case', () => {
    const list = serverChoiceList(servers, '  BR ');
    expect(list.recent).toEqual([]);
    expect(ids(list.others)).toEqual(['!b']);
  });

  it('shows everything as recent when there are few servers', () => {
    const list = serverChoiceList(servers.slice(0, 2), '');
    expect(ids(list.recent)).toEqual(['!b', '!a']);
    expect(list.others).toEqual([]);
  });
});
