import { useEffect, useState } from 'react';
import { levelFromSamples } from './audioTest';

// Each mic row in the menu shows what that mic hears right now, so people can tell which one
// picks them up before choosing it. Every listed mic is opened while the list is on screen and
// closed with it; nothing is played back or sent anywhere.

export const LEVEL_BARS = 6;

// The key for "System default", which has no device id of its own.
export const SYSTEM_KEY = 'system';

export const litBars = (level: number, bars = LEVEL_BARS): number =>
  Math.max(0, Math.min(bars, Math.round(level * bars)));

type Meter = { key: string; stream: MediaStream; analyser: AnalyserNode; samples: Float32Array };

// Lit bars per device key, updated only when a count changes, so the menu redraws a few times a
// second at most. A mic that won't open (busy, unplugged, refused) just has no entry.
export const useDeviceLevels = (
  deviceIds: (string | undefined)[],
  enabled: boolean
): Map<string, number> => {
  const [lit, setLit] = useState<Map<string, number>>(new Map());
  const idsKey = deviceIds.map((id) => id ?? SYSTEM_KEY).join('\n');

  useEffect(() => {
    if (!enabled || !idsKey) return undefined;
    let closed = false;
    let frame = 0;
    const ctx = new AudioContext();
    const meters: Meter[] = [];
    const shown = new Map<string, number>();

    const open = async (key: string) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: key === SYSTEM_KEY ? undefined : { exact: key },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        if (closed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        meters.push({ key, stream, analyser, samples: new Float32Array(analyser.fftSize) });
      } catch {
        // No level for this one.
      }
    };

    const tick = () => {
      let changed = false;
      meters.forEach((meter) => {
        meter.analyser.getFloatTimeDomainData(meter.samples);
        const bars = litBars(levelFromSamples(meter.samples));
        if (shown.get(meter.key) !== bars) {
          shown.set(meter.key, bars);
          changed = true;
        }
      });
      if (changed) setLit(new Map(shown));
      frame = requestAnimationFrame(tick);
    };

    idsKey.split('\n').forEach((key) => open(key));
    frame = requestAnimationFrame(tick);

    return () => {
      closed = true;
      cancelAnimationFrame(frame);
      meters.forEach((meter) => meter.stream.getTracks().forEach((track) => track.stop()));
      ctx.close().catch(() => undefined);
      setLit(new Map());
    };
  }, [idsKey, enabled]);

  return lit;
};
