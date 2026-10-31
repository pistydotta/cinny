import { assert, it } from 'vitest';
import {
  Card,
  Rank,
  Suit,
  HandCategory,
  HandValue,
  evaluateBest,
  compareHands,
  describeHand,
  createPokerTable,
  addPlayer,
  startHand,
  applyAction,
  advanceHand,
  getLegalActions,
  getPlayerAtSeat,
  PokerState,
  decideBotAction,
  BOT_PROFILES,
  buildPots,
  splitPot,
  estimateEquity,
  canStartHand,
  getTotalPot,
  shuffle,
  createDeck,
} from '.';

/* eslint-disable no-bitwise, operator-assignment */
const seededRandom = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};
/* eslint-enable no-bitwise, operator-assignment */

const R: Record<string, Rank> = { T: 10, J: 11, Q: 12, K: 13, A: 14 };
const card = (s: string): Card => {
  const rank = (R[s[0]] ?? Number(s[0])) as Rank;
  return { rank, suit: s[1] as Suit };
};
const cs = (s: string) => s.split(' ').map(card);

const findStraightHighOld = (uniqueDesc: number[]): number => {
  if (uniqueDesc.length !== 5) return 0;
  if (uniqueDesc[0] - uniqueDesc[4] === 4) return uniqueDesc[0];
  if (
    uniqueDesc[0] === 14 &&
    uniqueDesc[1] === 5 &&
    uniqueDesc[2] === 4 &&
    uniqueDesc[3] === 3 &&
    uniqueDesc[4] === 2
  )
    return 5;
  return 0;
};
const oracleFive = (five: Card[]): HandValue => {
  const sorted = five.slice().sort((a, b) => b.rank - a.rank);
  const isFlush = sorted.every((c) => c.suit === sorted[0].suit);

  const counts = new Map<number, number>();
  sorted.forEach((c) => counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1));
  // Groups ordered by size, then by rank: e.g. full house -> [[K,3],[8,2]].
  const groups = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const groupRanks = groups.map(([rank]) => rank);

  const straightHigh = findStraightHighOld(groupRanks.length === 5 ? groupRanks : []);
  // Show the wheel as 5-4-3-2-A.
  const straightCards = straightHigh === 5 ? [...sorted.slice(1), sorted[0]] : sorted;

  // Order cards by group for display (e.g. pair first, then kickers).
  const byGroup = groupRanks.flatMap((rank) => sorted.filter((c) => c.rank === rank));

  if (straightHigh && isFlush) {
    return { category: HandCategory.StraightFlush, ranks: [straightHigh], cards: straightCards };
  }
  if (groups[0][1] === 4) {
    return { category: HandCategory.FourOfAKind, ranks: groupRanks, cards: byGroup };
  }
  if (groups[0][1] === 3 && groups[1][1] === 2) {
    return { category: HandCategory.FullHouse, ranks: groupRanks, cards: byGroup };
  }
  if (isFlush) {
    return { category: HandCategory.Flush, ranks: sorted.map((c) => c.rank), cards: sorted };
  }
  if (straightHigh) {
    return { category: HandCategory.Straight, ranks: [straightHigh], cards: straightCards };
  }
  if (groups[0][1] === 3) {
    return { category: HandCategory.ThreeOfAKind, ranks: groupRanks, cards: byGroup };
  }
  if (groups[0][1] === 2 && groups[1][1] === 2) {
    return { category: HandCategory.TwoPair, ranks: groupRanks, cards: byGroup };
  }
  if (groups[0][1] === 2) {
    return { category: HandCategory.OnePair, ranks: groupRanks, cards: byGroup };
  }
  return { category: HandCategory.HighCard, ranks: groupRanks, cards: sorted };
};

const oracleBest = (cards: Card[]) => {
  let bestV: any;
  const n = cards.length;
  for (let a = 0; a < n; a += 1)
    for (let b = a + 1; b < n; b += 1)
      for (let x = b + 1; x < n; x += 1)
        for (let d = x + 1; d < n; d += 1)
          for (let e = d + 1; e < n; e += 1) {
            const v = oracleFive([cards[a], cards[b], cards[x], cards[d], cards[e]]);
            if (!bestV || compareHands(v, bestV) > 0) bestV = v;
          }
  return bestV;
};

