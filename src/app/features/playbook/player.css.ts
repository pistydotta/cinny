import { globalStyle, style } from '@vanilla-extract/css';
import { color } from 'folds';

// The controls sit on the video and fade away while it plays and the mouse is still.
export const Player = style({
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 9',
  background: '#000',
  borderRadius: 10,
  overflow: 'hidden',
  userSelect: 'none',
  selectors: {
    '&[data-controls="false"]': { cursor: 'none' },
    '&:fullscreen': { borderRadius: 0, aspectRatio: 'auto' },
  },
});

export const Video = style({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  cursor: 'pointer',
});

export const Loading = style({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#d7dde5',
  fontSize: 14,
});

export const BigPlay = style({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 72,
  height: 72,
  borderRadius: '50%',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingLeft: 4,
  color: '#fff',
  background: 'rgba(0, 0, 0, 0.55)',
  backdropFilter: 'blur(6px)',
  cursor: 'pointer',
  transition: 'transform 120ms ease-out, background 120ms',
  selectors: {
    '&:hover': { transform: 'translate(-50%, -50%) scale(1.06)', background: 'rgba(0, 0, 0, 0.7)' },
    '&:focus-visible': { outline: '2px solid #fff', outlineOffset: 3 },
  },
});

export const Controls = style({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  padding: '28px 12px 8px',
  background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.35) 60%, transparent)',
  color: '#fff',
  transition: 'opacity 200ms ease-out, transform 200ms ease-out',
  selectors: {
    [`${Player}[data-controls="false"] &`]: {
      opacity: 0,
      transform: 'translateY(6px)',
      pointerEvents: 'none',
    },
  },
});

export const Bar = style({
  position: 'relative',
  height: 16,
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  touchAction: 'none',
});

export const Track = style({
  position: 'relative',
  width: '100%',
  height: 4,
  borderRadius: 2,
  background: 'rgba(255, 255, 255, 0.25)',
  overflow: 'hidden',
  transition: 'height 120ms',
  selectors: { [`${Bar}:hover &`]: { height: 6 } },
});

export const Fill = style({
  position: 'absolute',
  inset: 0,
  right: 'auto',
  background: color.Primary.Main,
});

export const Knob = style({
  position: 'absolute',
  top: '50%',
  width: 12,
  height: 12,
  marginLeft: -6,
  marginTop: -6,
  borderRadius: '50%',
  background: '#fff',
  boxShadow: '0 0 0 3px rgba(0, 0, 0, 0.25)',
  transform: 'scale(0)',
  transition: 'transform 120ms',
  selectors: { [`${Bar}:hover &`]: { transform: 'scale(1)' } },
});

export const Row = style({ display: 'flex', alignItems: 'center', gap: 2, marginTop: 2 });
export const Grow = style({ flex: 1 });

export const Ctl = style({
  width: 36,
  height: 36,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  borderRadius: 8,
  background: 'transparent',
  color: '#fff',
  cursor: 'pointer',
  opacity: 0.9,
  selectors: {
    '&:hover': { background: 'rgba(255, 255, 255, 0.14)', opacity: 1 },
    '&:focus-visible': { outline: '2px solid #fff', outlineOffset: -2 },
  },
});

export const Time = style({
  marginLeft: 8,
  fontSize: 13,
  fontVariantNumeric: 'tabular-nums',
  opacity: 0.9,
});

export const Speed = style({
  height: 26,
  minWidth: 46,
  padding: '0 10px',
  marginRight: 4,
  border: '1px solid rgba(255, 255, 255, 0.35)',
  borderRadius: 13,
  background: 'transparent',
  color: '#fff',
  font: 'inherit',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: 'rgba(255, 255, 255, 0.14)' },
    '&[data-slow="true"]': { background: '#fff', color: '#000', borderColor: '#fff' },
    '&:focus-visible': { outline: '2px solid #fff', outlineOffset: 2 },
  },
});

globalStyle(`${Player}:fullscreen ${Video}`, { cursor: 'pointer' });
