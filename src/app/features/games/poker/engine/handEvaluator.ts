import { tr } from '../../../translation/tr';
import { Card, Rank, Suit, suitName, SUITS } from './cards';

export enum HandCategory {
  HighCard = 0,
  OnePair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
}

export type HandValue = {
  category: HandCategory;
  /** Tie-break ranks, most significant first. Compared lexicographically. */
  ranks: number[];
  /** The five cards forming the hand, ordered for display. */
  cards: Card[];
};

const RANK_EN: Record<Rank, string> = {
  2: 'Two',
  3: 'Three',
  4: 'Four',
  5: 'Five',
  6: 'Six',
  7: 'Seven',
  8: 'Eight',
  9: 'Nine',
  10: 'Ten',
  11: 'Jack',
  12: 'Queen',
  13: 'King',
  14: 'Ace',
};

const RANKS_EN: Record<Rank, string> = {
  2: 'Twos',
  3: 'Threes',
  4: 'Fours',
  5: 'Fives',
  6: 'Sixes',
  7: 'Sevens',
  8: 'Eights',
  9: 'Nines',
  10: 'Tens',
  11: 'Jacks',
  12: 'Queens',
  13: 'Kings',
  14: 'Aces',
};

const rankName = (rank: Rank) => tr(`games.rank.${rank}`, RANK_EN[rank]);
const rankPlural = (rank: Rank) => tr(`games.ranks.${rank}`, RANKS_EN[rank]);
/** Rank as the top of a straight ("o Rei" / "a Dama" in Portuguese). */
const rankTop = (rank: Rank) => tr(`games.rank_top.${rank}`, RANK_EN[rank]);

/** High card of the best straight among the ranks marked present (index = rank), or 0. */
const findStraightHigh = (present: boolean[]): number => {
  for (let high = 14; high >= 6; high -= 1) {
    if (
      present[high] &&
      present[high - 1] &&
      present[high - 2] &&
      present[high - 3] &&
      present[high - 4]
    ) {
      return high;
    }
  }
  // A-2-3-4-5: the ace plays low.
  if (present[14] && present[2] && present[3] && present[4] && present[5]) return 5;
  return 0;
};

const presentRanks = (cards: Card[]): boolean[] => {
  const present: boolean[] = [];
  cards.forEach((c) => {
    present[c.rank] = true;
  });
  return present;
};

/** The five cards of a straight with the given high card, ordered for display (5-4-3-2-A). */
const straightCards = (cards: Card[], high: number): Card[] => {
  const ranks = high === 5 ? [5, 4, 3, 2, 14] : [high, high - 1, high - 2, high - 3, high - 4];
  return ranks.map((rank) => cards.find((c) => c.rank === rank) as Card);
};

