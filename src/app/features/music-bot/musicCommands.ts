import type { MatrixClient, Room } from 'matrix-js-sdk';
import { tr } from '../translation/tr';
import { createMusicApi, publishMusicError } from './musicApi';

type MusicCommand = { name: string; description: string; exe: (payload: string) => Promise<void> };

// Typed in the room's chat like Discord's bots. Nothing is sent to the room: the API is asked,
// and the call's music bar shows the result, errors included.
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
        if (payload.trim()) await quiet(api.add(room.roomId, payload.trim()));
      },
    },
    skip: {
      name: 'skip',
      description: tr('music_bot.command_skip', 'Music bot: skip the song playing'),
      exe: async () => quiet(api.skip(room.roomId)),
    },
    stop: {
      name: 'stop',
      description: tr('music_bot.command_stop', 'Music bot: stop the music and clear the queue'),
      exe: async () => quiet(api.stop(room.roomId)),
    },
  };
};
