import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon, Icons } from 'folds';
import { tr } from '../translation/tr';
import * as css from './player.css';

const SPEEDS = [1, 0.5, 0.25];
const FRAME = 1 / 30;
const IDLE_MS = 2000;

const clock = (s: number) => {
  const t = Number.isFinite(s) ? Math.max(0, s) : 0;
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
};

function FrameIcon({ back }: { back?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden
      style={back ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path d="M6 5l9 7-9 7V5z" fill="currentColor" />
      <rect x="16.5" y="5" width="2.5" height="14" rx="1" fill="currentColor" />
    </svg>
  );
}

function FullscreenIcon({ on }: { on: boolean }) {
  const d = on
    ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5'
    : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5';
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type VideoPlayerProps = { src?: string; poster?: string };

// The setup's video with its controls on it: muted and looping from the start (nobody presses
// play mid-round), a scrub bar, frame steps and slow motion for the exact moment of a throw.
// Keys: Space plays or pauses, , and . step a frame, ← → jump 2 s, F goes fullscreen.
export function VideoPlayer({ src, poster }: VideoPlayerProps) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [awake, setAwake] = useState(true);
  const [full, setFull] = useState(false);
  const idle = useRef<number>();

  const wake = useCallback(() => {
    setAwake(true);
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => setAwake(false), IDLE_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(idle.current), []);

  useEffect(() => {
    if (video.current) video.current.playbackRate = speed;
  }, [speed, src]);

  useEffect(() => {
    const onFull = () => setFull(document.fullscreenElement === box.current);
    document.addEventListener('fullscreenchange', onFull);
    return () => document.removeEventListener('fullscreenchange', onFull);
  }, []);

  const togglePlay = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
  };
  const seek = (t: number) => {
    const v = video.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, t));
    setTime(v.currentTime);
  };
  const step = (dir: number) => {
    video.current?.pause();
    seek((video.current?.currentTime ?? 0) + dir * FRAME);
  };
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else box.current?.requestFullscreen().catch(() => undefined);
  };
  const nextSpeed = () => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName)) return;
      const v = video.current;
      if (!v) return;
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === ',' || e.key === '.') step(e.key === '.' ? 1 : -1);
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft')
        seek(v.currentTime + (e.key === 'ArrowRight' ? 2 : -2));
      else if (e.key === 'f' || e.key === 'F') toggleFull();
      else return;
      wake();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Click or drag anywhere on the bar.
  const scrub = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = bar.current?.getBoundingClientRect();
    if (!r || !duration) return;
    seek(((e.clientX - r.left) / r.width) * duration);
  };

  const shown = awake || paused;
  const progress = duration ? (time / duration) * 100 : 0;

  return (
    <div
      ref={box}
      className={css.Player}
      data-controls={shown}
      onPointerMove={wake}
      onPointerLeave={() => setAwake(false)}
    >
      {src ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={video}
          className={css.Video}
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          onClick={togglePlay}
          onDoubleClick={toggleFull}
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        />
      ) : (
        <div className={css.Loading}>{tr('playbook.loading', 'Loading…')}</div>
      )}

      {src && paused && (
        <button
          type="button"
          className={css.BigPlay}
          onClick={togglePlay}
          aria-label={tr('playbook.play', 'Play')}
        >
          <Icon size="600" src={Icons.Play} />
        </button>
      )}

      {src && (
        <div className={css.Controls}>
          <div
            ref={bar}
            className={css.Bar}
            role="slider"
            tabIndex={-1}
            aria-label={tr('playbook.position', 'Position')}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(time)}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              scrub(e);
            }}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) scrub(e);
            }}
          >
            <div className={css.Track}>
              <div className={css.Fill} style={{ width: `${progress}%` }} />
            </div>
            <div className={css.Knob} style={{ left: `${progress}%` }} />
          </div>
          <div className={css.Row}>
            <button
              type="button"
              className={css.Ctl}
              onClick={togglePlay}
              aria-label={paused ? tr('playbook.play', 'Play') : tr('playbook.pause', 'Pause')}
            >
              <Icon size="300" src={paused ? Icons.Play : Icons.Pause} />
            </button>
            <button
              type="button"
              className={css.Ctl}
              onClick={() => step(-1)}
              aria-label={tr('playbook.frame_back', 'Previous frame')}
              title={tr('playbook.frame_back_key', 'Previous frame ( , )')}
            >
              <FrameIcon back />
            </button>
            <button
              type="button"
              className={css.Ctl}
              onClick={() => step(1)}
              aria-label={tr('playbook.frame_forward', 'Next frame')}
              title={tr('playbook.frame_forward_key', 'Next frame ( . )')}
            >
              <FrameIcon />
            </button>
            <span className={css.Time}>
              {clock(time)} / {clock(duration)}
            </span>
            <span className={css.Grow} />
            <button
              type="button"
              className={css.Speed}
              data-slow={speed !== 1}
              onClick={nextSpeed}
              aria-label={tr('playbook.speed', 'Speed')}
              title={tr('playbook.speed', 'Speed')}
            >
              {speed}x
            </button>
            <button
              type="button"
              className={css.Ctl}
              onClick={toggleFull}
              aria-label={tr('playbook.fullscreen', 'Fullscreen')}
              title={tr('playbook.fullscreen_key', 'Fullscreen ( F )')}
            >
              <FullscreenIcon on={full} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