/** Positive when `a` beats `b`, negative when `b` wins, 0 on an exact tie. */
export const compareHands = (a: HandValue, b: HandValue): number => {
  if (a.category !== b.category) return a.category - b.category;
  const len = Math.max(a.ranks.length, b.ranks.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (a.ranks[i] ?? 0) - (b.ranks[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

/**
 * Best five-card hand out of 5 to 7 cards.
 * Works directly on rank and suit groups instead of trying all 21 combinations, so bots can run
 * thousands of simulations per decision.
 */
export const evaluateBest = (cards: Card[]): HandValue => {
  if (cards.length < 5) {
    throw new Error('At least five cards are required to evaluate a hand');
  }
  const sorted = cards.slice().sort((a, b) => b.rank - a.rank);

  const bySuit: Record<Suit, Card[]> = { s: [], h: [], d: [], c: [] };
  sorted.forEach((c) => bySuit[c.suit].push(c));
  const flushCards = SUITS.map((suit) => bySuit[suit]).find((list) => list.length >= 5);
  if (flushCards) {
    const high = findStraightHigh(presentRanks(flushCards));
    if (high) {
      return {
        category: HandCategory.StraightFlush,
        ranks: [high],
        cards: straightCards(flushCards, high),
      };
    }
  }

  const byRank = new Map<number, Card[]>();
  sorted.forEach((c) => {
    const group = byRank.get(c.rank);
    if (group) group.push(c);
    else byRank.set(c.rank, [c]);
  });
  const groups = Array.from(byRank.values()).sort(
    (a, b) => b.length - a.length || b[0].rank - a[0].rank
  );
  const kickers = (exclude: number[], count: number) =>
    sorted.filter((c) => !exclude.includes(c.rank)).slice(0, count);

  const quads = groups.find((g) => g.length === 4);
  if (quads) {
    const kicker = kickers([quads[0].rank], 1);
    return {
      category: HandCategory.FourOfAKind,
      ranks: [quads[0].rank, kicker[0].rank],
      cards: [...quads, ...kicker],
    };
  }

  const trips = groups.filter((g) => g.length === 3);
  const pairs = groups.filter((g) => g.length === 2);
  if (trips.length > 0 && (trips.length > 1 || pairs.length > 0)) {
    const [set] = trips;
    const secondTrips = trips[1];
    const pair =
      secondTrips && (pairs.length === 0 || secondTrips[0].rank > pairs[0][0].rank)
        ? secondTrips.slice(0, 2)
        : pairs[0];
    return {
      category: HandCategory.FullHouse,
      ranks: [set[0].rank, pair[0].rank],
      cards: [...set, ...pair],
    };
  }

  if (flushCards) {
    const five = flushCards.slice(0, 5);
    return { category: HandCategory.Flush, ranks: five.map((c) => c.rank), cards: five };
  }

  const straightHigh = findStraightHigh(presentRanks(sorted));
  if (straightHigh) {
    return {
      category: HandCategory.Straight,
      ranks: [straightHigh],
      cards: straightCards(sorted, straightHigh),
    };
  }

  if (trips.length > 0) {
    const [set] = trips;
    const rest = kickers([set[0].rank], 2);
    return {
      category: HandCategory.ThreeOfAKind,
      ranks: [set[0].rank, ...rest.map((c) => c.rank)],
      cards: [...set, ...rest],
    };
  }

  if (pairs.length >= 2) {
    const [high, low] = pairs;
    const rest = kickers([high[0].rank, low[0].rank], 1);
    return {
      category: HandCategory.TwoPair,
      ranks: [high[0].rank, low[0].rank, rest[0].rank],
      cards: [...high, ...low, ...rest],
    };
  }

  if (pairs.length === 1) {
    const [pair] = pairs;
    const rest = kickers([pair[0].rank], 3);
    return {
      category: HandCategory.OnePair,
      ranks: [pair[0].rank, ...rest.map((c) => c.rank)],
      cards: [...pair, ...rest],
    };
  }

  const five = sorted.slice(0, 5);
  return { category: HandCategory.HighCard, ranks: five.map((c) => c.rank), cards: five };
};

export const describeHand = (hand: HandValue): string => {
  const [r1, r2] = hand.ranks as Rank[];
  switch (hand.category) {
    case HandCategory.StraightFlush:
      return r1 === 14
        ? tr('games.hand.royal_flush', 'Royal Flush')
        : tr('games.hand.straight_flush', 'Straight Flush, {{rank}} high', { rank: rankTop(r1) });
    case HandCategory.FourOfAKind:
      return tr('games.hand.quads', 'Four of a Kind, {{ranks}}', { ranks: rankPlural(r1) });
    case HandCategory.FullHouse:
      return tr('games.hand.full_house', 'Full House, {{ranks}} over {{ranks2}}', {
        ranks: rankPlural(r1),
        ranks2: rankPlural(r2),
      });
    case HandCategory.Flush:
      return tr('games.hand.flush', 'Flush, {{suit}}', { suit: suitName(hand.cards[0].suit) });
    case HandCategory.Straight:
      return tr('games.hand.straight', 'Straight, {{rank}} high', { rank: rankTop(r1) });
    case HandCategory.ThreeOfAKind:
      return tr('games.hand.trips', 'Three of a Kind, {{ranks}}', { ranks: rankPlural(r1) });
    case HandCategory.TwoPair:
      return tr('games.hand.two_pair', 'Two Pair, {{ranks}} and {{ranks2}}', {
        ranks: rankPlural(r1),
        ranks2: rankPlural(r2),
      });
    case HandCategory.OnePair:
      return tr('games.hand.pair', 'Pair of {{ranks}}', { ranks: rankPlural(r1) });
    default:
      return tr('games.hand.high_card', 'High Card, {{rank}}', { rank: rankName(r1) });
  }
};

/**
 * Describes the best hand currently available with 2 to 7 cards.
 * Used to show the player what they hold before the river.
 */
export const describePartialHand = (cards: Card[]): string => {
  if (cards.length >= 5) return describeHand(evaluateBest(cards));
  const sorted = cards.slice().sort((a, b) => b.rank - a.rank);
  const counts = new Map<Rank, number>();
  sorted.forEach((c) => counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1));
  const groups = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const [first, second] = groups;
  const partial: HandValue = { category: HandCategory.HighCard, ranks: [sorted[0].rank], cards };
  if (first[1] === 4)
    return describeHand({ ...partial, category: HandCategory.FourOfAKind, ranks: [first[0]] });
  if (first[1] === 3)
    return describeHand({ ...partial, category: HandCategory.ThreeOfAKind, ranks: [first[0]] });
  if (first[1] === 2 && second?.[1] === 2) {
    return describeHand({
      ...partial,
      category: HandCategory.TwoPair,
      ranks: [first[0], second[0]],
    });
  }
  if (first[1] === 2)
    return describeHand({ ...partial, category: HandCategory.OnePair, ranks: [first[0]] });
  return describeHand(partial);
};
