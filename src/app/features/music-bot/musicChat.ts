import { ApiError } from '../../utils/blazeroomApi';
import { tr } from '../translation/tr';
import type { MusicApi, MusicTrack } from './musicApi';
import { publishMusicError } from './musicApi';
import { beginMusicRequest } from './musicActivity';

export const musicRequestMessage = (added: MusicTrack[]): string => {
  const first = added[0];
  if (!first) return '';
  const text = tr('music_bot.chat_added', '♫ Added to the voice-call queue: {{title}}', {
    title: first.title.slice(0, 300),
  });
  const extra =
    added.length > 1
      ? tr('music_bot.chat_more', 'and {{count}} more tracks', { count: added.length - 1 })
      : '';
  // Never put the private audio capability URL into persistent Matrix history.
  return [text, extra, first.url].filter(Boolean).join('\n');
};

export type SendMusicNotice = (body: string) => Promise<unknown>;
export const sendMusicNotice = async (roomId: string, send: SendMusicNotice, body: string) => {
  try {
    await send(body);
  } catch {
    // Playback already changed. Retrying the music request would add it twice.
    publishMusicError(roomId, new ApiError('chat_failed', 0));
  }
};

export const queueMusic = async (
  api: MusicApi,
  roomId: string,
  query: string,
  send: SendMusicNotice
) => {
  if (!query.trim()) throw new ApiError('invalid_query', 400);
  const finish = beginMusicRequest(roomId);
  try {
    const view = await api.add(roomId, query.trim());
    await sendMusicNotice(roomId, send, musicRequestMessage(view.added));
    return view;
  } finally {
    finish();
  }
};
