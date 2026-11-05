import { useSyncExternalStore } from 'react';

// AppBackground renders outside the Jotai provider, so this setting keeps its own tiny store
// instead of living in Cinny's settingsAtom.
const KEY = 'blazeroom.appBackground';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

let enabled = read();

export function setAppBackgroundEnabled(value: boolean) {
  enabled = value;
  try {
    localStorage.setItem(KEY, value ? 'on' : 'off');
  } catch {
    // Private mode: the choice lasts this session only.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAppBackgroundEnabled(): boolean {
  return useSyncExternalStore(subscribe, () => enabled);
}
