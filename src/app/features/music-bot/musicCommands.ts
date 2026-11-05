import { getDefaultStore } from 'jotai';
import type { MatrixClient } from 'matrix-js-sdk/lib/client';
import { musicTargetAtom } from './musicState';
import { tr } from '../translation/tr';
import { createMusicApi, publishMusicError } from './musicApi';
import { queueMusic, sendMusicNotice } from './musicChat';

type MusicCommand = { name: string; description: string; exe: (payload: string) => Promise<void> };

// Commands and the visual controls share a queue. Confirmations are posted as the requester.
export const musicCommands = (mx: MatrixClient): Record<'play' | 'skip' | 'stop', MusicCommand> => {
  const api = createMusicApi(() => mx.getAccessToken());
  const target = () => getDefaultStore().get(musicTargetAtom);
  const run = async (
    action: (destination: string, send: (body: string) => Promise<unknown>) => Promise<unknown>
  ) => {
    const destination = target();
    const send = (body: string) =>
      destination === 'personal' ? Promise.resolve() : mx.sendNotice(destination, body);
    try {
      await action(destination, send);
    } catch (error) {
      publishMusicError(destination, error);
    }
  };
  return {
    play: {
      name: 'play',
      description: tr(
        'music_bot.command_play_scope',
        'Play music privately, or in the voice room selected in the music player. Example: /play lofi'
      ),
      exe: async (payload) =>
        run((destination, send) => queueMusic(api, destination, payload, send)),
    },
    skip: {
      name: 'skip',
      description: tr('music_bot.command_skip', 'Music bot: skip the song playing'),
      exe: async () =>
        run(async (destination, send) => {
          await api.skip(destination);
          await sendMusicNotice(
            destination,
            send,
            tr('music_bot.chat_skip', '♫ Skipped the current track.')
          );
        }),
    },
    stop: {
      name: 'stop',
      description: tr('music_bot.command_stop', 'Music bot: stop the music and clear the queue'),
      exe: async () =>
        run(async (destination, send) => {
          await api.stop(destination);
          await sendMusicNotice(
            destination,
            send,
            tr('music_bot.chat_stop', '♫ Stopped the music and cleared the queue.')
          );
        }),
    },
  };
};
