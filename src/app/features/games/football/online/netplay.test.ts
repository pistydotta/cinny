// The simulated network delivers messages from closures inside the frame loop.
/* eslint-disable no-loop-func */
import { describe, expect, it } from 'vitest';
import { createMatch, step } from '../engine/match';
import { PackedInput, hashMatch, packInput, unpackInput } from '../engine/net';
import { Input, MatchSetup, NO_INPUT, Side } from '../engine/types';
import { INPUT_DELAY, Netplay } from './netplay';
import { SpectatorFeed } from './spectate';

const setup = (slots: Side[]): MatchSetup => ({
  seed: 77,
  teams: ['brasil', 'argentina'],
  slots,
  halfMinutes: 2,
  difficulty: 'normal',
});

// A person's keys over time: runs around and presses things, different for each person.
const keysAt = (slot: number, frame: number): Input => {
  const phase = Math.floor(frame / (40 + slot * 13));
  const a = ((phase * 2.39996 + slot) % (2 * Math.PI)) - Math.PI;
  return {
    mx: Math.round(Math.cos(a) * 100),
    mz: Math.round(Math.sin(a) * 100),
    sprint: phase % 3 === 0,
    pass: frame % (29 + slot * 7) < 3,
    shoot: frame % (97 + slot * 11) < 20,
    through: frame % 151 < 2,
    lob: false,
  };
};

// People and a server between them: every message takes some frames to arrive (a different
// lag per person, plus jitter), as over a real connection.
const playOnline = (frames: number, slots: Side[], lags: number[]) => {
  const s = setup(slots);
  const server = createMatch(s);
  const n = slots.length;
  const pending: Map<number, PackedInput>[] = slots.map(() => new Map());
  const queue: { at: number; deliver: () => void }[] = [];
  const frameLog: PackedInput[][] = [];
  const hashes = new Map<number, number>();
  const mismatches: number[] = [];
  let now = 0;
  const players: Netplay[] = [];
  const later = (slot: number, deliver: () => void) =>
    queue.push({ at: now + lags[slot] + ((now * 7 + slot) % 3), deliver });

  const serverInput = (slot: number, t: number, packed: PackedInput) => {
    pending[slot].set(t, packed);
    players.forEach((p, k) => {
      if (k !== slot) later(k, () => p.remoteInput(slot, t, packed));
    });
    while (pending.every((m) => m.has(server.tick + 1))) {
      const t1 = server.tick + 1;
      const frame = pending.map((m) => m.get(t1) as PackedInput);
      step(server, frame.map(unpackInput));
      frameLog.push(frame);
      if (server.tick % 60 === 0) hashes.set(server.tick, hashMatch(server));
    }
  };

  for (let k = 0; k < n; k += 1) {
    players[k] = new Netplay(k, createMatch(s), {
      sendInput: (t, packed) => later(k, () => serverInput(k, t, packed)),
      sendHash: (t, hash) =>
        later(k, () => {
          if (hashes.get(t) !== hash) mismatches.push(t);
        }),
    });
  }

  let stalls = 0;
  for (now = 0; now < frames; now += 1) {
    queue
      .filter((q) => q.at <= now)
      .forEach((q) => {
        queue.splice(queue.indexOf(q), 1);
        q.deliver();
      });
    players.forEach((p, k) => {
      if (p.advance(keysAt(k, now)) === null) stalls += 1;
    });
  }
  return { server, players, frameLog, mismatches, stalls, setup: s };
};

describe('football netplay', () => {
  it('ends with both players and the server on the same match', () => {
    const { server, players, mismatches } = playOnline(1800, [0, 1], [2, 5]);
    expect(mismatches).toEqual([]);
    players.forEach((p) => {
      expect(p.confirmed).toBeGreaterThan(1700);
      expect(server.tick).toBeGreaterThanOrEqual(p.confirmed);
    });
    expect(players[0].resteps + players[1].resteps).toBeGreaterThan(0);
  });

  it('keeps eight people, four a side, on the same match', () => {
    const lags = [2, 3, 5, 4, 1, 6, 3, 2];
    const { server, players, mismatches } = playOnline(1500, [0, 0, 0, 0, 1, 1, 1, 1], lags);
    expect(mismatches).toEqual([]);
    players.forEach((p) => expect(p.confirmed).toBeGreaterThan(1350));
    // Each person played a different player of their side.
    const controls = server.people.map((q) => q.control);
    expect(new Set(controls).size).toBe(8);
    server.people.forEach((q, k) =>
      expect(server.players[q.control].side).toBe(server.setup.slots[k])
    );
  });

  it('matches a plain replay of the inputs the server confirmed', () => {
    const { server, frameLog, setup: s } = playOnline(1200, [0, 1], [3, 3]);
    const replay = createMatch(s);
    frameLog.forEach((frame) => step(replay, frame.map(unpackInput)));
    expect(hashMatch(replay)).toBe(hashMatch(server));
  });

  it('waits instead of running away when the others stop sending', () => {
    let sent = 0;
    const p = new Netplay(0, createMatch(setup([0, 1])), {
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
    const { server, frameLog, setup: s } = playOnline(900, [0, 0, 1], [2, 4, 3]);
    // The watcher gets the match at tick 300 and the rest as frames.
    const at300 = createMatch(s);
    frameLog.slice(0, 300).forEach((frame) => step(at300, frame.map(unpackInput)));
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
