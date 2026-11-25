import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';
import { forgeColor } from '../forge-theme/forgeColor.css';
import { forgeRadius } from '../forge-theme/tokens';

// Forge's bright accent: the wine primary is too deep to read as a fill on the dark card.
const ember = forgeColor.Ember.Main;

const line = (strength: number) =>
  `color-mix(in srgb, ${color.Surface.OnContainer} ${strength}%, transparent)`;

export const Menu = style({
  width: toRem(300),
  maxWidth: '90vw',
  padding: config.space.S200,
  display: 'grid',
  gap: config.space.S100,
});

export const Panel = style({
  display: 'grid',
  gap: config.space.S400,
});

export const Group = style({
  display: 'grid',
  gap: config.space.S200,
});

export const Section = style({
  display: 'grid',
  gap: config.space.S100,
});

export const Heading = style({
  padding: `${config.space.S100} ${config.space.S300} 0`,
  color: color.Surface.OnContainer,
  opacity: 0.7,
});

export const Row = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  width: '100%',
  minHeight: toRem(36),
  padding: `${config.space.S100} ${config.space.S300}`,
  border: 'none',
  borderRadius: config.radii.R300,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  ':hover': { background: color.SurfaceVariant.ContainerHover },
  ':focus-visible': { outline: `2px solid ${ember}`, outlineOffset: -2 },
  ':disabled': { cursor: 'default', opacity: 0.6 },
});

export const RowText = style({
  display: 'grid',
  minWidth: 0,
  flex: 1,
});

export const Options = style({
  display: 'grid',
  maxHeight: toRem(184),
  overflowY: 'auto',
});

export const Option = style({
  selectors: {
    '&[aria-checked=true]': { background: color.SurfaceVariant.Container },
  },
});

// A radio drawn like Forge's switch: an empty ring, filled ember once chosen.
export const Radio = style({
  flex: 'none',
  boxSizing: 'border-box',
  width: 16,
  height: 16,
  borderRadius: '50%',
  border: `1.5px solid ${line(35)}`,
  transition: 'border 120ms ease',
  selectors: {
    [`${Option}[aria-checked=true] &`]: { border: `5px solid ${ember}` },
  },
});

export const Level = style({
  display: 'grid',
  gap: config.space.S100,
  padding: `${config.space.S100} ${config.space.S300}`,
});

export const LevelValue = style({
  minWidth: toRem(40),
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
});

const thumb = {
  width: 14,
  height: 14,
  borderRadius: '50%',
  background: ember,
  border: `2px solid ${color.Surface.Container}`,
};

export const Slider = style({
  appearance: 'none',
  WebkitAppearance: 'none',
  width: '100%',
  height: 20,
  margin: 0,
  background: 'transparent',
  cursor: 'pointer',
  ':focus-visible': { outline: `2px solid ${ember}`, outlineOffset: 3, borderRadius: 6 },
  selectors: {
    '&::-webkit-slider-runnable-track': {
      height: 4,
      borderRadius: forgeRadius.pill,
      background: `linear-gradient(to right, ${ember} var(--level, 100%), ${line(
        18
      )} var(--level, 100%))`,
    },
    '&::-webkit-slider-thumb': {
      ...thumb,
      appearance: 'none',
      WebkitAppearance: 'none',
      marginTop: -5,
    },
    '&::-moz-range-track': { height: 4, borderRadius: forgeRadius.pill, background: line(18) },
    '&::-moz-range-progress': { height: 4, borderRadius: forgeRadius.pill, background: ember },
    '&::-moz-range-thumb': { ...thumb, width: 10, height: 10 },
  },
});

export const Test = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  padding: `${config.space.S100} ${config.space.S300}`,
});

export const TestButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: config.space.S100,
  flex: 'none',
  height: toRem(30),
  padding: `0 ${config.space.S300}`,
  border: `1px solid ${line(25)}`,
  borderRadius: config.radii.R300,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  cursor: 'pointer',
  ':hover': { background: color.SurfaceVariant.ContainerHover, borderColor: line(40) },
  ':focus-visible': { outline: `2px solid ${ember}`, outlineOffset: 2 },
  selectors: {
    '&[aria-pressed=true]': { borderColor: ember, color: ember },
  },
});

export const Meter = style({
  flex: 1,
  minWidth: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(16, 1fr)',
  gap: 2,
  height: 8,
});

export const MeterBar = style({
  borderRadius: 1,
  background: line(14),
  transition: 'background 60ms linear',
  selectors: {
    '&[data-lit=true]': { background: color.Success.Main },
    '&[data-lit=true][data-hot=true]': { background: ember },
  },
});

export const Hint = style({
  padding: `0 ${config.space.S300}`,
});

export const Divider = style({
  height: 1,
  margin: `${config.space.S100} 0`,
  background: line(12),
});

export const Arrow = style({
  marginLeft: toRem(-6),
  minWidth: toRem(20),
  width: toRem(20),
});
