import { globalStyle, style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const Cards = style({
  padding: config.space.S300,
  width: toRem(280),
  flexShrink: 0,
  overflowY: 'auto',
  '@media': { 'screen and (max-width: 700px)': { width: '100%', maxHeight: toRem(240) } },
});

export const Card = style({
  padding: config.space.S300,
  backgroundColor: color.SurfaceVariant.Container,
  border: `${config.borderWidth.B300} solid ${color.Primary.Main}`,
  borderLeftWidth: toRem(4),
  borderRadius: config.radii.R400,
  flexWrap: 'wrap',
  rowGap: config.space.S300,
  minHeight: toRem(180),
  justifyContent: 'center',
  backgroundImage: 'radial-gradient(ellipse at top, rgba(153, 121, 255, 0.22), transparent)',
});

export const LiveName = style({ minWidth: 0, maxWidth: '100%' });

export const WatchButton = style({
  minHeight: toRem(44),
  flexShrink: 0,
  gap: config.space.S200,
  backgroundColor: '#f5c84b',
  color: '#211900',
  border: '2px solid #f5c84b',
  boxShadow: '0 0 0 3px rgba(245, 200, 75, 0.18)',
  selectors: {
    '&:hover': { backgroundColor: '#ffdc79', color: '#211900' },
    '&:active': { backgroundColor: '#e7b72f', color: '#211900' },
    '&:focus-visible': { outline: '3px solid currentColor', outlineOffset: 4 },
  },
  '@media': { 'screen and (max-width: 480px)': { width: '100%' } },
});

export const Controls = style({
  padding: `${config.space.S200} ${config.space.S400} 0`,
});

// On a phone the name, mute, slider and Stop watching don't fit on one line: the controls wrap
// under the name instead of squeezing it to nothing.
export const Row = style({
  minHeight: toRem(36),
  flexWrap: 'wrap',
  rowGap: config.space.S100,
});

export const Name = style({
  minWidth: toRem(120),
});

export const Slider = style({
  appearance: 'none',
  width: toRem(120),
  height: toRem(4),
  flexShrink: 0,
  borderRadius: config.radii.Pill,
  backgroundColor: color.SurfaceVariant.ContainerLine,
  cursor: 'pointer',
});

const thumb = {
  appearance: 'none',
  width: toRem(14),
  height: toRem(14),
  borderRadius: '50%',
  border: 'none',
  backgroundColor: color.Primary.Main,
} as const;

globalStyle(`${Slider}::-webkit-slider-thumb`, thumb);
globalStyle(`${Slider}::-moz-range-thumb`, thumb);

export const Preview = style({
  width: toRem(72),
  height: toRem(40),
  flexShrink: 0,
  objectFit: 'contain',
  borderRadius: config.radii.R300,
  backgroundColor: color.Background.Container,
});
export const FloatingCall = style({
  position: 'fixed',
  right: 16,
  bottom: 100,
  width: 'min(360px, calc(100vw - 32px))',
  borderRadius: 12,
  border: `1px solid ${color.SurfaceVariant.ContainerLine}`,
  background: color.Surface.Container,
  color: color.Surface.OnContainer,
  boxShadow: '0 12px 40px #0008',
  zIndex: 50,
  overflow: 'hidden',
});
export const FloatingHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  padding: 8,
  gap: 8,
});
export const FloatingStage = style({ width: '100%', aspectRatio: '16 / 9' });
export const FloatingControls = style({ maxHeight: 'min(220px, 30vh)', overflowY: 'auto' });
export const OwnerVolume = style({ display: 'flex', flexDirection: 'column', gap: 4 });
