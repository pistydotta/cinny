import { tr } from '../../translation/tr';
import { GameKind, TableCard } from './types';

export const gameName = (kind: GameKind) =>
  ({ chess: tr('table_games.chess', 'Chess'), truco: 'Truco', fodinha: 'Fodinha' }[kind]);
export const shortName = (id: string) => id.replace(/^@/, '').split(':')[0];
export const cardText = (card?: TableCard) =>
  !card || card.covered
    ? '🂠'
    : `${card.rank}${
        ({ d: '♦', s: '♠', h: '♥', c: '♣' } as Record<string, string>)[card.suit] ?? ''
      }`;
export const phaseText = (phase: string) =>
  ({
    waiting: tr('table_games.waiting', 'Waiting for players'),
    predict: tr('table_games.predicting', 'Predictions'),
    play: tr('table_games.playing', 'Playing'),
    respond: tr('table_games.responding', 'Respond to the raise'),
    eleven: tr('table_games.eleven', 'Hand of eleven: play or run?'),
    round_end: tr('table_games.round_end', 'Round complete'),
    finished: tr('table_games.finished', 'Finished'),
  }[phase] ?? phase);
export const gameError = (code?: string) =>
  ({
    not_enough_credits: tr('table_games.no_credits', 'You do not have enough card-game credits.'),
    stale_action: tr('table_games.stale', 'The table changed. Review it and try again.'),
    not_player: tr('table_games.not_player', 'Spectators cannot play moves.'),
    not_your_turn: tr('table_games.not_turn', 'Wait for your turn.'),
    illegal_move: tr('table_games.illegal', 'That move is not legal.'),
    table_full: tr('table_games.full', 'This table is full or has already started.'),
    comment_rate_limit: tr('table_games.slow', 'Wait a moment before commenting again.'),
    not_found: tr('table_games.missing', 'This table could not be found.'),
    too_many_tables: tr(
      'table_games.too_many',
      'Finish or cancel an existing table before creating another.'
    ),
  }[code ?? ''] ?? tr('table_games.error', 'Could not update the table. Please try again.'));

export const rulesText = (kind: GameKind) => {
  if (kind === 'truco')
    return tr(
      'table_games.truco_rules',
      'Paulista · Four players, alternating teams (1 + 3 versus 2 + 4). Three cards each, vira defines manilhas; suits: clubs > hearts > spades > diamonds. Normal ranks: 3 > 2 > A > K > J > Q > 7 > 6 > 5 > 4. Win two tricks to score; a tied trick favors the team that won the first. Three tied tricks score nothing. Play to 12 points. Raises: 1 → 3 → 6 → 9 → 12; running awards the previously accepted value. At 11, view your partner’s cards and choose: play for 3 or run for 1. At 11–11 everyone plays blind. Covered cards are allowed after the first trick. The credit stake never rises during play; the winning pair splits the pot.'
    );
  if (kind === 'fodinha')
    return tr(
      'table_games.fodinha_rules',
      'Elimination variant · 2–6 players, the 40-card Truco deck (no 8, 9, 10 or jokers). A vira is turned face up each round; the rank above it is the manilha and beats everything. Other cards rank 3 > 2 > A > K > J > Q > 7 > 6 > 5 > 4. Suits break every tie: clubs > hearts > spades > diamonds. No obligation to follow suit. Before playing, everyone bets how many tricks they will win; the last to bet may make the total match the number of cards. The one-card round is played on the forehead: you see everyone’s card but yours. Rounds go up one card at a time to the most the deck allows (19 with 2 players, 13 with 3, 9 with 4, 7 with 5, 6 with 6), then back down to 1, and up again. Lose the difference between your bet and your tricks as penalties. More than 5 accumulated penalties eliminates you at the end of a round. If everyone crosses the limit, the lowest total survives; tied lowest players play on. The last survivor wins the pot.'
    );
  return tr(
    'table_games.chess_rules',
    'Casual chess without a clock or credits. White moves first. Legal moves, castling, en passant, promotion and checkmate are checked by the server. Stalemate, insufficient material, threefold repetition and the fifty-move rule end in a draw automatically. Any signed-in member can watch and comment. Select a piece and then a highlighted destination.'
  );
};
