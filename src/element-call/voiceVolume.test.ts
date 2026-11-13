import { describe, expect, it } from 'vitest';
import {
  createVoiceStore,
  MUTED_VOLUME,
  playbackVolume,
  readVoices,
  VOICE_STORAGE_KEY,
} from './voiceVolume';
import { OUTPUT_VOLUME_KEY } from './audioSettings';

const storageWith = (value: string) => ({
  getItem: (key: string) => (key === VOICE_STORAGE_KEY ? value : null),
});

describe('voice volume', () => {
  it('reads actual microphone state without confusing local listening mute, missing peers, or multiple devices', () => {
    const store = createVoiceStore(storageWith(JSON.stringify({ '@a:x': { muted: true } })));
    const slot = {};
    const second = {};
    const participant = { isMicrophoneEnabled: true };
    expect(store.microphoneMuted('@a:x')).toBeUndefined();
    store.observeParticipant('@a:x', slot, participant);
    expect(store.microphoneMuted('@a:x')).toBe(false);
    participant.isMicrophoneEnabled = false;
    expect(store.microphoneMuted('@a:x')).toBe(true);
    store.observeParticipant('@a:x', second, { isMicrophoneEnabled: true });
    expect(store.microphoneMuted('@a:x')).toBe(false);
    store.observeParticipant('@a:x', second, null);
    expect(store.microphoneMuted('@a:x')).toBe(true);
    store.observeParticipant('@a:x', slot, null);
    expect(store.microphoneMuted('@a:x')).toBeUndefined();
  });
  it('defaults to full volume, unmuted', () => {
    expect(playbackVolume({}, '@a:x', 0.8)).toBe(0.8);
  });

  it('scales by the saved volume and silences muted people', () => {
    const voices = { '@a:x': { volume: 0.5 }, '@b:x': { volume: 1, muted: true } };
    expect(playbackVolume(voices, '@a:x', 1)).toBe(0.5);
    expect(playbackVolume(voices, '@b:x', 1)).toBe(MUTED_VOLUME);
    expect(playbackVolume({}, '@a:x', 0)).toBe(MUTED_VOLUME);
  });

  it('never goes above 1', () => {
    expect(playbackVolume({ '@a:x': { volume: 3 } }, '@a:x', 1)).toBe(1);
  });

  it('ignores broken storage', () => {
    expect(readVoices(storageWith('{nope'))).toEqual({});
  });

  it('emits on subscribe and on reload', () => {
    let saved = '{}';
    const store = createVoiceStore({ getItem: () => saved });
    const seen: number[] = [];
    store.changes.subscribe((r: number) => seen.push(r));
    saved = JSON.stringify({ '@a:x': { muted: true } });
    store.reload();
    expect(seen).toEqual([0, 1]);
    expect(store.get('@a:x').muted).toBe(true);
  });

  it("applies the person's output volume on top, and rereads it on reload", () => {
    expect(playbackVolume({ '@a:x': { volume: 0.5 } }, '@a:x', 1, 0.5)).toBe(0.25);
    expect(playbackVolume({}, '@a:x', 1, 0)).toBe(MUTED_VOLUME);
    const saved: Record<string, string> = { [OUTPUT_VOLUME_KEY]: '0.4' };
    const store = createVoiceStore({ getItem: (key) => saved[key] ?? null });
    expect(store.volumeFor('@a:x', 1)).toBe(0.4);
    saved[OUTPUT_VOLUME_KEY] = '1';
    store.reload();
    expect(store.volumeFor('@a:x', 1)).toBe(1);
  });
});
