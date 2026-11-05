import { atom } from 'jotai';
import { callEmbedAtom } from '../../state/callEmbed';
import type { CallEmbed } from '../../plugins/call';
import type { PlaybackStatus } from './musicAudio';
import { musicDestination } from './musicDestination';
import { parseVolume, VOLUME_KEY } from './musicSync';

export const musicPlaybackAtom = atom<{ roomId: string; status: PlaybackStatus } | undefined>(
  undefined
);
export const musicSoundAtom = atom(true);

const savedVolume = (): string | null => {
  try {
    return localStorage.getItem(VOLUME_KEY);
  } catch {
    return null;
  }
};

const baseVolumeAtom = atom(parseVolume(savedVolume()));

/** Each listener's own volume for the bot, saved in this browser. */
export const musicVolumeAtom = atom(
  (get) => get(baseVolumeAtom),
  (get, set, volume: number) => {
    set(baseVolumeAtom, volume);
    try {
      localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      // Private mode: the volume lasts until the page closes.
    }
  }
);

// Sharing belongs to one call instance, so leaving/rejoining cannot share accidentally.
export const musicSharedCallAtom = atom<CallEmbed | undefined>(undefined);
export const musicTargetAtom = atom((get) => {
  const call = get(callEmbedAtom);
  return musicDestination(call, get(musicSharedCallAtom));
});
