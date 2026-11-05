import type { MatrixClient } from 'matrix-js-sdk/lib/client';
import type { Room } from 'matrix-js-sdk/lib/models/room';
import { tr } from '../translation/tr';
import { createMusicApi, publishMusicError } from './musicApi';
import { queueMusic, sendMusicNotice } from './musicChat';

type MusicCommand = { name: string; description: string; exe: (payload: string) => Promise<void> };

// Commands and the visual controls share a queue. Confirmations are posted as the requester.
export const musicCommands = (
  mx: MatrixClient,
  room: Room
): Record<'play' | 'skip' | 'stop', MusicCommand> => {
  const api = createMusicApi(() => mx.getAccessToken());
  const quiet = (p: Promise<unknown>) =>
    p.then(
      () => undefined,
      (e) => publishMusicError(room.roomId, e)
    );
  return {
    play: {
      name: 'play',
      description: tr(
        'music_bot.command_play',
        "Music bot: play a link (YouTube, Spotify, SoundCloud...) or a song name in this room's call. Example: /play lofi"
      ),
      exe: async (payload) => {
        await quiet(
          queueMusic(api, room.roomId, payload, (body) => mx.sendNotice(room.roomId, body))
        );
      },
    },
    skip: {
      name: 'skip',
      description: tr('music_bot.command_skip', 'Music bot: skip the song playing'),
      exe: async () =>
        quiet(
          api
            .skip(room.roomId)
            .then(() =>
              sendMusicNotice(
                room.roomId,
                (body) => mx.sendNotice(room.roomId, body),
                tr('music_bot.chat_skip', '♫ Skipped the current track.')
              )
            )
        ),
    },
    stop: {
      name: 'stop',
      description: tr('music_bot.command_stop', 'Music bot: stop the music and clear the queue'),
      exe: async () =>
        quiet(
          api
            .stop(room.roomId)
            .then(() =>
              sendMusicNotice(
                room.roomId,
                (body) => mx.sendNotice(room.roomId, body),
                tr('music_bot.chat_stop', '♫ Stopped the music and cleared the queue.')
              )
            )
        ),
    },
  };
};