it('fast evaluator matches brute force over 30k random hands', () => {
  const r = seededRandom(99);
  const counts: number[] = [];
  for (let i = 0; i < 30000; i += 1) {
    const n = 5 + (i % 3);
    const hand = shuffle(createDeck(), r).slice(0, n);
    const fast = evaluateBest(hand);
    const slow = oracleBest(hand);
    assert.equal(fast.category, slow.category, JSON.stringify(hand));
    assert.deepEqual(fast.ranks, slow.ranks, JSON.stringify(hand));
    assert.equal(fast.cards.length, 5);
    const fv = evaluateBest(fast.cards);
    assert.equal(compareHands(fv, fast), 0, 'reported cards make the hand');
    counts[fast.category] = (counts[fast.category] ?? 0) + 1;
  }
  assert.ok(counts.every((x) => x > 0) && counts.length === 9, `all categories seen ${counts}`);
});

const best = (s: string) => evaluateBest(cs(s));

it('hand categories', () => {
  assert.equal(best('As Ks Qs Js Ts 2d 3c').category, HandCategory.StraightFlush);
  assert.equal(describeHand(best('As Ks Qs Js Ts 2d 3c')), 'Royal Flush');
  assert.equal(best('5h 4h 3h 2h Ah Kd Kc').category, HandCategory.StraightFlush);
  assert.deepEqual(best('5h 4h 3h 2h Ah Kd Kc').ranks, [5]);
  assert.equal(best('9s 9h 9d 9c 2d 3c 4h').category, HandCategory.FourOfAKind);
  assert.equal(best('9s 9h 9d 2c 2d 3c 4h').category, HandCategory.FullHouse);
  assert.equal(best('9s 9h 9d 2c 2d 2s 4h').category, HandCategory.FullHouse);
  assert.deepEqual(best('9s 9h 9d 2c 2d 2s 4h').ranks, [9, 2]);
  assert.equal(best('As 9s 7s 4s 2s Kd Kc').category, HandCategory.Flush);
  assert.equal(best('5d 4c 3h 2s Ad Kd Kc').category, HandCategory.Straight);
  assert.deepEqual(best('5d 4c 3h 2s Ad Kd Kc').ranks, [5]);
  assert.deepEqual(best('6d 5d 4c 3h 2s Ad Kc').ranks, [6]);
  assert.equal(best('Td Jc Qh Ks Ad 2d 3c').category, HandCategory.Straight);
  assert.equal(best('Qd Kc Ah 2s 3d 8c 9h').category, HandCategory.HighCard); // no wrap-around
  assert.equal(best('7s 7h 7d Kc 2d 3c 9h').category, HandCategory.ThreeOfAKind);
  assert.equal(best('7s 7h Kd Kc 2d 2c 9h').category, HandCategory.TwoPair);
  assert.deepEqual(best('7s 7h Kd Kc 2d 2c 9h').ranks, [13, 7, 9]); // best kicker uses 9 not 2
  assert.equal(best('7s 7h Kd Qc 2d 3c 9h').category, HandCategory.OnePair);
  assert.equal(best('As Jh 8d 6c 4d 3c 2h').category, HandCategory.HighCard);
  assert.equal(describeHand(best('7s 7h Kd Kc 2d 2c 9h')), 'Two Pair, Kings and Sevens');
  assert.equal(describeHand(best('Qs Qh Qd Kc Kd 2c 9h')), 'Full House, Queens over Kings');
  assert.equal(describeHand(best('9d Tc Jh Qs Kd 2d 3c')), 'Straight, King high');
  assert.equal(describeHand(best('8d 9c Th Js Qd 2d 3c')), 'Straight, Queen high');
});

