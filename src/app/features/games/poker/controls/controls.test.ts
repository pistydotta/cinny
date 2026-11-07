import { describe, expect, it } from 'vitest';
import type { TableView, ViewPlayer } from '../types';
import { amountInput, clampRaise, formatAmount, inputChips, potRaise } from './amounts';
import { callCost, makePreAction, resolvePreAction, takePreAction } from './preActions';
import { DEFAULT_PREFERENCES, parsePreferences } from './preferences';
import { enabledSound, soundEvents } from './soundEvents';
import { exampleCards, HAND_TYPES, handTypeRank, personalCardsUsed } from './handRanks';

const hero: ViewPlayer = {
  id: 'me',
  name: 'Me',
  avatarUrl: null,
  seat: 0,
  stack: 100,
  streetBet: 0,
  totalBet: 0,
  status: 'active',
  lastAction: null,
  isBot: false,
  away: false,
  leaving: false,
  hasCards: true,
  holeCards: [
    { rank: 14, suit: 's' },
    { rank: 13, suit: 's' },
  ],
};
const other = { ...hero, id: 'other', seat: 1, streetBet: 20, holeCards: [] };
const table = (overrides: Partial<TableView> = {}): TableView => ({
  id: 't',
  name: 'Local test',
  kind: 'friends',
  ownerId: 'me',
  isOwner: true,
  isPublic: false,
  inviteAnyone: false,
  smallBlind: 10,
  bigBlind: 20,
  minBuyIn: 400,
  maxBuyIn: 2000,
  version: 5,
  handNumber: 3,
  phase: 'betting',
  street: 'flop',
  board: [],
  pot: 40,
  currentBet: 20,
  buttonSeat: 0,
  sbSeat: 0,
  bbSeat: 1,
  actingSeat: 1,
  turnDeadline: 1000,
  log: [],
  result: null,
  legal: null,
  myHand: { key: 'high_card', params: { rank: 14 } },
  pendingChips: 0,
  players: [hero, other],
  ...overrides,
});
const legal = {
  toCall: 20,
  canCheck: false,
  canCall: true,
  callAmount: 20,
  canRaise: true,
  isBet: false,
  minRaiseTo: 40,
  maxRaiseTo: 100,
  hand: 3,
  seq: 2,
};

describe('bet amounts', () => {
  it('round-trips whole chips through BB display for every supported blind', () => {
    [20, 50, 100].forEach((bb) =>
      [0, 1, 17, 49, 125, 1999].forEach((chips) => {
        expect(inputChips(amountInput(chips, 'bb', bb), 'bb', bb)).toBe(chips);
      })
    );
    expect(inputChips(2.5, 'bb', 20)).toBe(50);
    expect(formatAmount(50, 'bb', 20)).toBe('2,5 BB');
    expect(formatAmount(50, 'chips', 20)).toBe('50');
  });
  it('bounds invalid, fractional and all-in values without changing units on the wire', () => {
    [NaN, Infinity, -10, 0].forEach((value) => expect(clampRaise(value, legal)).toBe(40));
    expect(clampRaise(99.6, legal)).toBe(100);
    expect(clampRaise(9999, legal)).toBe(100);
    expect(clampRaise(50.4, legal)).toBe(50);
  });
  it('pot presets are totals including the call, not extra bets', () => {
    expect(potRaise(150, 50, 100, 0.5, { minRaiseTo: 150, maxRaiseTo: 1000 })).toBe(200);
    expect(potRaise(150, 50, 100, 1, { minRaiseTo: 150, maxRaiseTo: 250 })).toBe(250);
  });
});

