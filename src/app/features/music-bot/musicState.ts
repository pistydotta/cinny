import { atom } from 'jotai';
import type { PlaybackStatus } from './musicAudio';
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
