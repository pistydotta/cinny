// The person's call audio setup on this device: which mic and speaker, how loud the mic goes
// out and how loud the call plays. Devices differ from one machine to the next, so it stays in
// this browser's storage, which the call page shares (same origin). Both device keys are
// Element Call's own settings, so every call it opens starts with them and its settings dialog
// stays in step with ours.
export const INPUT_DEVICE_KEY = 'matrix-setting-audio-input';
export const OUTPUT_DEVICE_KEY = 'matrix-setting-audio-output';
export const INPUT_GAIN_KEY = 'blazeroom.callInputGain';
export const OUTPUT_VOLUME_KEY = 'blazeroom.callOutputVolume';

// The mic can be boosted (it goes through Web Audio); playback can't go past 1, since Element
// Call plays through audio elements (see voiceVolume.js).
export const MAX_INPUT_GAIN = 2;
export const MAX_OUTPUT_VOLUME = 1;

const parse = (storage, key) => {
  try {
    const raw = storage?.getItem(key);
    return raw == null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const readLevel = (storage, key, max) => {
  const value = parse(storage, key);
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  return Math.min(max, Math.max(0, value));
};

// Chrome's "default" entry follows the system's choice, the same as choosing nothing.
const readDevice = (storage, key) => {
  const value = parse(storage, key);
  return typeof value === 'string' && value !== '' && value !== 'default' ? value : undefined;
};

export const readInputGain = (storage) => readLevel(storage, INPUT_GAIN_KEY, MAX_INPUT_GAIN);
export const readOutputVolume = (storage) =>
  readLevel(storage, OUTPUT_VOLUME_KEY, MAX_OUTPUT_VOLUME);

export const readCallAudio = (storage) => ({
  inputDevice: readDevice(storage, INPUT_DEVICE_KEY),
  outputDevice: readDevice(storage, OUTPUT_DEVICE_KEY),
  inputGain: readInputGain(storage),
  outputVolume: readOutputVolume(storage),
});
