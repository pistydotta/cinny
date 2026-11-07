import { useCallback, useEffect, useRef } from 'react';
import type { TableView } from '../types';
import type { PokerPreferences } from './preferences';
import { enabledSound, PokerSound, soundEvents } from './soundEvents';
import { playPokerSound } from './synth';

export function usePokerSounds(
  view: TableView | undefined,
  heroId: string,
  connected: boolean,
  preferences: PokerPreferences
) {
  const audio = useRef<AudioContext>();
  const master = useRef<GainNode>();
  const previous = useRef<TableView>();
  const settings = useRef(preferences);
  settings.current = preferences;

  // Called only from an explicit pointer/keyboard interaction on the poker screen.
  const unlock = useCallback((explicit?: PokerPreferences) => {
    if (explicit) settings.current = explicit;
    if (!settings.current.sounds || typeof AudioContext === 'undefined') return;
    try {
      if (!audio.current || audio.current.state === 'closed') {
        audio.current = new AudioContext();
        master.current = audio.current.createGain();
        master.current.connect(audio.current.destination);
      }
      master.current?.gain.setValueAtTime(settings.current.volume, audio.current.currentTime);
      audio.current.resume().catch(() => undefined);
    } catch {
      /* Audio is optional (browser autoplay/device restrictions). */
    }
  }, []);

  const play = useCallback((event: PokerSound) => {
    const context = audio.current;
    if (
      !context ||
      context.state !== 'running' ||
      !master.current ||
      !enabledSound(event, settings.current)
    )
      return;
    playPokerSound(context, master.current, event);
  }, []);

  useEffect(() => {
    if (audio.current && master.current) {
      master.current.gain.setValueAtTime(
        preferences.sounds ? preferences.volume : 0,
        audio.current.currentTime
      );
    }
  }, [preferences.sounds, preferences.volume]);

  useEffect(() => {
    if (!connected || !view) {
      previous.current = undefined;
      return;
    }
    soundEvents(previous.current, view, heroId).forEach(play);
    previous.current = view;
  }, [connected, view, heroId, play]);

  useEffect(
    () => () => {
      audio.current?.close().catch(() => undefined);
    },
    []
  );
  return {
    unlock,
    preview: () => {
      unlock();
      window.setTimeout(() => play('turn'), 50);
    },
  };
}
