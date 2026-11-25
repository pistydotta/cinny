import { useCallback, useEffect, useRef, useState } from 'react';

// Tests run apart from the call, on their own Web Audio graph: the mic test plays you back
// through the chosen output (so the boost and the speaker can be heard together) and drives a
// level meter; the sound test plays a short chime there.

type SinkContext = AudioContext & { setSinkId?: (sinkId: string) => Promise<void> };

const newContext = async (outputDevice: string | undefined): Promise<SinkContext> => {
  const ctx: SinkContext = new AudioContext();
  // Chrome 110+. Elsewhere the test plays on the system's device, as calls do.
  if (outputDevice && ctx.setSinkId) {
    await ctx.setSinkId(outputDevice).catch(() => undefined);
  }
  return ctx;
};

const SILENT_DB = -60;
const LOUD_DB = -6;

// A meter reading from one frame of samples: 0 is silence, 1 is loud speech.
export const levelFromSamples = (samples: ArrayLike<number>): number => {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
  const rms = Math.sqrt(sum / samples.length);
  if (rms === 0) return 0;
  const db = 20 * Math.log10(rms);
  return Math.min(1, Math.max(0, (db - SILENT_DB) / (LOUD_DB - SILENT_DB)));
};

type Monitor = {
  ctx: SinkContext;
  stream: MediaStream;
  gain: GainNode;
  playback: GainNode;
  frame: number;
};

export type MicTest = {
  testing: boolean;
  level: number;
  failed: boolean;
  toggle: () => void;
};

type MicTestOptions = {
  inputDevice: string | undefined;
  outputDevice: string | undefined;
  inputGain: number;
  outputVolume: number;
  // The browser names devices once the mic is allowed.
  onAllowed?: () => void;
};

export const useMicTest = ({
  inputDevice,
  outputDevice,
  inputGain,
  outputVolume,
  onAllowed,
}: MicTestOptions): MicTest => {
  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(0);
  const [failed, setFailed] = useState(false);
  const monitor = useRef<Monitor>();
  const run = useRef(0);

  const stop = useCallback(() => {
    run.current += 1;
    const { current } = monitor;
    monitor.current = undefined;
    if (current) {
      cancelAnimationFrame(current.frame);
      current.stream.getTracks().forEach((track) => track.stop());
      current.ctx.close().catch(() => undefined);
    }
    setTesting(false);
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    run.current += 1;
    const mine = run.current;
    setFailed(false);
    setTesting(true);
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: inputDevice ? { exact: inputDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });
      const ctx = await newContext(outputDevice);
      if (mine !== run.current) {
        stream.getTracks().forEach((track) => track.stop());
        ctx.close().catch(() => undefined);
        return;
      }
      onAllowed?.();
      const source = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain();
      const playback = ctx.createGain();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      gain.gain.value = inputGain;
      playback.gain.value = outputVolume;
      source.connect(gain);
      gain.connect(analyser);
      gain.connect(playback);
      playback.connect(ctx.destination);
      const samples = new Float32Array(analyser.fftSize);
      const current: Monitor = { ctx, stream, gain, playback, frame: 0 };
      const tick = () => {
        analyser.getFloatTimeDomainData(samples);
        setLevel(levelFromSamples(samples));
        current.frame = requestAnimationFrame(tick);
      };
      tick();
      monitor.current = current;
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      if (mine !== run.current) return;
      setFailed(true);
      setTesting(false);
    }
  }, [inputDevice, outputDevice, inputGain, outputVolume, onAllowed]);

  // Sliders apply while you listen.
  useEffect(() => {
    if (monitor.current) monitor.current.gain.gain.value = inputGain;
  }, [inputGain]);
  useEffect(() => {
    if (monitor.current) monitor.current.playback.gain.value = outputVolume;
  }, [outputVolume]);

  // Another device: start over on it, if a test is running.
  const restartKey = `${inputDevice ?? ''}\n${outputDevice ?? ''}`;
  const lastKey = useRef(restartKey);
  useEffect(() => {
    if (lastKey.current === restartKey) return;
    lastKey.current = restartKey;
    if (!monitor.current) return;
    stop();
    start();
  }, [restartKey, start, stop]);

  useEffect(() => stop, [stop]);

  const toggle = useCallback(() => {
    if (testing) stop();
    else start();
  }, [testing, start, stop]);

  return { testing, level, failed, toggle };
};

const CHIME = [
  { frequency: 660, at: 0 },
  { frequency: 880, at: 0.18 },
];
const NOTE_LENGTH = 0.5;

export const useSoundTest = (outputDevice: string | undefined, outputVolume: number) => {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<SinkContext>();

  useEffect(
    () => () => {
      ctxRef.current?.close().catch(() => undefined);
    },
    []
  );

  const play = useCallback(async () => {
    ctxRef.current?.close().catch(() => undefined);
    setPlaying(true);
    try {
      const ctx = await newContext(outputDevice);
      ctxRef.current = ctx;
      const now = ctx.currentTime + 0.05;
      CHIME.forEach(({ frequency, at }) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequency;
        env.gain.setValueAtTime(0, now + at);
        env.gain.linearRampToValueAtTime(0.3 * outputVolume, now + at + 0.02);
        env.gain.exponentialRampToValueAtTime(0.0001, now + at + NOTE_LENGTH);
        osc.connect(env);
        env.connect(ctx.destination);
        osc.start(now + at);
        osc.stop(now + at + NOTE_LENGTH);
      });
      const last = CHIME[CHIME.length - 1];
      window.setTimeout(() => {
        if (ctxRef.current !== ctx) return;
        ctxRef.current = undefined;
        ctx.close().catch(() => undefined);
        setPlaying(false);
      }, (last.at + NOTE_LENGTH + 0.1) * 1000);
    } catch {
      setPlaying(false);
    }
  }, [outputDevice, outputVolume]);

  return { playing, play };
};
