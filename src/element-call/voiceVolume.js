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

// LiveKit re-applies a saved volume to a new audio element only when it's truthy, so a mute
// saved before the track arrives would play at full volume. Muted is near-silent, never 0.
export const MUTED_VOLUME = 0.0001;

export const playbackVolume = (voices, userId, base) => {
  const { volume, muted } = voiceFor(voices, userId);
  const value = muted ? 0 : clamp(base * volume);
  return value === 0 ? MUTED_VOLUME : value;
};

export function createVoiceStore(storage) {
  let voices = readVoices(storage);
  let revision = 0;
  const observers = new Set();
  const participants = new Map();
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
    // Keep actual LiveKit participants so mute icons also work with older clients.
    // A slot can become null during reconnects; never infer mute from a missing track.
    observeParticipant(userId, slot, participant) {
      const slots = participants.get(userId) ?? new Map();
      if (participant) slots.set(slot, participant);
      else slots.delete(slot);
      if (slots.size) participants.set(userId, slots);
      else participants.delete(userId);
    },
    microphoneMuted(userId) {
      const active = [...(participants.get(userId)?.values() ?? [])];
      if (!active.length || active.some((p) => typeof p.isMicrophoneEnabled !== 'boolean'))
        return undefined;
      return active.every((p) => !p.isMicrophoneEnabled);
    },
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
