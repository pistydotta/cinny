import { style } from '@vanilla-extract/css';
import { color } from 'folds';

export const Volume = style({
  display: 'grid',
  gap: 6,
  fontSize: 12,
  padding: '10px 0',
});
export const Kick = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: 'transparent',
  color: color.Critical.Main,
  border: `1px solid ${color.Surface.ContainerLine}`,
  borderRadius: 8,
  padding: '8px 10px',
  font: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
  ':hover': { background: color.Critical.Container },
  ':focus-visible': { outline: `2px solid ${color.Critical.Main}`, outlineOffset: 2 },
  ':disabled': { opacity: 0.5, cursor: 'wait' },
});

export const Slider = style({
  appearance: 'none',
  WebkitAppearance: 'none',
  minWidth: 0,
  flex: 1,
  width: '100%',
  height: 24,
  margin: 0,
  background: 'transparent',
  cursor: 'pointer',
  ':focus-visible': {
    outline: `2px solid ${color.Primary.Main}`,
    outlineOffset: 3,
    borderRadius: 6,
  },
  ':disabled': { opacity: 0.4, cursor: 'default' },
  selectors: {
    '&::-webkit-slider-runnable-track': {
      height: 4,
      borderRadius: 999,
      background: `linear-gradient(to right, ${color.Primary.Main} var(--voice-volume, 100%), ${color.Surface.ContainerLine} var(--voice-volume, 100%))`,
    },
    '&::-webkit-slider-thumb': {
      appearance: 'none',
      WebkitAppearance: 'none',
      width: 12,
      height: 12,
      borderRadius: '50%',
      background: color.Primary.Main,
      border: `2px solid ${color.Surface.Container}`,
      marginTop: -4,
      boxShadow: `0 0 0 1px ${color.Primary.Main}`,
    },
    '&::-moz-range-track': {
      height: 4,
      borderRadius: 999,
      background: color.Surface.ContainerLine,
    },
    '&::-moz-range-progress': { height: 4, borderRadius: 999, background: color.Primary.Main },
    '&::-moz-range-thumb': {
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: color.Primary.Main,
      border: `2px solid ${color.Surface.Container}`,
    },
  },
});

export const Card = style({
  borderRadius: 12,
  border: `1px solid ${color.Surface.ContainerLine}`,
  boxShadow: '0 12px 36px rgb(0 0 0 / 35%)',
});

export const VolumeValue = style({
  minWidth: 38,
  fontSize: 11,
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'right',
  color: color.Surface.OnContainer,
});
