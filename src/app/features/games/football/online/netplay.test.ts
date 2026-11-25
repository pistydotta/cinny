// The simulated network delivers messages from closures inside the frame loop.
/* eslint-disable no-loop-func */
import { describe, expect, it } from 'vitest';
import { createMatch, step } from '../engine/match';
import { PackedInput, hashMatch, packInput, unpackInput } from '../engine/net';
import { Input, MatchSetup, NO_INPUT, Side } from '../engine/types';
import { INPUT_DELAY, Netplay } from './netplay';
import { SpectatorFeed } from './spectate';

const SETUP: MatchSetup = {
  seed: 77,
  teams: ['brasil', 'argentina'],
  humans: [true, true],
  halfMinutes: 2,
  difficulty: 'normal',
};

// A player's keys over time: runs around and presses things, different for each side.
const keysAt = (side: Side, frame: number): Input => {
  const phase = Math.floor(frame / (40 + side * 13));
  const a = ((phase * 2.39996 + side) % (2 * Math.PI)) - Math.PI;
  return {
    mx: Math.round(Math.cos(a) * 100),
    mz: Math.round(Math.sin(a) * 100),
    sprint: phase % 3 === 0,
    pass: frame % (29 + side * 7) < 3,
    shoot: frame % (97 + side * 11) < 20,
    through: frame % 151 < 2,
    lob: false,
  };
};

// Two players and a server between them: every message takes `lag` frames to arrive (a
// different lag each way, plus jitter), as over a real connection.
const playOnline = (frames: number, lag: [number, number]) => {
  const server = createMatch(SETUP);
  const pending: [Map<number, PackedInput>, Map<number, PackedInput>] = [new Map(), new Map()];
  const queue: { at: number; deliver: () => void }[] = [];
  const frameLog: [PackedInput, PackedInput][] = [];
  const hashes = new Map<number, number>();
  const mismatches: number[] = [];
  let now = 0;
  const players: Netplay[] = [];
  const later = (side: Side, deliver: () => void) =>
    queue.push({ at: now + lag[side] + ((now * 7 + side) % 3), deliver });

  const serverInput = (side: Side, t: number, packed: PackedInput) => {
    pending[side].set(t, packed);
    later((1 - side) as Side, () => players[1 - side].remoteInput(t, packed));
    while (pending[0].has(server.tick + 1) && pending[1].has(server.tick + 1)) {
      const t1 = server.tick + 1;
      const pair: [PackedInput, PackedInput] = [
        pending[0].get(t1) as PackedInput,
        pending[1].get(t1) as PackedInput,
      ];
      step(server, [unpackInput(pair[0]), unpackInput(pair[1])]);
      frameLog.push(pair);
      if (server.tick % 60 === 0) hashes.set(server.tick, hashMatch(server));
    }
  };

  ([0, 1] as Side[]).forEach((side) => {
    players[side] = new Netplay(side, createMatch(SETUP), {
      sendInput: (t, packed) => later(side, () => serverInput(side, t, packed)),
      sendHash: (t, hash) =>
        later(side, () => {
          if (hashes.get(t) !== hash) mismatches.push(t);
        }),
    });
  });

  let stalls = 0;
  for (now = 0; now < frames; now += 1) {
    queue
      .filter((q) => q.at <= now)
      .forEach((q) => {
        queue.splice(queue.indexOf(q), 1);
        q.deliver();
      });
    players.forEach((p, side) => {
      if (p.advance(keysAt(side as Side, now)) === null) stalls += 1;
    });
  }
  return { server, players, frameLog, mismatches, stalls };
};

describe('football netplay', () => {
  it('ends with both players and the server on the same match', () => {
    const { server, players, mismatches } = playOnline(1800, [2, 5]);
    // Both are at most a few ticks ahead of the server: compare at the server's tick by
    // replaying the server's inputs, then compare the confirmed parts.
    expect(mismatches).toEqual([]);
    players.forEach((p) => {
      expect(p.confirmed).toBeGreaterThan(1700);
      expect(server.tick).toBeGreaterThanOrEqual(p.confirmed);
    });
    expect(players[0].resteps + players[1].resteps).toBeGreaterThan(0);
  });

  it('matches a plain replay of the inputs the server confirmed', () => {
    const { server, frameLog } = playOnline(1200, [3, 3]);
    const replay = createMatch(SETUP);
    frameLog.forEach(([a, b]) => step(replay, [unpackInput(a), unpackInput(b)]));
    expect(hashMatch(replay)).toBe(hashMatch(server));
  });

  it('waits instead of running away when the other player stops sending', () => {
    let sent = 0;
    const p = new Netplay(0, createMatch(SETUP), {
      sendInput: () => {
        sent += 1;
      },
      sendHash: () => undefined,
    });
    let stepped = 0;
    for (let k = 0; k < 100; k += 1) if (p.advance(NO_INPUT)) stepped += 1;
    expect(stepped).toBeLessThan(20);
    expect(sent).toBe(INPUT_DELAY + stepped);
  });

  it('lets a watcher who joins late see the same match', () => {
    const { server, frameLog } = playOnline(900, [2, 4]);
    // The watcher gets the match at tick 300 and the rest as frames.
    const at300 = createMatch(SETUP);
    frameLog.slice(0, 300).forEach(([a, b]) => step(at300, [unpackInput(a), unpackInput(b)]));
    const feed = new SpectatorFeed(at300);
    feed.push(301, frameLog.slice(300, 600));
    // A batch sent twice, or overlapping, changes nothing.
    feed.push(500, frameLog.slice(499, 700));
    feed.push(701, frameLog.slice(700));
    while (feed.advance() !== null);
    expect(feed.match.tick).toBe(server.tick);
    expect(hashMatch(feed.match)).toBe(hashMatch(server));
  });

  it('packs inputs both ways', () => {
    const input = keysAt(1, 12);
    expect(unpackInput(packInput(input))).toEqual(input);
  });
});
