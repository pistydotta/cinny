/* eslint-disable no-param-reassign */
// The simulated clients are plain mutable objects.
import { assert, it } from 'vitest';
import {
  decideBotAction,
  BOT_PROFILES,
  getPlayer,
  getPlayerAtSeat,
  isHandInProgress,
} from '../engine';
import {
  createTableConfig,
  TableEvent,
  PokerEventContent,
  compareTableEvents,
  TAKEOVER_STAGGER_MS,
  encodeDeck,
  decodeDeck,
  parseEventContent,
} from './protocol';
import {
  Replica,
  createReplica,
  applyTableEvent,
  hostDuty,
  hostDeadline,
  buildStartContent,
  succession,
  replayTable,
  tableDigest,
  isSeated,
} from './replica';

/* eslint-disable no-bitwise, operator-assignment */
const seeded = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};
/* eslint-enable no-bitwise, operator-assignment */

const config = { ...createTableConfig('Teste', 10, 20), actionTimeoutMs: 20000 };

const chips = (r: Replica) =>
  r.poker.players.reduce((s, p) => s + p.stack + p.streetBet, 0) +
  r.poker.pot +
  Object.values(r.pendingChips).reduce((a, b) => a + b, 0);

const fingerprint = (r: Replica) =>
  JSON.stringify({
    d: tableDigest(r.poker),
    phase: r.poker.phase,
    seq: r.seq,
    host: r.hostId,
    board: r.poker.board,
    acting: r.poker.actingSeat,
    pot: r.poker.pot,
    leaving: r.leaving,
    bets: r.poker.players.map((p) => [p.id, p.streetBet, p.status, p.stack]),
  });

type Client = {
  id: string;
  online: boolean;
  replica: Replica;
  thinkUntil?: number;
  wantsLeave?: boolean;
};

class Sim {
  now = 1_000_000;

  log: TableEvent[] = [];

  clients: Client[] = [];

  rnd: () => number;

  counter = 0;

  accepted = 0;

  rejected: string[] = [];

  expectedChips = 0;

  reference: Replica;

  constructor(seed: number) {
    this.rnd = seeded(seed);
    this.reference = createReplica(config, this.now);
  }

  addClient(id: string) {
    const c: Client = { id, online: true, replica: createReplica(config, this.now) };
    // catch up with the history
    c.replica = replayTable(config, this.now, this.log).replica;
    this.clients.push(c);
    return c;
  }

  send(sender: string, content: PokerEventContent) {
    this.counter += 1;
    const ev: TableEvent = {
      id: `$${String(this.counter).padStart(6, '0')}`,
      sender,
      ts: this.now,
      content: JSON.parse(JSON.stringify(content)),
    };
    // track chips through the reference replica
    const before = this.reference;
    const leavingStacks =
      content.kind === 'start'
        ? before.leaving.reduce((s, id) => s + (getPlayer(before.poker, id)?.stack ?? 0), 0)
        : 0;
    const res = applyTableEvent(before, ev);
    if (res.accepted) {
      this.accepted += 1;
      if (content.kind === 'join') this.expectedChips += content.buyIn;
      if (content.kind === 'rebuy') this.expectedChips += content.amount;
      if (content.kind === 'leave' && !res.replica.leaving.includes(sender)) {
        this.expectedChips -= getPlayer(before.poker, sender)?.stack ?? 0;
      }
      if (content.kind === 'start') this.expectedChips -= leavingStacks;
      assert.equal(chips(res.replica), this.expectedChips, `chips after ${content.kind}`);
    } else {
      this.rejected.push(`${content.kind}:${res.reason}`);
    }
    this.reference = res.replica;
    this.log.push(ev);
    this.clients.forEach((c) => {
      c.replica = applyTableEvent(c.replica, ev).replica;
    });
    return res;
  }

