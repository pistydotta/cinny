import { RefObject, useEffect, useRef, useState } from 'react';
import { audioContext } from '../horde/audio/context';
import type { FootballAudio } from './audio';
import { KeySets } from './controls';
import { Kit } from './engine/teams';
import { GameEvent, MatchState } from './engine/types';
import { Graphics } from './options';
import type { FootballRunner, Hud, RunnerOptions } from './runner';
import type { MatchSource } from './source';

// A match on a canvas: loads three.js, the scene, the runner and the sound when it starts (they
// stay out of the main bundle), and tears them down when the source changes or the screen goes.
// Keys, graphics and the call volume reach the running match as they change.

// Why a match couldn't start: the device can't draw it, or this tab runs an older build than
// the server has (a deploy renamed the files it would load) and only a reload fixes it.
export type MatchFailure = 'device' | 'update';

export type MatchCanvas = {
  canvasRef: RefObject<HTMLCanvasElement>;
  runnerRef: RefObject<FootballRunner | undefined>;
  hud: Hud | undefined;
  loading: boolean;
  failed: MatchFailure | undefined;
  ended: MatchState | undefined;
};

export const useMatchCanvas = ({
  source,
  kits,
  devices,
  mine,
  labels,
  keys,
  graphics,
  inCall,
  freeze,
  onEvents,
}: {
  source: MatchSource | undefined;
  kits: [Kit, Kit];
  devices: RunnerOptions['devices'];
  mine: number[];
  // A name over each person's player (slot order), when there is more than one person.
  labels?: string[];
  keys: KeySets;
  graphics: Graphics;
  inCall: boolean;
  freeze?: boolean;
  onEvents?: (events: GameEvent[]) => void;
}): MatchCanvas => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runnerRef = useRef<FootballRunner>();
  const audioRef = useRef<FootballAudio>();
  const [hud, setHud] = useState<Hud>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<MatchFailure>();
  const [ended, setEnded] = useState<MatchState>();
  // Read when the match starts; later changes go to the runner below.
  const latest = useRef({ keys, graphics, inCall, kits, devices, mine, labels, freeze, onEvents });
  latest.current = { keys, graphics, inCall, kits, devices, mine, labels, freeze, onEvents };

  useEffect(() => {
    runnerRef.current?.setKeys(keys);
  }, [keys]);

  useEffect(() => {
    runnerRef.current?.setGraphics(graphics);
  }, [graphics]);

  useEffect(() => {
    audioRef.current?.setVolume(inCall ? 0.2 : 1);
  }, [inCall]);

  useEffect(() => {
    if (!source) return undefined;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    setLoading(true);
    setEnded(undefined);
    setHud(undefined);
    const opts = latest.current;
    Promise.all([import('./render/scene'), import('./runner'), import('./audio')])
      .catch((err) => {
        if (!cancelled) setFailed('update');
        throw err;
      })
      .then(async ([{ FootballScene }, { FootballRunner }, { FootballAudio }]) => {
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        const scene = new FootballScene(canvas, opts.kits, opts.graphics, {
          mine: opts.mine,
          labels: opts.labels,
        });
        const fit = () => scene.resize(canvas.clientWidth, canvas.clientHeight);
        fit();
        const observer = new ResizeObserver(fit);
        observer.observe(canvas);
        await scene.load(source.match);
        if (cancelled) {
          observer.disconnect();
          scene.dispose();
          return;
        }
        const ctx = audioContext();
        let audio: FootballAudio | undefined;
        try {
          audio = ctx && new FootballAudio(ctx, latest.current.inCall ? 0.2 : 1);
        } catch {
          audio = undefined;
        }
        audioRef.current = audio;
        const runner = new FootballRunner(source, scene, {
          devices: opts.devices,
          mine: opts.mine,
          onHud: setHud,
          onEvents: (events) => {
            audio?.play(events);
            latest.current.onEvents?.(events);
          },
          onEnd: (m) => setEnded(m),
          keys: latest.current.keys,
          graphics: latest.current.graphics,
          freeze: opts.freeze,
        });
        runnerRef.current = runner;
        setLoading(false);
        cleanup = () => {
          runner.stop();
          runnerRef.current = undefined;
          observer.disconnect();
          scene.dispose();
          audio?.dispose();
          audioRef.current = undefined;
        };
      })
      .catch(() => {
        if (!cancelled) setFailed((f) => f ?? 'device');
      });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [source]);

  return { canvasRef, runnerRef, hud, loading, failed, ended };
};
