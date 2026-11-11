import { GameTable, TableCard } from './types';
import { shownTrick } from './fodinhaSeat';

// Bots are API seats, not Matrix accounts: `bot:1`, `bot:2`...
const BOT_NAMES = ['Zé', 'Tião', 'Dito', 'Nena', 'Cida', 'Juca'];
export const isBotId = (userId: string) => userId.startsWith('bot:');
export const botName = (userId: string) => {
  const n = Number(userId.slice(4)) || 1;
  return `Bot ${BOT_NAMES[(n - 1) % BOT_NAMES.length]}`;
};

export const isRed = (card?: TableCard) => !!card && ['d', 'h', 'r'].includes(card.suit);

/** What the next Truco raise asks for: 1 → 3 → 6 → 9 → 12. */
export const nextRaise = (value = 1) => (value === 1 ? 3 : value + 3);

/** The pair shown as "us": the viewer's, or the first pair for spectators. */
export const ourTeam = (table: GameTable) => (table.mySeat >= 0 ? table.mySeat % 2 : 0);

export type PlacedCard = {
  seat: number;
  card: TableCard;
  /** The card played last, while the trick is still open. */
  latest: boolean;
  /** The card that took the finished trick. */
  win: boolean;
  /** A losing card of a finished trick. */
  dim: boolean;
};

/** The cards on the table, each tied to the seat that played it. The API decides the winner. */
export function placedCards(table: GameTable): PlacedCard[] {
  const { cards, done } = shownTrick(table);
  return cards.map(({ seat, card }, i) => {
    const win = done && table.lastWinner === seat;
    return {
      seat,
      card,
      latest: !done && i === cards.length - 1,
      win,
      dim: done && table.lastWinner !== undefined && !win,
    };
  });
}

/** Seconds per turn, as the API counts them: Truco is quick, Fodinha bets on long hands. */
export const turnMs = (kind: GameTable['kind']) => (kind === 'truco' ? 45_000 : 120_000);

export type TrickResult = { kind: 'tie' } | { kind: 'won'; seat: number };

/** Who took the trick shown on the felt, once it is complete. */
export function trickResult(
  table: Pick<GameTable, 'lastWinner'>,
  done: boolean
): TrickResult | null {
  if (!done || table.lastWinner === undefined) return null;
  return table.lastWinner === null ? { kind: 'tie' } : { kind: 'won', seat: table.lastWinner };
}

/** Truco's three tricks for the hand: whose pair took each one, from the viewer's side. */
export function trickMarks(table: GameTable): ('us' | 'them' | 'tie' | 'open')[] {
  const ours = ourTeam(table);
  return [0, 1, 2].map((i) => {
    const t = table.tricks?.[i];
    if (t === undefined) return 'open';
    if (t === null) return 'tie';
    return t === ours ? 'us' : 'them';
  });
}

/** Penalties a Fodinha player can still take: more than five eliminates. */
export const livesLeft = (penalties: number) => Math.max(0, 5 - penalties);
