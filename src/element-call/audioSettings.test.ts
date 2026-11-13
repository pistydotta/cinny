import { describe, expect, it } from 'vitest';
import {
  INPUT_DEVICE_KEY,
  INPUT_GAIN_KEY,
  OUTPUT_DEVICE_KEY,
  OUTPUT_VOLUME_KEY,
  readCallAudio,
} from './audioSettings';

const storage = (values: Record<string, string>) => ({
  getItem: (key: string) => values[key] ?? null,
});

describe('call audio settings', () => {
  it('defaults to the system devices at full volume', () => {
    expect(readCallAudio(storage({}))).toEqual({
      inputDevice: undefined,
      outputDevice: undefined,
      inputGain: 1,
      outputVolume: 1,
    });
  });

  it("reads Element Call's device settings, treating Chrome's default entry as none", () => {
    const audio = readCallAudio(
      storage({ [INPUT_DEVICE_KEY]: '"mic-2"', [OUTPUT_DEVICE_KEY]: '"default"' })
    );
    expect(audio.inputDevice).toBe('mic-2');
    expect(audio.outputDevice).toBeUndefined();
  });

  it('keeps levels in range and survives broken values', () => {
    expect(
      readCallAudio(storage({ [INPUT_GAIN_KEY]: '5', [OUTPUT_VOLUME_KEY]: '3' }))
    ).toMatchObject({
      inputGain: 2,
      outputVolume: 1,
    });
    expect(readCallAudio(storage({ [INPUT_GAIN_KEY]: '-1' })).inputGain).toBe(0);
    expect(
      readCallAudio(storage({ [INPUT_GAIN_KEY]: 'x', [INPUT_DEVICE_KEY]: 'undefined' }))
    ).toMatchObject({
      inputGain: 1,
      inputDevice: undefined,
    });
  });
});
