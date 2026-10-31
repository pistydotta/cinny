import { tr } from '../../translation/tr';
import { formatChips, HandName, LogEntry, LogParam, Rank, Suit, suitName } from './types';

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

export const handText = ({ key, params }: HandName): string => {
  const rank = params.rank as Rank;
  const ranks = params.ranks as Rank;
  const ranks2 = params.ranks2 as Rank;
  switch (key) {
    case 'royal_flush':
      return tr('games.hand.royal_flush', 'Royal Flush');
    case 'straight_flush':
      return tr('games.hand.straight_flush', 'Straight Flush, {{rank}} high', {
        rank: rankTop(rank),
      });
    case 'quads':
      return tr('games.hand.quads', 'Four of a Kind, {{ranks}}', { ranks: rankPlural(ranks) });
    case 'full_house':
      return tr('games.hand.full_house', 'Full House, {{ranks}} over {{ranks2}}', {
        ranks: rankPlural(ranks),
        ranks2: rankPlural(ranks2),
      });
    case 'flush':
      return tr('games.hand.flush', 'Flush, {{suit}}', { suit: suitName(params.suit as Suit) });
    case 'straight':
      return tr('games.hand.straight', 'Straight, {{rank}} high', { rank: rankTop(rank) });
    case 'trips':
      return tr('games.hand.trips', 'Three of a Kind, {{ranks}}', { ranks: rankPlural(ranks) });
    case 'two_pair':
      return tr('games.hand.two_pair', 'Two Pair, {{ranks}} and {{ranks2}}', {
        ranks: rankPlural(ranks),
        ranks2: rankPlural(ranks2),
      });
    case 'pair':
      return tr('games.hand.pair', 'Pair of {{ranks}}', { ranks: rankPlural(ranks) });
    case 'high_card':
      return tr('games.hand.high_card', 'High Card, {{rank}}', { rank: rankName(rank) });
    default:
      return key;
  }
};

const isHandName = (v: LogParam): v is HandName => typeof v === 'object';

const LOG_EN: Record<string, string> = {
  sat: '{{name}} sat down with {{chips}} chips',
  left: '{{name}} left the table',
  rebuy: '{{name}} bought {{chips}} more chips',
  hand: 'Hand #{{n}}',
  small_blind: '{{name}} posts the small blind of {{chips}}',
  big_blind: '{{name}} posts the big blind of {{chips}}',
  fold: '{{name}} folds',
  check: '{{name}} checks',
  call_allin: '{{name}} calls {{chips}} and is all-in',
  call: '{{name}} calls {{chips}}',
  allin: '{{name}} goes all-in for {{chips}}',
  bet: '{{name}} bets {{chips}}',
  raise: '{{name}} raises to {{chips}}',
  uncalled: 'Uncalled {{chips}} returned to {{name}}',
  shows: '{{name}} shows {{hand}}',
  won: '{{name}} wins {{chips}}',
  won_no_show: '{{name}} wins {{chips}} without showing',
};

// An unknown key (a newer server) shows as itself rather than breaking the table.
export const logText = ({ key, params }: LogEntry): string => {
  const en = LOG_EN[key];
  if (en === undefined) return key;
  const values: Record<string, string | number> = {};
  Object.entries(params).forEach(([name, value]) => {
    if (isHandName(value)) values[name] = handText(value);
    else values[name] = name === 'chips' && typeof value === 'number' ? formatChips(value) : value;
  });
  const text = tr(`games.log.${key}`, en, values);
  return key === 'hand' ? `— ${text} —` : text;
};
