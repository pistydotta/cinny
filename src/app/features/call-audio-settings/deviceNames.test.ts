import { describe, expect, it } from 'vitest';
import { deviceName, deviceNames, shownDevices } from './deviceNames';

describe('deviceName', () => {
  it.each([
    ['Microphone (2- fifine Microphone)', 'fifine Microphone'],
    ['Microphone (Realtek USB Audio)', 'Realtek USB Audio'],
    ['Virtual Mic (Virtual Mic for AudioRelay)', 'Virtual Mic for AudioRelay'],
    ['Speakers (Realtek(R) Audio)', 'Realtek(R) Audio'],
    ['HD Webcam C270 (046d:0825)', 'HD Webcam C270'],
    ['MacBook Pro Microphone', 'MacBook Pro Microphone'],
  ])('%s → %s', (label, name) => {
    expect(deviceName(label)).toBe(name);
  });
});

describe('deviceNames', () => {
  it('keeps the full label when two names would match', () => {
    expect(
      deviceNames(['Microphone (USB Audio)', 'Line In (USB Audio)', 'Microphone (Webcam)'])
    ).toEqual(['Microphone (USB Audio)', 'Line In (USB Audio)', 'Webcam']);
  });
});

describe('shownDevices', () => {
  const list = (n: number) => Array.from({ length: n }, (_, i) => i);

  it('shows a short list whole', () => {
    expect(shownDevices(list(5), () => false)).toEqual(list(5));
  });

  it('cuts a long list to the first few', () => {
    expect(shownDevices(list(7), (d) => d === 1)).toEqual([0, 1, 2, 3]);
  });

  it('keeps the chosen device in view', () => {
    expect(shownDevices(list(7), (d) => d === 6)).toEqual([0, 1, 2, 6]);
  });
});
