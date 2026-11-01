import { atom } from 'jotai';
import type { MusicView } from './musicApi';
import { parseVolume, VOLUME_KEY } from './musicSync';

export type MusicSnapshot = {
  roomId: string;
  view: MusicView;
  /** performance.now() when the server's answer arrived. */
  receivedAt: number;
};

/** The music of the call this app is in, kept by MusicBotPlayer. */
export const musicSnapshotAtom = atom<MusicSnapshot | undefined>(undefined);

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
