import { useCallback, useEffect, useRef } from 'react';
import type { TableView } from '../types';
import type { PokerPreferences } from './preferences';
import { enabledSound, PokerSound, soundEvents } from './soundEvents';

const NOTES: Record<PokerSound, number[]> = {
  turn: [660, 880],
  deal: [260],
  chips: [1100, 1500],
  fold: [190],
  check: [460],
  win: [523, 659, 784],
};

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
    NOTES[event].forEach((frequency, i) => {
      const start = context.currentTime + i * 0.075;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = event === 'deal' || event === 'fold' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.09);
      oscillator.connect(gain);
      gain.connect(master.current as GainNode);
      oscillator.start(start);
      oscillator.stop(start + 0.1);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
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
