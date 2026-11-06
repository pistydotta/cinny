import { GamePlayer, GameTable, TableCard } from './types';

export type SeatBadge =
  | { kind: 'out' }
  | { kind: 'thinking' }
  | { kind: 'waiting' }
  | { kind: 'predicted'; prediction: number }
  | { kind: 'progress'; won: number; prediction: number }
  | { kind: 'exact'; prediction: number }
  | { kind: 'missed'; penalty: number };

// What the badge over a seat says. It only reads the view the API sent.
export function seatBadge(table: GameTable, player: GamePlayer, seat: number): SeatBadge | null {
  if (player.eliminated) return { kind: 'out' };
  const { phase } = table;
  if (phase === 'predict') {
    if (player.prediction !== null) return { kind: 'predicted', prediction: player.prediction };
    return table.turn === seat ? { kind: 'thinking' } : { kind: 'waiting' };
  }
  if (player.prediction === null || player.prediction === undefined) return null;
  if (phase === 'play') {
    return { kind: 'progress', won: player.won ?? 0, prediction: player.prediction };
  }
  if (phase === 'round_end') {
    const penalty = Math.abs(player.prediction - (player.won ?? 0));
    return penalty === 0
      ? { kind: 'exact', prediction: player.prediction }
      : { kind: 'missed', penalty };
  }
  return null;
}

/** Sum of the predictions made so far, to compare with the tricks on offer. */
export const predictionTotal = (table: GameTable): number =>
  table.players.reduce((sum, p) => sum + (p.eliminated ? 0 : p.prediction ?? 0), 0);

/** The trick shown on the felt: the one being played, or the last one while the next starts. */
export function shownTrick(table: GameTable) {
  if (table.trick?.length) return { cards: table.trick, done: false };
  if (table.lastTrick?.length) return { cards: table.lastTrick, done: true };
  return { cards: [], done: false };
}

const TRUCO_ORDER = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
const LEGACY_ORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', '★'];
const SUIT_ORDER = ['d', 's', 'h', 'c'];

/** The rank the vira turns into manilhas: the next one up, with 3 wrapping to 4. */
export const manilhaRank = (vira: TableCard): string =>
  TRUCO_ORDER[(TRUCO_ORDER.indexOf(vira.rank) + 1) % TRUCO_ORDER.length];

/**
 * Sorts your hand weakest to strongest, for display only: the API alone decides tricks.
 * Without a vira the table is from the first version (A low to joker, suits equal).
 */
export function handOrder(card: TableCard, vira?: TableCard): number {
  // Jokers have their own suits ('r', 'b'), which count as the lowest.
  if (!vira)
    return LEGACY_ORDER.indexOf(card.rank) * 4 + Math.max(0, SUIT_ORDER.indexOf(card.suit));
  const rank = card.rank === manilhaRank(vira) ? 10 : TRUCO_ORDER.indexOf(card.rank);
  return rank * 4 + SUIT_ORDER.indexOf(card.suit);
}
