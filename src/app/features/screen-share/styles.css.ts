import { globalStyle, keyframes, style } from '@vanilla-extract/css';
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
// The room card's own palette: gunmetal steel, with a darker band for the room. Fixed
// rather than themed, so the card reads as the same object in every theme.
const STEEL = {
  card: '#262B31',
  band: '#1D2126',
  line: '#38404A',
  plate: '#2F363E',
  plateLine: '#434C57',
  text: '#ECEFF2',
  muted: '#98A2AD',
};

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
      false: {
        width: 'min(300px, calc(100vw - 32px))',
        borderRadius: 14,
        borderColor: STEEL.line,
        background: STEEL.card,
        color: STEEL.text,
      },
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
    // Nothing to show while no share is watched; the iframe stays mounted, just out of sight.
    watching: { true: { aspectRatio: '16 / 9' }, false: { height: 0 } },
  },
});
export const FloatingControls = style({
  maxHeight: 'min(220px, 30vh)',
  overflowY: 'auto',
});
globalStyle(`${FloatingControls} > ${WatchControls}`, { padding: config.space.S200 });
export const OwnerVolume = style({ display: 'flex', flexDirection: 'column', gap: 4 });

// The floating box while nothing is watched: a small room card instead of an empty stage.
// The whole card is the drag handle.
export const RoomPill = style({
  display: 'flex',
  flexDirection: 'column',
  cursor: 'grab',
  touchAction: 'none',
  userSelect: 'none',
});
// The room sits on a band of its own, so the title is anchored rather than floating.
export const RoomCardHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: toRem(10),
  padding: `${toRem(10)} ${toRem(8)} ${toRem(10)} ${toRem(10)}`,
  background: STEEL.band,
  borderBottom: `1px solid ${STEEL.line}`,
});
globalStyle(`${RoomCardHeader} button`, { color: STEEL.muted });
export const RoomCardPlate = style({
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  width: toRem(34),
  height: toRem(34),
  borderRadius: toRem(8),
  background: STEEL.plate,
  border: `1px solid ${STEEL.plateLine}`,
});
export const RoomCardTitle = style({
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  minWidth: 0,
  lineHeight: 1.25,
});
export const RoomCardName = style({ fontWeight: 600, color: STEEL.text });
export const RoomCardSpace = style({ color: STEEL.muted });
export const RoomCardPeople = style({
  display: 'flex',
  alignItems: 'center',
  gap: toRem(8),
  padding: `${toRem(10)} ${toRem(10)} ${toRem(11)} ${toRem(12)}`,
});
export const RoomCardStatus = style({ flexGrow: 1, minWidth: 0, color: STEEL.muted });

// Green means someone is talking, here and in the faces' rings, so at rest the speaker is grey.
export const Speaker = recipe({
  base: { flexShrink: 0, transition: 'color 200ms' },
  variants: {
    talking: {
      true: { color: color.Success.Main },
      false: { color: color.Surface.OnContainer, opacity: 0.7 },
    },
  },
});
const ripple = keyframes({
  '0%, 100%': { opacity: 0.15 },
  '35%': { opacity: 1 },
});
export const SpeakerWave = recipe({
  base: { transition: 'opacity 200ms' },
  variants: {
    talking: {
      true: {
        animation: `${ripple} 1.1s ease-in-out infinite`,
        '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
      },
      false: {},
    },
  },
});

// Overlapping faces, each still mostly visible.
export const Faces = style({ display: 'flex', alignItems: 'center', flexShrink: 0 });
export const Face = recipe({
  base: {
    boxShadow: `0 0 0 2px ${STEEL.card}`,
    transition: 'box-shadow 120ms, transform 120ms',
    selectors: { '& + &': { marginLeft: toRem(-8) } },
  },
  variants: {
    speaking: {
      true: {
        boxShadow: `0 0 0 2px ${STEEL.card}, 0 0 0 4px ${color.Success.Main}`,
        transform: 'translateY(-2px)',
        zIndex: 1,
      },
      false: {},
    },
    small: {
      true: { selectors: { '& + &': { marginLeft: toRem(-6) } } },
      false: {},
    },
  },
});
export const FaceMore = style({
  display: 'grid',
  placeItems: 'center',
  width: toRem(32),
  height: toRem(32),
  marginLeft: toRem(-8),
  borderRadius: '50%',
  fontSize: toRem(11),
  fontWeight: 600,
  background: STEEL.plate,
  color: STEEL.text,
  boxShadow: `0 0 0 2px ${STEEL.card}`,
});
export const GoToRoom = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: toRem(4),
  flexShrink: 0,
  padding: `${toRem(5)} ${toRem(10)} ${toRem(5)} ${toRem(12)}`,
  border: 'none',
  borderRadius: config.radii.Pill,
  background: color.Primary.Container,
  color: color.Primary.OnContainer,
  fontSize: toRem(12),
  fontWeight: 600,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: color.Primary.ContainerHover },
    '&:focus-visible': { outline: `2px solid ${color.Primary.Main}`, outlineOffset: 2 },
  },
});
