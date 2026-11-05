export const VOICE_STORAGE_KEY: string;
export const MUTED_VOLUME: number;
export type Voice = { volume: number; muted: boolean };
export type Voices = Record<string, Partial<Voice>>;
export function readVoices(storage: Pick<Storage, 'getItem'> | undefined): Voices;
export function voiceFor(voices: Voices, userId: string): Voice;
export function playbackVolume(voices: Voices, userId: string, base: number): number;
export type VoiceStore = {
  changes: { subscribe: (observer: unknown) => { unsubscribe: () => void } };
  get: (userId: string) => Voice;
  volumeFor: (userId: string, base: number) => number;
  reload: () => void;
};
export function createVoiceStore(storage: Pick<Storage, 'getItem'> | undefined): VoiceStore;