it('hand comparison and kickers', () => {
  // Same pair, kicker decides.
  assert.ok(compareHands(best('Ah Ad Kc 7s 5d 3c 2h'), best('As Ac Qc 7d 5h 3s 2d')) > 0);
  // Flush vs flush compares all five cards.
  assert.ok(compareHands(best('Ah 9h 7h 5h 3h'), best('Ah 9h 7h 5h 2h')) > 0);
  // Board plays: exact tie.
  assert.equal(compareHands(best('2c 3d As Ks Qs Js Ts'), best('4c 5d As Ks Qs Js Ts')), 0);
  // Two pair with better third pair is not a thing: kicker only.
  assert.ok(compareHands(best('Kh Kd 7c 7s Ad'), best('Kc Ks 7d 7h Qd')) > 0);
  // Wheel loses to 6-high straight.
  assert.ok(compareHands(best('Ah 2d 3c 4s 5d'), best('2h 3d 4c 5s 6d')) < 0);
  // Category ordering.
  const order = [
    'Ah Kd 9c 7s 3d',
    'Ah Ad 9c 7s 3d',
    'Ah Ad 9c 9s 3d',
    'Ah Ad Ac 9s 3d',
    'Ah Kd Qc Js Td',
    'Ah 9h 7h 5h 3h',
    'Ah Ad Ac 9s 9d',
    'Ah Ad Ac As 9d',
    '9h Th Jh Qh Kh',
  ];
  for (let i = 1; i < order.length; i += 1) {
    assert.ok(compareHands(best(order[i]), best(order[i - 1])) > 0, order[i]);
  }
});

const total = (s: PokerState) =>
  s.players.reduce((sum, p) => sum + p.stack + p.streetBet, 0) + s.pot;

const table = (stacks: number[], sb = 10, bb = 20) => {
  let s = createPokerTable({ smallBlind: sb, bigBlind: bb, maxSeats: 6 });
  stacks.forEach((stack, seat) => {
    s = addPlayer(s, { id: `p${seat}`, name: `P${seat}`, isBot: true, seat, stack });
  });
  return s;
};

const actor = (s: PokerState) => getPlayerAtSeat(s, s.actingSeat)!.id;
const act = (s: PokerState, a: Parameters<typeof applyAction>[2]) => applyAction(s, actor(s), a);
const runOut = (s: PokerState) => {
  let st = s;
  while (st.phase === 'street-complete') st = advanceHand(st);
  return st;
};

/** Fixes the deck after the deal so tests control board and hole cards. */
const rig = (s: PokerState, holes: Record<string, string>, board: string): PokerState => {
  const players = s.players.map((p) => (holes[p.id] ? { ...p, holeCards: cs(holes[p.id]) } : p));
  const b = cs(board);
  // burn, flop x3, burn, turn, burn, river
  const deck = [card('2c'), b[0], b[1], b[2], card('2c'), b[3], card('2c'), b[4]];
  return { ...s, players, deck };
};

it('heads-up: button posts SB, acts first preflop and last postflop', () => {
  let s = table([1000, 1000]);
  s = startHand(s, seededRandom(1));
  const button = s.buttonSeat!;
  assert.equal(s.sbSeat, button);
  assert.equal(s.actingSeat, button);
  assert.equal(getPlayerAtSeat(s, s.sbSeat)!.streetBet, 10);
  assert.equal(getPlayerAtSeat(s, s.bbSeat)!.streetBet, 20);
  s = act(s, { type: 'call' });
  assert.equal(s.actingSeat, s.bbSeat, 'BB gets the option');
  const legal = getLegalActions(s, actor(s))!;
  assert.ok(legal.canCheck && legal.canRaise);
  s = act(s, { type: 'check' });
  assert.equal(s.phase, 'street-complete');
  s = advanceHand(s);
  assert.equal(s.street, 'flop');
  assert.equal(s.board.length, 3);
  assert.equal(s.actingSeat, s.bbSeat, 'BB acts first after the flop');
  assert.equal(s.pot, 40);
  // Next hand moves the button.
  s = act(s, { type: 'raise', amount: 20 });
  s = act(s, { type: 'fold' });
  s = advanceHand(s);
  assert.equal(s.phase, 'complete');
  assert.equal(total(s), 2000);
  const prevButton = s.buttonSeat;
  s = startHand(s, seededRandom(2));
  assert.notEqual(s.buttonSeat, prevButton);
});

