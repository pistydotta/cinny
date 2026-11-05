import type { NowPlaying } from './musicApi';
import { expectedPosition, shouldSeek } from './musicSync';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'blocked' | 'error';
type AudioTarget = Pick<
  HTMLAudioElement,
  | 'src'
  | 'currentTime'
  | 'readyState'
  | 'paused'
  | 'play'
  | 'pause'
  | 'load'
  | 'removeAttribute'
  | 'addEventListener'
  | 'removeEventListener'
>;

/** Playback failures belong to this listener, never skip a song for the whole room. */
export function createMusicAudio(target: AudioTarget, report: (status: PlaybackStatus) => void) {
  const audio = target;
  let track: NowPlaying | null = null;
  let receivedAt = 0;
  let connected = false;
  let generation = 0;
  let failed = false;
  let disposed = false;
  let attempting = false;
  const seek = () => {
    if (!track?.audio || audio.readyState < 1) return;
    const position = expectedPosition(track, receivedAt, performance.now());
    if (shouldSeek(audio.currentTime, position)) audio.currentTime = position;
  };
  const play = () => {
    if (disposed || !connected || !track?.audio || track.paused || attempting) return;
    const sentGeneration = generation;
    attempting = true;
    audio
      .play()
      .catch((error: unknown) => {
        if (disposed || sentGeneration !== generation || track?.paused || !connected) return;
        failed = true;
        report((error as { name?: string })?.name === 'NotAllowedError' ? 'blocked' : 'error');
      })
      .finally(() => {
        if (sentGeneration === generation) attempting = false;
      });
  };
  const metadata = () => seek();
  const playing = () => {
    failed = false;
    report('playing');
  };
  const waiting = () => {
    if (!failed) report('loading');
  };
  const error = () => {
    failed = true;
    report('error');
  };
  audio.addEventListener('loadedmetadata', metadata);
  audio.addEventListener('playing', playing);
  audio.addEventListener('waiting', waiting);
  audio.addEventListener('error', error);
  return {
    follow(np: NowPlaying | null, at: number, online = true) {
      const changed = np?.id !== track?.id || np?.audio !== track?.audio;
      const resumed = track?.paused && !np?.paused;
      track = np;
      receivedAt = at;
      connected = online;
      if (changed || !online || np?.paused) {
        generation += 1;
        attempting = false;
      }
      if (changed) {
        failed = false;
        audio.pause();
        if (np?.audio) {
          audio.src = np.audio;
          audio.load();
        } else {
          audio.removeAttribute('src');
          audio.load();
        }
      }
      if (!online || !np?.audio) {
        audio.pause();
        report(np ? 'loading' : 'idle');
        return;
      }
      seek();
      if (np.paused) {
        audio.pause();
        report('paused');
      } else if (audio.paused && (!failed || resumed)) play();
    },
    retry() {
      failed = false;
      if (track?.audio && connected && !track.paused) {
        generation += 1;
        attempting = false;
        audio.load();
        seek();
        report('loading');
        play();
      }
    },
    dispose() {
      disposed = true;
      generation += 1;
      audio.removeEventListener('loadedmetadata', metadata);
      audio.removeEventListener('playing', playing);
      audio.removeEventListener('waiting', waiting);
      audio.removeEventListener('error', error);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    },
  };
}

const playbackRequests = new Set<() => void>();
export const requestMusicPlayback = () => playbackRequests.forEach((fn) => fn());
export const onMusicPlaybackRequest = (listener: () => void) => {
  playbackRequests.add(listener);
  return () => {
    playbackRequests.delete(listener);
  };
};