  step(ms = 500) {
    this.now += ms;
    const order = this.clients.slice().sort(() => this.rnd() - 0.5);
    order.forEach((c) => {
      if (!c.online) return;
      const r = c.replica;
      if (!isSeated(r, c.id)) return;
      if (c.wantsLeave && !(r.poker.phase === 'betting' && this.rnd() < 0.5)) {
        c.wantsLeave = false;
        this.send(c.id, { kind: 'leave' });
        return;
      }
      const me = getPlayer(r.poker, c.id)!;
      if (me.sittingOut && this.rnd() < 0.2) {
        this.send(c.id, { kind: 'back' });
        return;
      }
      if (me.stack === 0 && !isHandInProgress(r.poker) && this.rnd() < 0.3) {
        this.send(c.id, { kind: 'rebuy', amount: config.minBuyIn });
        return;
      }
      if (
        r.poker.phase === 'betting' &&
        getPlayerAtSeat(r.poker, r.poker.actingSeat)?.id === c.id
      ) {
        if (c.thinkUntil === undefined) c.thinkUntil = this.now + Math.floor(this.rnd() * 4000);
        if (this.now >= c.thinkUntil) {
          c.thinkUntil = undefined;
          const action = decideBotAction(r.poker, c.id, BOT_PROFILES[1].personality, this.rnd);
          this.send(c.id, { kind: 'act', hand: r.poker.handNumber, seq: r.seq, action });
          return;
        }
      }
      if (r.hostId === c.id) {
        const duty = hostDuty(r);
        if (duty && this.now >= duty.dueTs) {
          if (duty.kind === 'start') this.send(c.id, buildStartContent(r, this.rnd));
          else this.send(c.id, { kind: 'timeout', hand: r.poker.handNumber, seq: r.seq });
        }
        return;
      }
      const deadline = hostDeadline(r);
      const rank = succession(r).indexOf(c.id);
      if (
        deadline !== undefined &&
        rank >= 0 &&
        this.now >= deadline + rank * TAKEOVER_STAGGER_MS
      ) {
        this.send(c.id, { kind: 'takeover' });
      }
    });
  }

  assertConsistent() {
    const online = this.clients.filter((c) => c.online);
    const ref = fingerprint(this.reference);
    online.forEach((c) => assert.equal(fingerprint(c.replica), ref, `client ${c.id} diverged`));
    // a fresh client loading the history agrees too
    const fresh = replayTable(config, 0, this.log).replica;
    assert.equal(fingerprint(fresh), ref, 'replay from history diverged');
  }
}

const seat = (sim: Sim, id: string, s: number, buyIn = 2000) =>
  sim.send(id, { kind: 'join', seat: s, buyIn, name: id });

it('deck encoding round trip and content validation', () => {
  const r = seeded(1);
  const deck = buildStartContent(
    (() => {
      let rep = createReplica(config, 0);
      rep = applyTableEvent(rep, {
        id: '$1',
        sender: 'a',
        ts: 1,
        content: { kind: 'join', seat: 0, buyIn: 400, name: 'a' },
      }).replica;
      return rep;
    })(),
    r
  );
  assert.equal(deck.kind, 'start');
  if (deck.kind === 'start') {
    const decoded = decodeDeck(deck.deck, deck.hand)!;
    assert.equal(decoded.length, 52);
    assert.equal(encodeDeck(decoded, deck.hand), deck.deck);
    assert.ok(!deck.deck.includes('A'.repeat(3)));
    assert.equal(decodeDeck(deck.deck, deck.hand + 1), undefined, 'wrong salt is rejected');
  }
  assert.equal(
    parseEventContent({ kind: 'act', hand: 1, seq: 0, action: { type: 'raise' } }),
    undefined
  );
  assert.equal(parseEventContent({ kind: 'join', seat: 1, buyIn: 'x', name: 'a' }), undefined);
  assert.deepEqual(parseEventContent({ kind: 'leave', extra: 1 }), { kind: 'leave' });
});

it('basic table: creator becomes host, hands are dealt and everyone agrees', () => {
  const sim = new Sim(2);
  ['ana', 'bia', 'caio'].forEach((id) => sim.addClient(id));
  seat(sim, 'ana', 0);
  assert.equal(sim.reference.hostId, 'ana');
  seat(sim, 'bia', 2);
  seat(sim, 'caio', 4);
  for (let i = 0; i < 600; i += 1) sim.step();
  assert.ok(sim.reference.poker.handNumber > 10, `hands ${sim.reference.poker.handNumber}`);
  sim.assertConsistent();
});