it('three-handed: UTG acts first, BB option, min-raise sizes', () => {
  let s = table([1000, 1000, 1000]);
  s = { ...s, buttonSeat: 2 };
  s = startHand(s, seededRandom(3));
  assert.equal(s.buttonSeat, 0);
  assert.equal(s.sbSeat, 1);
  assert.equal(s.bbSeat, 2);
  assert.equal(s.actingSeat, 0, 'button is UTG three-handed');
  let legal = getLegalActions(s, 'p0')!;
  assert.equal(legal.minRaiseTo, 40);
  assert.throws(() => act(s, { type: 'raise', amount: 30 }));
  s = act(s, { type: 'raise', amount: 70 }); // raise of 50
  legal = getLegalActions(s, 'p1')!;
  assert.equal(legal.minRaiseTo, 120, 'next raise must be at least 50 more');
  assert.equal(legal.callAmount, 60);
  s = act(s, { type: 'call' });
  s = act(s, { type: 'raise', amount: 200 }); // BB re-raise of 130
  legal = getLegalActions(s, 'p0')!;
  assert.equal(legal.minRaiseTo, 330);
  s = act(s, { type: 'fold' });
  s = act(s, { type: 'call' });
  assert.equal(s.phase, 'street-complete');
  s = advanceHand(s);
  assert.equal(s.pot, 470);
  assert.equal(s.actingSeat, 1, 'first active left of button acts first postflop');
  assert.equal(total(s), 3000);
});

it('everyone folds to the big blind: BB wins the small blind', () => {
  let s = table([1000, 1000, 1000]);
  s = { ...s, buttonSeat: 2 };
  s = startHand(s, seededRandom(4));
  s = act(s, { type: 'fold' });
  s = act(s, { type: 'fold' });
  assert.equal(s.phase, 'street-complete');
  s = advanceHand(s);
  assert.equal(s.phase, 'complete');
  assert.ok(s.result!.byFold);
  assert.equal(s.result!.payouts.p2, 20, 'pot of 20 after the uncalled 10 is returned');
  assert.equal(getPlayerAtSeat(s, 2)!.stack, 1010);
  assert.equal(total(s), 3000);
});

it('uncalled bet is returned', () => {
  let s = table([1000, 300]);
  s = { ...s, buttonSeat: 1 };
  s = startHand(s, seededRandom(5)); // button p0 (SB), p1 BB
  assert.equal(s.buttonSeat, 0);
  s = act(s, { type: 'raise', amount: 1000 }); // p0 all-in 1000
  s = act(s, { type: 'call' }); // p1 calls all-in 300
  assert.equal(s.phase, 'street-complete');
  s = advanceHand(s);
  assert.equal(getPlayerAtSeat(s, 0)!.stack, 700, '700 uncalled returned');
  assert.equal(s.pot, 600);
  s = runOut(s);
  assert.equal(s.phase, 'complete');
  assert.equal(s.board.length, 5);
  assert.equal(total(s), 1300);
});

it('incomplete all-in raise does not reopen betting; cumulative short raises do', () => {
  // seats: p0 button, p1 SB, p2 BB, p3 UTG
  let s = table([1000, 1000, 1000, 90]);
  s = { ...s, buttonSeat: 3 };
  s = startHand(s, seededRandom(6));
  assert.equal(s.actingSeat, 3);
  s = act(s, { type: 'call' }); // p3 calls 20
  s = act(s, { type: 'raise', amount: 60 }); // p0 raises to 60 (raise of 40)
  s = act(s, { type: 'fold' }); // p1
  s = act(s, { type: 'call' }); // p2 calls 60
  // p3 has 70 behind -> all-in to 90: raise of 30 < 40, incomplete.
  let legal = getLegalActions(s, 'p3')!;
  assert.ok(legal.canRaise, 'p3 faces a full raise and may raise all-in');
  assert.equal(legal.minRaiseTo, 90);
  s = act(s, { type: 'raise', amount: 90 });
  assert.equal(s.currentBet, 90);
  assert.equal(s.minRaise, 40, 'min raise unchanged after incomplete raise');
  legal = getLegalActions(s, 'p0')!;
  assert.ok(!legal.canRaise, 'p0 only faces 30 more, cannot re-raise');
  assert.ok(legal.canCall);
  s = act(s, { type: 'call' });
  legal = getLegalActions(s, 'p2')!;
  assert.ok(!legal.canRaise);
  s = act(s, { type: 'call' });
  assert.equal(s.phase, 'street-complete');
  assert.equal(total(s), 3090);

  // Two short all-ins adding up to a full raise reopen the action.
  s = table([1000, 1000, 1000, 75, 90]);
  s = { ...s, buttonSeat: 4 }; // p0 button, p1 SB, p2 BB, p3 UTG, p4
  s = startHand(s, seededRandom(7));
  s = act(s, { type: 'raise', amount: 50 }); // p3 raise to 50 (30 raise)... min 40, 50 ok
  assert.equal(s.minRaise, 30);
  s = act(s, { type: 'raise', amount: 90 }); // p4 all-in 90 => raise of 40, full
  assert.equal(s.minRaise, 40);
  s = act(s, { type: 'fold' }); // p0
  s = act(s, { type: 'fold' }); // p1
  s = act(s, { type: 'call' }); // p2 calls 90
  // p3 acted at 50, faces 90 -> 40 >= 40, may raise but only has 75 -> all-in (incomplete)
  legal = getLegalActions(s, 'p3')!;
  assert.equal(legal.callAmount, 25);
  assert.ok(!legal.canRaise, 'p3 cannot raise: stack equals the call');
});

