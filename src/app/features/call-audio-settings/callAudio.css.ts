import { keyframes, style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';
import { forgeColor } from '../forge-theme/forgeColor.css';
import { forgeRadius, forgeTint } from '../forge-theme/tokens';

// Forge's bright accent: the wine primary is too deep to read as a fill on the dark card.
const ember = forgeColor.Ember.Main;
const ink = color.Surface.OnContainer;

const line = (strength: number) => forgeTint(ink, strength);

// Rows, boxes and the card share these softer corners: the menu floats, so it isn't held to
// Forge's square-shouldered controls.
const rowRadius = toRem(10);

// A step above the surface it opens over, with the menu shadow, so it floats instead of
// blending into the call.
export const Menu = style({
  selectors: {
    '&&': {
      width: toRem(292),
      maxWidth: '90vw',
      padding: toRem(6),
      display: 'grid',
      gap: toRem(6),
      background: color.SurfaceVariant.Container,
      border: `1px solid ${line(7)}`,
      borderRadius: toRem(14),
      boxShadow: config.shadow.E200,
    },
  },
});

export const Panel = style({
  display: 'grid',
  gap: config.space.S400,
});

export const Group = style({
  display: 'grid',
  gap: config.space.S200,
});

// The device list, then the box of controls.
export const Stack = style({
  display: 'grid',
  gap: toRem(6),
});

export const Section = style({
  display: 'grid',
  gap: config.space.S100,
});

export const Row = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  width: '100%',
  minHeight: toRem(32),
  padding: `${config.space.S100} ${config.space.S300}`,
  border: 'none',
  borderRadius: rowRadius,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  ':hover': { background: line(5) },
  ':focus-visible': { outline: `2px solid ${ember}`, outlineOffset: -2 },
  ':disabled': { cursor: 'default', opacity: 0.6 },
});

export const RowText = style({
  display: 'grid',
  minWidth: 0,
  flex: 1,
});

// minmax(0, 1fr): without it a long name widens the column past the menu instead of truncating.
export const Options = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: 1,
});

// One device: its icon, its name and, for mics, what it hears now. The chosen one is cut into
// the page's darkest colour with an ember edge.
export const Device = style({
  display: 'flex',
  alignItems: 'center',
  gap: toRem(10),
  width: '100%',
  minWidth: 0,
  minHeight: toRem(34),
  padding: `0 ${toRem(10)}`,
  border: `1px solid transparent`,
  borderRadius: rowRadius,
  background: 'transparent',
  color: forgeColor.Text.Secondary,
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  ':hover': { background: line(4), color: ink },
  ':focus-visible': { outline: `2px solid ${ember}`, outlineOffset: -2 },
  selectors: {
    '&[aria-checked=true]': {
      background: color.Background.Container,
      borderColor: forgeTint(ember, 40),
      color: ink,
      fontWeight: 500,
    },
  },
});

// One lap of the ticker at a steady speed: the copy ends where the name started.
const tickerLap = keyframes({
  from: { transform: 'translateX(0)' },
  to: { transform: 'translateX(var(--shift, 0))' },
});

export const SlidingName = style({
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  selectors: {
    [`${Device}:is(:hover, :focus-visible) &[data-overflows=true]`]: { textOverflow: 'clip' },
  },
});

export const SlidingNameInner = style({
  selectors: {
    [`${Device}:is(:hover, :focus-visible) ${SlidingName}[data-overflows=true] &`]: {
      display: 'inline-block',
      animation: `${tickerLap} var(--slide-duration, 6s) linear 0.3s infinite`,
    },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      selectors: {
        [`${Device}:is(:hover, :focus-visible) ${SlidingName}[data-overflows=true] &`]: {
          animation: 'none',
        },
      },
    },
  },
});

// The copy that follows the name round the loop, only while it scrolls.
export const SlidingNameCopy = style({
  display: 'none',
  paddingLeft: 'var(--ticker-gap, 32px)',
  selectors: {
    [`${Device}:is(:hover, :focus-visible) ${SlidingName}[data-overflows=true] ${SlidingNameInner} &`]:
      { display: 'inline' },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      selectors: {
        [`${Device}:is(:hover, :focus-visible) ${SlidingName}[data-overflows=true] ${SlidingNameInner} &`]:
          { display: 'none' },
      },
    },
  },
});

