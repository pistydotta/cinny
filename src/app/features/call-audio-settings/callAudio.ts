import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  INPUT_DEVICE_KEY,
  INPUT_GAIN_KEY,
  OUTPUT_DEVICE_KEY,
  OUTPUT_VOLUME_KEY,
  readCallAudio,
} from '../../../element-call/audioSettings';
import type { CallAudio } from '../../../element-call/audioSettings';
import type { VoiceStore } from '../../../element-call/voiceVolume';
import type { CallEmbed } from '../../plugins/call/CallEmbed';

// The mic and speaker setup lives in this browser (see element-call/audioSettings.js), so every
// call starts with it. A change also reaches the call in progress, if any.
type DeviceSetting = { setValue: (deviceId: string | undefined) => void };
type CallWindow = {
  blazeroomDeviceSettings?: { audioInput: DeviceSetting; audioOutput: DeviceSetting };
  blazeroomVoices?: VoiceStore;
};

const KEYS = [INPUT_DEVICE_KEY, OUTPUT_DEVICE_KEY, INPUT_GAIN_KEY, OUTPUT_VOLUME_KEY];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const get = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string | number | undefined) => {
  try {
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or full storage: the choice lasts only for this call.
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  // Element Call's own settings dialog writes the same keys from the call page.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || KEYS.includes(event.key)) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
};

const snapshot = () => KEYS.map((key) => get(key) ?? '').join('\n');

export const useCallAudio = (): CallAudio => {
  const raw = useSyncExternalStore(subscribe, snapshot);
  return useMemo(() => readCallAudio({ getItem: get }), [raw]); // eslint-disable-line react-hooks/exhaustive-deps
};

const callWindow = (embed: CallEmbed | undefined) =>
  embed?.control.iframe.contentWindow as CallWindow | null | undefined;

const setDevice = (
  kind: 'audioInput' | 'audioOutput',
  deviceId: string | undefined,
  embed?: CallEmbed
) => {
  callWindow(embed)?.blazeroomDeviceSettings?.[kind].setValue(deviceId);
  write(kind === 'audioInput' ? INPUT_DEVICE_KEY : OUTPUT_DEVICE_KEY, deviceId);
  notify();
};

export const setInputDevice = (deviceId: string | undefined, embed?: CallEmbed) =>
  setDevice('audioInput', deviceId, embed);

export const setOutputDevice = (deviceId: string | undefined, embed?: CallEmbed) =>
  setDevice('audioOutput', deviceId, embed);

// The call page's mic chain listens for this key itself (storage event).
export const setInputGain = (gain: number) => {
  write(INPUT_GAIN_KEY, gain);
  notify();
};

export const setOutputVolume = (volume: number, embed?: CallEmbed) => {
  write(OUTPUT_VOLUME_KEY, volume);
  callWindow(embed)?.blazeroomVoices?.reload();
  notify();
};

// Chrome lists "default" and "communications" entries that only point at another device.
const isAlias = (device: MediaDeviceInfo) =>
  device.deviceId === 'default' || device.deviceId === 'communications' || device.deviceId === '';

export type AudioDevices = {
  inputs: MediaDeviceInfo[];
  outputs: MediaDeviceInfo[];
  // Without mic permission browsers hide device names.
  named: boolean;
  askPermission: () => Promise<void>;
};

export const useAudioDevices = (): AudioDevices => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const refresh = useCallback(async () => {
    try {
      setDevices((await navigator.mediaDevices?.enumerateDevices()) ?? []);
    } catch {
      setDevices([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    navigator.mediaDevices?.addEventListener('devicechange', refresh);
    return () => navigator.mediaDevices?.removeEventListener('devicechange', refresh);
  }, [refresh]);

  const askPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      // Refused: the list stays unnamed and the system device keeps being used.
    }
    await refresh();
  }, [refresh]);

  return {
    inputs: devices.filter((d) => d.kind === 'audioinput' && !isAlias(d)),
    outputs: devices.filter((d) => d.kind === 'audiooutput' && !isAlias(d)),
    named: devices.some((d) => d.label !== ''),
    askPermission,
  };
};
