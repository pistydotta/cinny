import { useCallback, useSyncExternalStore } from 'react';
import { readVoices, voiceFor, VOICE_STORAGE_KEY } from '../../../element-call/voiceVolume';
import type { Voice, VoiceStore } from '../../../element-call/voiceVolume';
import type { CallEmbed } from '../../plugins/call/CallEmbed';

// Mute and volume per person, saved in this browser only. The call page shares our origin and
// reads the same key (element-call/voiceVolume.js); reload makes it apply the change now.
const listeners = new Set<() => void>();

const read = (): string | null => {
  try {
    return localStorage.getItem(VOICE_STORAGE_KEY);
  } catch {
    return null;
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const saveVoice = (userId: string, voice: Voice, embed: CallEmbed | undefined): void => {
  const voices = readVoices({ getItem: read });
  voices[userId] = voice;
  try {
    localStorage.setItem(VOICE_STORAGE_KEY, JSON.stringify(voices));
  } catch {
    return;
  }
  const win = embed?.control.iframe.contentWindow as { blazeroomVoices?: VoiceStore } | null;
  win?.blazeroomVoices?.reload();
  listeners.forEach((listener) => listener());
};

export const useVoice = (userId: string): Voice => {
  const raw = useSyncExternalStore(subscribe, read);
  return voiceFor(readVoices({ getItem: () => raw }), userId);
};

export const useSaveVoice = (userId: string, embed: CallEmbed | undefined) =>
  useCallback((voice: Voice) => saveVoice(userId, voice, embed), [userId, embed]);