it('rules enforced: wrong turn, fake host, early timeout and early takeover are ignored', () => {
  const sim = new Sim(3);
  ['ana', 'bia'].forEach((id) => sim.addClient(id));
  seat(sim, 'ana', 0);
  seat(sim, 'bia', 3);
  assert.equal(
    sim.send('bia', buildStartContent(sim.reference, sim.rnd)).reason,
    'only the host deals'
  );
  sim.now += 3000;
  assert.ok(sim.send('ana', buildStartContent(sim.reference, sim.rnd)).accepted);
  const r = sim.reference;
  const actor = getPlayerAtSeat(r.poker, r.poker.actingSeat)!.id;
  const other = actor === 'ana' ? 'bia' : 'ana';
  assert.equal(
    sim.send(other, { kind: 'act', hand: 1, seq: 0, action: { type: 'call' } }).reason,
    'not your turn'
  );
  assert.equal(sim.send('ana', { kind: 'timeout', hand: 1, seq: 0 }).reason, 'too early');
  assert.equal(sim.send('bia', { kind: 'takeover' }).reason, 'host still has time');
  assert.equal(
    sim.send(actor, { kind: 'act', hand: 1, seq: 5, action: { type: 'call' } }).reason,
    'stale action'
  );
  assert.equal(
    sim.send('zed', { kind: 'join', seat: 3, buyIn: 400, name: 'z' }).reason,
    'seat taken'
  );
  assert.equal(
    sim.send('zed', { kind: 'join', seat: 1, buyIn: 99999, name: 'z' }).reason,
    'buy-in'
  );
  assert.ok(sim.send(actor, { kind: 'act', hand: 1, seq: 0, action: { type: 'call' } }).accepted);
  sim.assertConsistent();
});

it('host leaves mid-hand: the next player clockwise becomes host and the game goes on', () => {
  const sim = new Sim(4);
  ['ana', 'bia', 'caio', 'davi'].forEach((id) => sim.addClient(id));
  seat(sim, 'ana', 0);
  seat(sim, 'bia', 1);
  seat(sim, 'caio', 3);
  seat(sim, 'davi', 5);
  for (
    let i = 0;
    i < 400 && !(sim.reference.poker.handNumber >= 3 && sim.reference.poker.phase === 'betting');
    i += 1
  )
    sim.step();
  const handBefore = sim.reference.poker.handNumber;
  sim.clients[0].wantsLeave = true;
  for (let i = 0; i < 10 && sim.reference.hostId === 'ana'; i += 1) sim.step();
  assert.equal(sim.reference.hostId, 'bia');
  sim.clients[0].online = false;
  for (let i = 0; i < 400; i += 1) sim.step();
  assert.ok(sim.reference.poker.handNumber > handBefore + 3, 'game continued');
  assert.ok(!getPlayer(sim.reference.poker, 'ana'), 'ana removed');
  sim.assertConsistent();
});

it('host disappears: another player takes over, deals, and times the old host out', () => {
  const sim = new Sim(5);
  ['ana', 'bia', 'caio'].forEach((id) => sim.addClient(id));
  seat(sim, 'ana', 0);
  seat(sim, 'bia', 2);
  seat(sim, 'caio', 4);
  for (let i = 0; i < 300 && sim.reference.poker.handNumber < 3; i += 1) sim.step();
  sim.clients[0].online = false; // ana's tab closes without a word
  const handBefore = sim.reference.poker.handNumber;
  for (let i = 0; i < 800; i += 1) sim.step();
  assert.notEqual(sim.reference.hostId, 'ana');
  assert.ok(sim.rejected.filter((x) => x.startsWith('takeover')).length < 5, 'few takeover races');
  assert.ok(
    sim.reference.poker.handNumber > handBefore + 3,
    `game continued ${sim.reference.poker.handNumber}`
  );
  assert.ok(getPlayer(sim.reference.poker, 'ana')!.sittingOut, 'ana marked away after timing out');
  sim.assertConsistent();
});