export const DeviceIcon = style({
  flex: 'none',
  opacity: 0.45,
  selectors: {
    [`${Device}[aria-checked=true] &`]: { color: ember, opacity: 1 },
  },
});

export const Bars = style({
  display: 'flex',
  alignItems: 'flex-end',
  gap: 1.5,
  flex: 'none',
  width: toRem(36),
  height: toRem(10),
});

// Rising bars, green as they light: the same green as people talking in the call.
export const Bar = style({
  flex: 1,
  borderRadius: 1,
  background: line(16),
  transition: 'background 80ms linear',
  selectors: {
    '&:nth-child(1)': { height: '30%' },
    '&:nth-child(2)': { height: '42%' },
    '&:nth-child(3)': { height: '54%' },
    '&:nth-child(4)': { height: '66%' },
    '&:nth-child(5)': { height: '83%' },
    '&:nth-child(6)': { height: '100%' },
    '&[data-lit=true]': { background: color.Success.Main },
  },
});

export const More = style({
  minHeight: toRem(28),
  color: ink,
  opacity: 0.6,
});

// Volume and the on/off choices, together in a box under the list.
export const Controls = style({
  display: 'grid',
  gap: toRem(10),
  padding: `${toRem(10)} ${toRem(10)} ${toRem(8)}`,
  borderRadius: rowRadius,
  background: color.Surface.Container,
});

export const Level = style({
  display: 'grid',
  gap: toRem(4),
});

export const LevelHead = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const LevelValue = style({
  minWidth: toRem(36),
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
});

const thumb = {
  width: 12,
  height: 12,
  borderRadius: '50%',
  background: color.Primary.OnMain,
  border: 'none',
  boxShadow: config.shadow.E100,
};

export const Slider = style({
  appearance: 'none',
  WebkitAppearance: 'none',
  width: '100%',
  height: 16,
  margin: 0,
  background: 'transparent',
  cursor: 'pointer',
  ':focus-visible': { outline: `2px solid ${ember}`, outlineOffset: 3, borderRadius: 6 },
  selectors: {
    '&::-webkit-slider-runnable-track': {
      height: 4,
      borderRadius: forgeRadius.pill,
      background: `linear-gradient(to right, ${ember} var(--level, 100%), ${line(
        12
      )} var(--level, 100%))`,
    },
    '&::-webkit-slider-thumb': {
      ...thumb,
      appearance: 'none',
      WebkitAppearance: 'none',
      marginTop: -4,
    },
    '&::-moz-range-track': { height: 4, borderRadius: forgeRadius.pill, background: line(12) },
    '&::-moz-range-progress': { height: 4, borderRadius: forgeRadius.pill, background: ember },
    '&::-moz-range-thumb': thumb,
  },
});

export const OptionRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: toRem(10),
});

// The option's icon in a small tile, lit ember while it's on.
export const OptionIcon = style({
  display: 'grid',
  placeItems: 'center',
  flex: 'none',
  width: toRem(26),
  height: toRem(26),
  borderRadius: toRem(7),
  background: line(6),
  color: forgeColor.Text.Secondary,
  transition: 'background 120ms, color 120ms',
  selectors: {
    '&[data-on=true]': { background: forgeTint(ember, 14), color: ember },
  },
});

// The sound test: a full row in the controls box, ember while it plays.
export const TestButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: config.space.S200,
  height: toRem(30),
  border: 'none',
  borderRadius: toRem(7),
  background: line(7),
  color: 'inherit',
  font: 'inherit',
  cursor: 'pointer',
  ':hover': { background: line(12) },
  ':focus-visible': { outline: `2px solid ${ember}`, outlineOffset: 2 },
  selectors: {
    '&[aria-pressed=true]': { background: forgeTint(ember, 18), color: ember },
  },
});

export const Hint = style({
  padding: `0 ${config.space.S300}`,
});

export const Divider = style({
  height: 1,
  margin: `0 ${config.space.S100}`,
  background: line(8),
});

// The way out to the full settings: quieter than the choices above it.
export const Link = style({
  minHeight: toRem(30),
  padding: `0 ${toRem(10)}`,
  color: ink,
  opacity: 0.55,
  ':hover': { opacity: 1 },
});

export const Arrow = style({
  marginLeft: toRem(-6),
  minWidth: toRem(20),
  width: toRem(20),
});