it('side pots with three all-ins and a folded contributor', () => {
  // p0 100, p1 300, p2 1000, p3 1000; p3 folds after putting chips in.
  let s = table([100, 300, 1000, 1000]);
  s = { ...s, buttonSeat: 3 }; // p0 btn, p1 sb, p2 bb, p3 utg
  s = startHand(s, seededRandom(8));
  s = rig(s, { p0: 'Ah Ad', p1: 'Kh Kd', p2: 'Qh Qd', p3: 'Jh Jd' }, '2s 7c 9d 3h 8s');
  s = act(s, { type: 'raise', amount: 60 }); // p3
  s = act(s, { type: 'call' }); // p0 calls 60
  s = act(s, { type: 'raise', amount: 300 }); // p1 all-in 300
  s = act(s, { type: 'raise', amount: 1000 }); // p2 all-in 1000
  s = act(s, { type: 'fold' }); // p3 folds, 60 in
  s = act(s, { type: 'call' }); // p0 all-in for 100
  assert.equal(s.phase, 'street-complete');
  s = runOut(s);
  assert.equal(s.phase, 'complete');
  const r = s.result!;
  // contributions: p0 100, p1 300, p2 300 (700 returned), p3 60
  assert.equal(getPlayerAtSeat(s, 2)!.stack, 700 + 0);
  assert.equal(r.pots.length, 2);
  assert.equal(r.pots[0].amount, 100 * 3 + 60);
  assert.deepEqual(r.pots[0].winnerIds, ['p0']);
  assert.equal(r.pots[1].amount, 400);
  assert.deepEqual(r.pots[1].winnerIds, ['p1']);
  assert.equal(r.payouts.p0, 360);
  assert.equal(r.payouts.p1, 400);
  assert.equal(total(s), 2400);
});

it('split pot with odd chip goes left of the button', () => {
  const players = [
    { seat: 0, id: 'a', totalBet: 15, status: 'active' },
    { seat: 2, id: 'b', totalBet: 15, status: 'active' },
    { seat: 4, id: 'c', totalBet: 15, status: 'folded' },
  ] as any;
  const pots = buildPots(players);
  assert.equal(pots.length, 1);
  assert.equal(pots[0].amount, 45);
  const shares = splitPot(45, players.slice(0, 2), 0);
  assert.deepEqual(shares, { b: 23, a: 22 });
});

it('board plays: chopped pot at showdown', () => {
  let s = table([500, 500]);
  s = { ...s, buttonSeat: 1 };
  s = startHand(s, seededRandom(9));
  s = rig(s, { p0: '2c 3d', p1: '4c 5d' }, 'As Ks Qs Js Ts');
  s = act(s, { type: 'call' });
  s = act(s, { type: 'check' });
  for (let i = 0; i < 3; i += 1) {
    s = advanceHand(s);
    s = act(s, { type: 'check' });
    s = act(s, { type: 'check' });
  }
  s = advanceHand(s);
  assert.equal(s.phase, 'complete');
  assert.deepEqual(s.result!.pots[0].winnerIds.slice().sort(), ['p0', 'p1']);
  assert.equal(getPlayerAtSeat(s, 0)!.stack, 500);
  assert.equal(getPlayerAtSeat(s, 1)!.stack, 500);
  assert.equal(s.result!.pots[0].handName, 'Royal Flush');
});