describe('queued actions', () => {
  it('waits for the hero and consumes once even if the same snapshot is processed twice', () => {
    const holder = {
      current: makePreAction(table(), hero, 'fold') as ReturnType<typeof makePreAction> | null,
    };
    expect(takePreAction(holder, table(), hero, true)).toBeUndefined();
    expect(holder.current).not.toBeNull();
    expect(takePreAction(holder, table({ legal }), hero, true)).toEqual({ type: 'fold' });
    expect(takePreAction(holder, table({ legal }), hero, true)).toBeUndefined();
  });
  it('cancels on table, hand, street, connection and seat changes', () => {
    const queue = makePreAction(table(), hero, 'fold');
    [
      table({ id: 'new' }),
      table({ handNumber: 4 }),
      table({ street: 'turn' }),
      table({ phase: 'complete' }),
    ].forEach((changed) => {
      expect(resolvePreAction(queue, changed, hero, true)).toEqual({ cancel: true });
    });
    [
      undefined,
      { ...hero, status: 'folded' as const },
      { ...hero, leaving: true },
      { ...hero, away: true },
    ].forEach((changed) => {
      expect(resolvePreAction(queue, table(), changed, true)).toEqual({ cancel: true });
    });
    expect(resolvePreAction(queue, table(), hero, false)).toEqual({ cancel: true });
  });
  it('never accepts a higher call price, even before the turn arrives', () => {
    const queue = makePreAction(table(), hero, 'call');
    expect(queue.maxCall).toBe(20);
    expect(resolvePreAction(queue, table({ currentBet: 40 }), hero, true)).toEqual({
      cancel: true,
    });
    expect(
      resolvePreAction(queue, table({ legal: { ...legal, callAmount: 40 } }), hero, true)
    ).toEqual({ cancel: true });
    expect(resolvePreAction(queue, table({ legal }), hero, true).action).toEqual({ type: 'call' });
  });
  it('checks for free and folds only when check/fold explicitly allows it', () => {
    const free = table({ currentBet: 0, players: [hero, { ...other, streetBet: 0 }] });
    const checking = { ...legal, toCall: 0, callAmount: 0, canCheck: true, canCall: false };
    expect(
      resolvePreAction(makePreAction(free, hero, 'check'), { ...free, legal: checking }, hero, true)
        .action
    ).toEqual({ type: 'check' });
    expect(
      resolvePreAction(makePreAction(free, hero, 'check'), table({ legal }), hero, true)
    ).toEqual({ cancel: true });
    expect(
      resolvePreAction(makePreAction(free, hero, 'check-fold'), table({ legal }), hero, true).action
    ).toEqual({ type: 'fold' });
  });
  it('uses the server bet level and caps a short stack at its remaining chips', () => {
    expect(callCost(table({ currentBet: 100 }), { ...hero, stack: 15 })).toBe(15);
    expect(
      callCost(table({ street: 'preflop', currentBet: undefined, players: [hero] }), hero)
    ).toBe(20);
  });
});

describe('sounds and preferences', () => {
  it('defaults to quiet and validates persisted values', () => {
    expect(parsePreferences('broken')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('{"sounds":true,"volume":3,"unit":"bb","turn":"false"}')).toMatchObject(
      { sounds: true, volume: 1, unit: 'bb', turn: true }
    );
    expect(parsePreferences('{"volume":-2}').volume).toBe(0);
    expect(enabledSound('turn', DEFAULT_PREFERENCES)).toBe(false);
    expect(enabledSound('turn', { ...DEFAULT_PREFERENCES, sounds: true, turn: false })).toBe(false);
    expect(enabledSound('chips', { ...DEFAULT_PREFERENCES, sounds: true, volume: 0 })).toBe(false);
  });
  it('does not replay initial, reconnected, foreign or stale snapshots', () => {
    expect(soundEvents(undefined, table({ legal }), 'me')).toEqual([]);
    expect(soundEvents(table(), table({ id: 'new', legal }), 'me')).toEqual([]);
    expect(soundEvents(table(), table({ legal }), 'me')).toEqual([]);
    expect(soundEvents(table(), table({ legal, version: 4 }), 'me')).toEqual([]);
  });
  it('announces a new turn once and does not announce incidental sequence changes', () => {
    expect(soundEvents(table(), table({ legal, version: 6 }), 'me')).toEqual(['turn']);
    expect(
      soundEvents(table({ legal }), table({ legal: { ...legal, seq: 3 }, version: 6 }), 'me')
    ).toEqual([]);
  });
  it('groups action bursts and announces new cards and a pot win', () => {
    const log = [1, 2, 3].map((id) => ({ id, hand: 3, key: 'call', params: {} }));
    expect(soundEvents(table(), table({ version: 6, log }), 'me')).toEqual(['chips']);
    expect(
      soundEvents(table(), table({ version: 6, board: [{ rank: 2, suit: 's' }] }), 'me')
    ).toEqual(['deal']);
    expect(
      soundEvents(
        table(),
        table({
          version: 6,
          phase: 'complete',
          result: {
            byFold: true,
            pots: [],
            payouts: { me: 50 },
            hands: {},
          },
        }),
        'me'
      )
    ).toEqual(['win']);
  });
});

describe('beginner hand ladder', () => {
  it('ranks hand TYPES and gives complete, unique five-card examples', () => {
    expect(handTypeRank('royal_flush')).toBe(1);
    expect(handTypeRank('flush')).toBe(5);
    expect(handTypeRank('high_card')).toBe(10);
    expect(handTypeRank('unknown')).toBeUndefined();
    HAND_TYPES.forEach((hand) => {
      const cards = exampleCards(hand.example);
      expect(cards).toHaveLength(5);
      expect(new Set(cards.map((card) => `${card.rank}${card.suit}`)).size).toBe(5);
    });
  });
  it('explains that a hand can play zero, one, or two personal cards', () => {
    expect(personalCardsUsed(exampleCards('As Ks Qs Js Ts'), hero.holeCards)).toBe(2);
    expect(personalCardsUsed(exampleCards('As 2d 3h 4c 5s'), hero.holeCards)).toBe(1);
    expect(personalCardsUsed(exampleCards('2s 3s 4s 5s 6s'), hero.holeCards)).toBe(0);
  });
});
