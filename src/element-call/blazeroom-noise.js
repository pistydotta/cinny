// Loaded by Element Call's index.html before its own script (see vite.config.js): sends the
// call mic through RNNoise when that setting is on, and always through the person's input
// volume. The files it imports are copied next to it at build time.
import { loadRnnoise, RnnoiseWorkletNode } from './noise-suppressor.js';
import { disguiseTrack, noiseSuppressionEnabled, wrapGetUserMedia } from './micFilter.js';
import { INPUT_GAIN_KEY, readInputGain } from './audioSettings.js';

const base = new URL('./', import.meta.url);
let wasmBinary;

const denoiser = async (context) => {
  wasmBinary ??= await loadRnnoise({
    url: new URL('rnnoise.wasm', base).href,
    simdUrl: new URL('rnnoise_simd.wasm', base).href,
  });
  await context.audioWorklet.addModule(new URL('rnnoiseWorklet.js', base).href);
  return new RnnoiseWorkletNode(context, { maxChannels: 1, wasmBinary });
};

const process = async (mic) => {
  // RNNoise works on 48 kHz audio.
  const context = new AudioContext({ sampleRate: 48000 });
  let rnnoise;
  let onStorage;
  try {
    let node = context.createMediaStreamSource(new MediaStream([mic]));
    if (window.AudioWorkletNode && noiseSuppressionEnabled(localStorage)) {
      try {
        rnnoise = await denoiser(context);
        node = node.connect(rnnoise);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[blazeroom] Noise suppression unavailable', e);
      }
    }

    // The app around the call saves the volume in this same storage, and the storage event
    // reaches this page because the change comes from another page.
    const gain = context.createGain();
    gain.gain.value = readInputGain(localStorage);
    onStorage = (event) => {
      if (event.key === INPUT_GAIN_KEY) gain.gain.value = readInputGain(localStorage);
    };
    window.addEventListener('storage', onStorage);

    const destination = context.createMediaStreamDestination();
    node.connect(gain).connect(destination);
    await context.resume();

    const [output] = destination.stream.getAudioTracks();
    return disguiseTrack(output, mic, () => {
      window.removeEventListener('storage', onStorage);
      rnnoise?.destroy();
      context.close();
    });
  } catch (e) {
    if (onStorage) window.removeEventListener('storage', onStorage);
    rnnoise?.destroy();
    context.close();
    throw e;
  }
};

// Always on, so the input volume can change mid-call; a failure falls back to the raw mic.
if (navigator.mediaDevices?.getUserMedia && window.AudioContext) {
  wrapGetUserMedia(navigator.mediaDevices, process, () => true);
}
