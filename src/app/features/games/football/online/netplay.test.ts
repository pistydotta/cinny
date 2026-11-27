// The simulated network delivers messages from closures inside the frame loop.
/* eslint-disable no-loop-func */
import { describe, expect, it } from 'vitest';
import { createMatch, step } from '../engine/match';
import { PackedInput, hashMatch, packInput, unpackInput } from '../engine/net';
import { subCode } from '../engine/scenes';
import { Input, MatchSetup, MatchState, NO_INPUT, Order, Side } from '../engine/types';
import { canCallVar } from '../engine/var';
import { INPUT_DELAY, Netplay, Orders } from './netplay';
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
    // Each person asks for a change of their side's 7 for its 14 for a while (the code of the
    // other side is refused): it goes through the inputs like a button.
    sub:
      frame >= 200 + slot * 5 && frame < 220 + slot * 5
        ? subCode(5 + (slot % 2) * 11, 24 + (slot % 2) * 7)
        : undefined,
  };
};

// People and a server between them: every message takes some frames to arrive (a different
// lag per person, plus jitter), as over a real connection. With `votes`, someone watching asks
// the video referee for a review at the first decision it can review, and those votes follow
// (option indices), each stamped the way the API does (api/src/football/rooms.js).
const playOnline = (
  frames: number,
  slots: Side[],
  lags: number[],
  votes?: number[],
  // Where everyone starts (all at the same state, as after a resume): kick-off by default.
  start?: MatchState
) => {
  const s = setup(slots);
  const server = start ? structuredClone(start) : createMatch(s);
  const n = slots.length;
  const pending: Map<number, PackedInput>[] = slots.map(() => new Map());
  const queue: { at: number; deliver: () => void }[] = [];
  const frameLog: PackedInput[][] = [];
  const hashes = new Map<number, number>();
  const lastInput = slots.map(() => 0);
  const orders = new Map<number, Order[]>();
  const orderLog: Orders = [];
  let asked = false;
  let voted = false;
  const mismatches: number[] = [];
  let now = 0;
  const players: Netplay[] = [];
  const later = (slot: number, deliver: () => void) =>
    queue.push({ at: now + lags[slot] + ((now * 7 + slot) % 3), deliver });

  const serverInput = (slot: number, t: number, packed: PackedInput) => {
    lastInput[slot] = t;
    pending[slot].set(t, packed);
    players.forEach((p, k) => {
      if (k !== slot) later(k, () => p.remoteInput(slot, t, packed));
    });
    while (pending.every((m) => m.has(server.tick + 1))) {
      const t1 = server.tick + 1;
      const frame = pending.map((m) => m.get(t1) as PackedInput);
      const due = orders.get(t1) ?? [];
      step(server, frame.map(unpackInput), due);
      due.forEach((o) => orderLog.push([t1, o]));
      frameLog.push(frame);
      if (server.tick % 60 === 0) hashes.set(server.tick, hashMatch(server));
    }
  };

  for (let k = 0; k < n; k += 1) {
    players[k] = new Netplay(k, start ? structuredClone(start) : createMatch(s), {
      sendInput: (t, packed) => later(k, () => serverInput(k, t, packed)),
      sendHash: (t, hash) =>
        later(k, () => {
          if (hashes.get(t) !== hash) mismatches.push(t);
        }),
    });
  }

  // The tick after every input the server has: no player has stepped it for good.
  const stamp = (o: Order) => {
    const t = Math.max(server.tick, ...lastInput) + 1;
    orders.set(t, [...(orders.get(t) ?? []), o]);
    players.forEach((p, k) => later(k, () => p.remoteOrder(t, o)));
  };

  let stalls = 0;
  for (now = 0; now < frames; now += 1) {
    if (votes && !asked && canCallVar(server)) {
      asked = true;
      stamp({ kind: 'var', voters: votes.length });
    }
    if (votes && !voted && server.varReview?.verdict === -1) {
      voted = true;
      // -1: the last option.
      const last = server.varReview.options.length - 1;
      votes.forEach((choice) => stamp({ kind: 'vote', choice: choice < 0 ? last : choice }));
    }
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
  return { server, players, frameLog, orderLog, mismatches, stalls, setup: s };
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
    // The changes each person asked for are in the server's match, once each.
    const asked =
      [...server.subs, ...server.subQueue].length + (server.scene?.kind === 'sub' ? 1 : 0);
    expect(asked).toBe(2);
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

  it('takes the video referee’s orders on the same tick everywhere, watchers too', () => {
    // A goal about to go in, scored by the engine itself: the decision to review.
    const start = createMatch(setup([0, 1]));
    Object.assign(start, { phase: 'play', restart: undefined, wait: 0 });
    Object.assign(start.ball, {
      x: 52.3,
      y: 0.5,
      z: 2,
      vx: 25,
      vy: 0,
      vz: 0,
      owner: -1,
      shot: true,
    });
    step(start, [NO_INPUT, NO_INPUT]);
    expect(start.varIncident?.kind).toBe('goal');
    // Everyone votes for the last option: a changed decision (a goal ruled out, a red, onside).
    const { server, players, frameLog, orderLog, mismatches } = playOnline(
      1500,
      [0, 1],
      [2, 6],
      [-1, -1, -1],
      start
    );
    expect(orderLog.map(([, o]) => o.kind)).toEqual(['var', 'vote', 'vote', 'vote']);
    expect(mismatches).toEqual([]);
    players.forEach((p) => expect(p.confirmed).toBeGreaterThan(start.tick + 1350));
    // A player behind took the call after stepping past its tick, and rolled back.
    expect(players[1].resteps).toBeGreaterThan(0);
    // Replayed from the confirmed inputs and the orders, the match is the server's.
    const watcher = new SpectatorFeed(start);
    watcher.push(start.tick + 1, frameLog, orderLog);
    while (watcher.advance() !== null);
    expect(hashMatch(watcher.match)).toBe(hashMatch(server));
    expect(server.varLog).toEqual([expect.objectContaining({ changed: true })]);
    players.forEach((p) => expect(p.match.varLog).toEqual(server.varLog));
  });

  it('packs inputs both ways', () => {
    const input = keysAt(1, 12);
    expect(unpackInput(packInput(input))).toEqual(input);
  });
});
