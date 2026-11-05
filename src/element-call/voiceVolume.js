// Per-person call audio, kept on this device only: a volume (0 to 1) and a mute for each
// Matrix user. Element Call's patched bundle asks volumeFor when it sets a participant's
// playback volume, and re-asks whenever `changes` emits. Element Call mixes without Web
// Audio, so an audio element's volume can't go past 1: no boost above 100%.
export const VOICE_STORAGE_KEY = 'blazeroom.callVoices';

const clamp = (value) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 1));

export const readVoices = (storage) => {
  try {
    const parsed = JSON.parse(storage?.getItem(VOICE_STORAGE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const voiceFor = (voices, userId) => {
  const saved = voices[userId];
  return { volume: clamp(saved?.volume ?? 1), muted: saved?.muted === true };
};

export const playbackVolume = (voices, userId, base) => {
  const { volume, muted } = voiceFor(voices, userId);
  return muted ? 0 : clamp(base * volume);
};

export function createVoiceStore(storage) {
  let voices = readVoices(storage);
  let revision = 0;
  const observers = new Set();
  // Same RxJS interop as the share store's `changes`: emits once on subscribe.
  const changes = {
    subscribe(observer) {
      const next = typeof observer === 'function' ? observer : (r) => observer?.next?.(r);
      observers.add(next);
      next(revision);
      return { unsubscribe: () => observers.delete(next) };
    },
    '@@observable': () => changes,
  };
  if (Symbol.observable) changes[Symbol.observable] = () => changes;

  return {
    changes,
    get: (userId) => voiceFor(voices, userId),
    volumeFor: (userId, base) => playbackVolume(voices, userId, base),
    // Called by Cinny after it saved, and on load in case another tab changed something.
    reload() {
      voices = readVoices(storage);
      revision += 1;
      [...observers].forEach((next) => next(revision));
    },
  };
}