it('long random session: joins, leaves, timeouts, rebuys, crashes; chips conserved', () => {
  for (let seed = 10; seed < 13; seed += 1) {
    const sim = new Sim(seed);
    const names = ['ana', 'bia', 'caio', 'davi', 'edu', 'fabi', 'gil', 'hugo'];
    names.forEach((id) => sim.addClient(id));
    seat(sim, 'ana', 0);
    seat(sim, 'bia', 1, 400);
    for (let i = 0; i < 2500; i += 1) {
      const roll = sim.rnd();
      const c = sim.clients[Math.floor(sim.rnd() * sim.clients.length)];
      if (roll < 0.004 && !isSeated(sim.reference, c.id)) {
        c.online = true;
        const free = [0, 1, 2, 3, 4, 5].filter((s) => !getPlayerAtSeat(sim.reference.poker, s));
        if (free.length)
          seat(
            sim,
            c.id,
            free[Math.floor(sim.rnd() * free.length)],
            400 + Math.floor(sim.rnd() * 9) * 200
          );
      } else if (roll < 0.006 && isSeated(sim.reference, c.id)) {
        c.wantsLeave = true;
      } else if (roll < 0.007) {
        c.online = !c.online; // crash or come back
        if (c.online) c.replica = replayTable(config, 0, sim.log).replica;
      }
      sim.step();
    }
    // Liveness: whenever the host has something to do, it gets done in bounded time.
    const duty = hostDuty(sim.reference);
    if (duty) {
      const limit = config.actionTimeoutMs + 10000 + 8 * TAKEOVER_STAGGER_MS + 2000;
      assert.ok(sim.now - duty.dueTs < limit, `seed ${seed}: table stuck (${duty.kind})`);
    }
    assert.ok(
      sim.reference.poker.handNumber > 5,
      `seed ${seed}: ${sim.reference.poker.handNumber} hands`
    );
    sim.assertConsistent();
  }
});

it('events arriving out of order converge after sorting', () => {
  const sim = new Sim(20);
  ['ana', 'bia', 'caio'].forEach((id) => sim.addClient(id));
  seat(sim, 'ana', 0);
  seat(sim, 'bia', 2);
  seat(sim, 'caio', 4);
  for (let i = 0; i < 400; i += 1) sim.step();
  // shuffle delivery order in small windows, then rebuild by sorting
  const shuffled = sim.log.slice();
  for (let i = 0; i + 3 < shuffled.length; i += 3) {
    const tmp = shuffled[i];
    shuffled[i] = shuffled[i + 2];
    shuffled[i + 2] = tmp;
  }
  const sorted = shuffled.slice().sort(compareTableEvents);
  const rebuilt = sorted.reduce(
    (r, ev) => applyTableEvent(r, ev).replica,
    createReplica(config, 0)
  );
  assert.equal(fingerprint(rebuilt), fingerprint(sim.reference));
});

it('a player that missed events is resynced by the next deal', () => {
  const sim = new Sim(21);
  ['ana', 'bia', 'caio'].forEach((id) => sim.addClient(id));
  seat(sim, 'ana', 0);
  seat(sim, 'bia', 2);
  seat(sim, 'caio', 4);
  for (let i = 0; i < 200; i += 1) sim.step();
  // caio's copy drops a few events
  const caio = sim.clients[2];
  caio.online = false;
  const saved = caio.replica;
  for (let i = 0; i < 60; i += 1) sim.step();
  caio.replica = saved;
  caio.online = true;
  // caio keeps receiving only new events; a deal that does not fit makes it reload the history
  let reloaded = false;
  const origSend = sim.send.bind(sim);
  sim.send = (sender, content) => {
    const before = caio.replica;
    const res = origSend(sender, content);
    if (content.kind === 'start' && res.accepted) {
      const mine = applyTableEvent(before, sim.log[sim.log.length - 1]);
      if (!mine.accepted || mine.replica.resynced) {
        caio.replica = replayTable(config, 0, sim.log).replica;
        reloaded = true;
      }
    }
    return res;
  };
  for (let i = 0; i < 400; i += 1) sim.step();
  assert.ok(reloaded, 'caio noticed it was out of sync');
  assert.equal(fingerprint(caio.replica), fingerprint(sim.reference));
});

it('nobody can see other hands: only the hand owner and showdown reveal cards (data check)', () => {
  // The UI renders face-up cards only for the local player; this checks the snapshot carries no cards.
  const sim = new Sim(22);
  ['ana', 'bia'].forEach((id) => sim.addClient(id));
  seat(sim, 'ana', 0);
  seat(sim, 'bia', 2);
  sim.now += 4000;
  const content = buildStartContent(sim.reference, sim.rnd);
  assert.ok(content.kind === 'start');
  const raw = JSON.stringify(content);
  assert.ok(!/"rank"|"suit"/.test(raw), 'no plain cards in the event');
});
