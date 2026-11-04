import type { Card, Rank, Suit } from '../types';

export const HAND_TYPES = [
  {
    key: 'royal_flush',
    title: 'Royal flush',
    description: 'A, K, Q, J, 10 of the same suit.',
    example: 'As Ks Qs Js Ts',
  },
  {
    key: 'straight_flush',
    title: 'Straight flush',
    description: 'Five consecutive cards of the same suit.',
    example: '9h 8h 7h 6h 5h',
  },
  {
    key: 'quads',
    title: 'Four of a kind',
    description: 'Four cards of the same rank.',
    example: 'As Ah Ad Ac Ks',
  },
  {
    key: 'full_house',
    title: 'Full house',
    description: 'Three of one rank and two of another.',
    example: 'Kh Kd Kc 7s 7h',
  },
  {
    key: 'flush',
    title: 'Flush',
    description: 'Five cards of the same suit.',
    example: 'As Js 8s 5s 2s',
  },
  {
    key: 'straight',
    title: 'Straight',
    description: 'Five consecutive ranks. An ace can be high or low.',
    example: '9s 8h 7d 6c 5s',
  },
  {
    key: 'trips',
    title: 'Three of a kind',
    description: 'Three cards of the same rank.',
    example: 'Qs Qd Qc 9h 2d',
  },
  {
    key: 'two_pair',
    title: 'Two pair',
    description: 'Two separate pairs.',
    example: 'Js Jh 4d 4c As',
  },
  {
    key: 'pair',
    title: 'One pair',
    description: 'Two cards of the same rank.',
    example: 'Ts Th Ad 6c 3s',
  },
  {
    key: 'high_card',
    title: 'High card',
    description: 'No made combination; compare the highest cards.',
    example: 'As Jd 9h 5c 2d',
  },
] as const;

export const handTypeRank = (key: string): number | undefined => {
  const index = HAND_TYPES.findIndex((hand) => hand.key === key);
  return index < 0 ? undefined : index + 1;
};

export const exampleCards = (example: string): Card[] =>
  example.split(' ').map((value) => ({
    rank: ({ A: 14, K: 13, Q: 12, J: 11, T: 10 }[value[0]] ?? Number(value[0])) as Rank,
    suit: value[1] as Suit,
  }));

export const personalCardsUsed = (best: Card[], hole: Card[]): number =>
  best.filter((card) => hole.some((own) => own.rank === card.rank && own.suit === card.suit))
    .length;