it('short big blind: others still call the full big blind', () => {
  let s = table([1000, 1000, 15]);
  s = { ...s, buttonSeat: 2 }; // p0 btn, p1 sb, p2 bb (15)
  s = startHand(s, seededRandom(10));
  assert.equal(getPlayerAtSeat(s, 2)!.status, 'allin');
  assert.equal(getLegalActions(s, 'p0')!.callAmount, 20);
  s = act(s, { type: 'call' });
  s = act(s, { type: 'call' });
  assert.equal(s.phase, 'street-complete', 'BB is all-in, nobody left to act');
  s = advanceHand(s);
  assert.equal(s.pot, 55);
  assert.equal(s.phase, 'betting');
});

it('cannot act out of turn; cannot check facing a bet', () => {
  let s = table([1000, 1000, 1000]);
  s = startHand(s, seededRandom(11));
  const notActing = s.players.find((p) => p.seat !== s.actingSeat)!;
  assert.throws(() => applyAction(s, notActing.id, { type: 'fold' }));
  assert.throws(() => act(s, { type: 'check' }));
});

it('equity estimates are sane', () => {
  const r = seededRandom(12);
  const aa = estimateEquity(cs('Ah As'), [], 1, 3000, r);
  const sevenTwo = estimateEquity(cs('7h 2c'), [], 1, 3000, r);
  assert.ok(aa > 0.8 && aa < 0.89, `AA ${aa}`);
  assert.ok(sevenTwo > 0.28 && sevenTwo < 0.4, `72o ${sevenTwo}`);
  const nuts = estimateEquity(cs('Ah Kh'), cs('Qh Jh Th 2c'), 3, 500, r);
  assert.equal(nuts, 1);
});

it('fuzz: thousands of random and bot hands keep chips constant and rules consistent', () => {
  const random = seededRandom(1234);
  for (let game = 0; game < 24; game += 1) {
    const n = 2 + (game % 5);
    let s = table(Array.from({ length: n }, (_, i) => 200 + ((i * 377 + game * 91) % 1800)));
    const start = total(s);
    let hands = 0;
    while (canStartHand(s) && hands < 60) {
      s = startHand(s, random);
      hands += 1;
      let steps = 0;
      while (s.phase !== 'complete') {
        steps += 1;
        assert.ok(steps < 500, 'hand did not terminate');
        if (s.phase === 'street-complete') {
          s = advanceHand(s);
        } else {
          const id = actor(s);
          const legal = getLegalActions(s, id)!;
          let action;
          if (game % 2 === 0) {
            action =
              game % 6 !== 0
                ? decideBotAction(
                    s,
                    id,
                    BOT_PROFILES[game % BOT_PROFILES.length].personality,
                    random
                  )
                : { type: 'fold' as const };
          } else {
            const roll = random();
            if (legal.canRaise && roll < 0.25) {
              const amt =
                legal.minRaiseTo + Math.floor(random() * (legal.maxRaiseTo - legal.minRaiseTo + 1));
              action = { type: 'raise' as const, amount: amt };
            } else if (roll < 0.55)
              action = legal.canCheck ? { type: 'check' as const } : { type: 'call' as const };
            else if (roll < 0.7 && legal.canCall) action = { type: 'call' as const };
            else action = legal.canCheck ? { type: 'check' as const } : { type: 'fold' as const };
          }
          s = applyAction(s, id, action);
        }
        assert.equal(total(s), start, 'chips conserved');
        s.players.forEach((p) => assert.ok(p.stack >= 0));
        assert.ok(getTotalPot(s) >= 0);
      }
      const r = s.result!;
      const paid = Object.values(r.payouts).reduce((a, b) => a + b, 0);
      assert.equal(
        paid,
        r.pots.reduce((a, p) => a + p.amount, 0),
        'every pot is paid out'
      );
      assert.equal(s.pot, 0);
      const cards = [...s.board, ...s.players.flatMap((p) => p.holeCards)].map(
        (cd) => `${cd.rank}${cd.suit}`
      );
      assert.equal(new Set(cards).size, cards.length, 'no duplicate cards');
    }
  }
});
