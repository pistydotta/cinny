import { tr } from '../../../translation/tr';

export type Suit = 's' | 'h' | 'd' | 'c';

/** 2..14, where 11 = J, 12 = Q, 13 = K and 14 = A. */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export type Card = {
  rank: Rank;
  suit: Suit;
};

/** Returns a float in [0, 1). Injectable so tests and replays can be deterministic. */
export type RandomFn = () => number;

export const SUITS: Suit[] = ['s', 'h', 'd', 'c'];
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export const SUIT_SYMBOL: Record<Suit, string> = {
  s: '♠',
  h: '♥',
  d: '♦',
  c: '♣',
};

const SUIT_EN: Record<Suit, string> = {
  s: 'Spades',
  h: 'Hearts',
  d: 'Diamonds',
  c: 'Clubs',
};

export const suitName = (suit: Suit): string => tr(`games.suit.${suit}`, SUIT_EN[suit]);

export const RANK_LABEL: Record<Rank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

export const isRedSuit = (suit: Suit): boolean => suit === 'h' || suit === 'd';

export const cardKey = (card: Card): string => `${RANK_LABEL[card.rank]}${card.suit}`;

export const cardsEqual = (a: Card, b: Card): boolean => a.rank === b.rank && a.suit === b.suit;

export const createDeck = (): Card[] =>
  SUITS.flatMap((suit) => RANKS.map((rank): Card => ({ rank, suit })));

/**
 * Cryptographically secure float in [0, 1).
 * Falls back to Math.random only where Web Crypto is unavailable.
 */
export const secureRandom: RandomFn = () => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const buf = new Uint32Array(1);
    cryptoApi.getRandomValues(buf);
    return buf[0] / 2 ** 32;
  }
  return Math.random();
};

export const randomInt = (maxExclusive: number, random: RandomFn): number =>
  Math.floor(random() * maxExclusive);

/** Unbiased Fisher-Yates shuffle. Returns a new array. */
export const shuffle = <T>(items: T[], random: RandomFn): T[] => {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1, random);
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
};
