import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
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
  border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
  borderRadius: config.radii.R400,
  overflow: 'hidden',
});

export const CompactCards = style({ padding: config.space.S200, minWidth: 0 });

export const CompactCard = style({
  minWidth: 0,
  padding: `${config.space.S100} ${config.space.S100} ${config.space.S100} ${config.space.S200}`,
  backgroundColor: color.SurfaceVariant.Container,
  borderRadius: config.radii.R300,
});

export const LiveName = style({ minWidth: 0, maxWidth: '100%' });

export const LivePreview = style({
  width: '100%',
  aspectRatio: '16 / 9',
  position: 'relative',
  borderRadius: config.radii.R300,
  backgroundColor: color.Background.Container,
  color: color.SurfaceVariant.OnContainer,
});

export const LiveBadge = style({
  position: 'absolute',
  top: config.space.S200,
  right: config.space.S200,
});

export const WatchButton = style({
  minHeight: toRem(44),
  width: '100%',
  flexShrink: 0,
  gap: config.space.S200,
});

export const WatchControls = style({ minWidth: 0, maxWidth: '100%' });

export const WatchRow = style({
  flexWrap: 'wrap',
  justifyContent: 'center',
  rowGap: config.space.S200,
});

export const Controls = style({
  padding: `${config.space.S200} ${config.space.S400} 0`,
});

// The owner's capture controls wrap on phones instead of squeezing the preview and name.
export const Row = style({
  minHeight: toRem(36),
  flexWrap: 'wrap',
  rowGap: config.space.S100,
});

export const Name = style({
  minWidth: 0,
  maxWidth: toRem(100),
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
export const FloatingCall = recipe({
  base: {
    position: 'fixed',
    right: 16,
    bottom: 100,
    borderRadius: 12,
    border: `1px solid ${color.SurfaceVariant.ContainerLine}`,
    background: color.Surface.Container,
    color: color.Surface.OnContainer,
    boxShadow: '0 12px 40px #0008',
    zIndex: 50,
    overflow: 'hidden',
  },
  variants: {
    watching: {
      true: { width: 'min(400px, calc(100vw - 32px))' },
      false: { width: 'min(200px, calc(100vw - 32px))' },
    },
  },
});
// A bar of its own above the stage: the call iframe sits on top of the box, so anything
// drawn over the stage would be hidden under it. The bar is also the drag handle.
export const FloatingHeader = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 2,
    background: color.SurfaceVariant.Container,
    borderBottom: `1px solid ${color.SurfaceVariant.ContainerLine}`,
    cursor: 'grab',
    touchAction: 'none',
    userSelect: 'none',
  },
  variants: {
    dragging: { true: { cursor: 'grabbing' }, false: {} },
  },
});
export const FloatingGrip = style({ opacity: 0.6, pointerEvents: 'none' });
export const FloatingStage = recipe({
  base: { width: '100%' },
  variants: {
    watching: { true: { aspectRatio: '16 / 9' }, false: { height: toRem(140) } },
  },
});
export const FloatingControls = style({
  maxHeight: 'min(220px, 30vh)',
  overflowY: 'auto',
});
globalStyle(`${FloatingControls} > ${WatchControls}`, { padding: config.space.S200 });
export const OwnerVolume = style({ display: 'flex', flexDirection: 'column', gap: 4 });
