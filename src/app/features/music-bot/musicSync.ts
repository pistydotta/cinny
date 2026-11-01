import { ApiError } from '../../utils/blazeroomApi';
import { tr } from '../translation/tr';
import type { NowPlaying } from './musicApi';

/** How far a listener may drift from the room before their audio jumps back in place. */
export const MAX_DRIFT_S = 2.5;
export const POLL_MS = 3000;

/** Where the song should be now, from the server's answer `receivedAt` ms ago (same clock as `now`). */
export const expectedPosition = (np: NowPlaying, receivedAt: number, now: number): number => {
  const position = np.paused ? np.position : np.position + Math.max(0, now - receivedAt) / 1000;
  return np.duration ? Math.min(position, np.duration) : position;
};

export const shouldSeek = (current: number, expected: number): boolean =>
  Math.abs(current - expected) > MAX_DRIFT_S;

export const formatTime = (seconds: number | null): string => {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return '--:--';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
};

export const VOLUME_KEY = 'blazeroom.musicVolume';
export const DEFAULT_VOLUME = 0.5;

export const parseVolume = (saved: string | null): number => {
  const v = saved === null ? NaN : Number(saved);
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : DEFAULT_VOLUME;
};

export const musicErrorText = (e: unknown): string => {
  const code = e instanceof ApiError ? e.code : 'unknown';
  switch (code) {
    case 'invalid_query':
      return tr('music_bot.error_invalid', 'Paste a link or type a song name.');
    case 'unsupported_link':
      return tr(
        'music_bot.error_unsupported',
        'That site is not supported. Try YouTube, SoundCloud, Spotify, Deezer or Apple Music.'
      );
    case 'not_found':
      return tr('music_bot.error_not_found', 'No song found.');
    case 'too_long':
      return tr('music_bot.error_too_long', 'Songs can be at most 90 minutes long.');
    case 'queue_full':
      return tr('music_bot.error_queue_full', 'The queue is full.');
    case 'nothing_playing':
      return tr('music_bot.error_nothing_playing', 'Nothing is playing.');
    case 'fetch_failed':
      return tr('music_bot.error_fetch', 'Could not get that song. Try another link.');
    case 'music_unavailable':
      return tr('music_bot.error_unavailable', 'The music bot is not available on the server.');
    case 'network':
      return tr('music_bot.error_network', 'No connection to the server.');
    default:
      return tr('music_bot.error_unknown', 'Something went wrong. Try again.');
  }
};
