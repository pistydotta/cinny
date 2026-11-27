import { tr } from '../translation/tr';
import { gameName } from './table-games/text';
import { GameKind } from './table-games/types';

export const liveGameName = (game: GameKind | 'poker' | 'football') => {
  if (game === 'poker') return 'Poker';
  if (game === 'football') return tr('football.title', 'FIFUMA');
  return gameName(game);
};

// How long ago, short enough for a row: "just now", "10 min ago", "3 h ago", "2 d ago".
export const agoText = (at: number, now: number): string => {
  const min = Math.max(0, Math.floor((now - at) / 60_000));
  if (min < 1) return tr('games.live.just_now', 'just now');
  if (min < 60) return tr('games.live.min_ago', '{{n}} min ago', { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return tr('games.live.h_ago', '{{n}} h ago', { n: h });
  return tr('games.live.d_ago', '{{n}} d ago', { n: Math.floor(h / 24) });
};

// What the time on a live row measures: poker counts hands, the other card games and chess
// a person's last move, and a FIFUMA match when it was opened.
export type Activity = 'hand' | 'move' | 'created';

export const activityText = (
  activity: Activity,
  at: number | undefined,
  now: number
): string | undefined => {
  if (at === undefined) {
    return activity === 'hand' ? tr('games.live.no_hand', 'No hand dealt yet') : undefined;
  }
  const ago = agoText(at, now);
  return {
    hand: tr('games.live.last_hand', 'Last hand {{ago}}', { ago }),
    move: tr('games.live.last_move', 'Last move {{ago}}', { ago }),
    created: tr('games.live.created', 'Opened {{ago}}', { ago }),
  }[activity];
};

type LiveStatusInput = {
  activity: Activity;
  activeAt?: number;
  phase?: string;
  score?: [number, number];
  minute?: number;
};

// The row's second line after the players: what the game is doing and how recently.
export const liveStatus = (t: LiveStatusInput, now: number): string => {
  const when = activityText(t.activity, t.activeAt, now);
  if (t.score) return [`${t.score[0]}–${t.score[1]}`, `${t.minute ?? 0}'`].join(' · ');
  if (t.activity === 'created' || t.phase === 'waiting') {
    return [tr('table_games.waiting', 'Waiting for players'), t.phase ? undefined : when]
      .filter(Boolean)
      .join(' · ');
  }
  return when ?? '';
};
