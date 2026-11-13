import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const Menu = style({
  width: toRem(300),
  maxWidth: '90vw',
  padding: config.space.S200,
  display: 'grid',
  gap: config.space.S100,
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
  padding: `${config.space.S200} ${config.space.S300}`,
  border: 'none',
  borderRadius: config.radii.R300,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  ':hover': { background: color.SurfaceVariant.ContainerHover },
  ':focus-visible': { outline: `2px solid ${color.Primary.Main}`, outlineOffset: -2 },
  ':disabled': { cursor: 'default', opacity: 0.6 },
});

export const RowText = style({
  display: 'grid',
  minWidth: 0,
  flex: 1,
});

export const Options = style({
  display: 'grid',
  maxHeight: toRem(220),
  overflowY: 'auto',
  paddingLeft: config.space.S200,
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

export const Divider = style({
  height: 1,
  margin: `${config.space.S100} 0`,
  background: color.Surface.ContainerLine,
});

export const Arrow = style({
  marginLeft: toRem(-6),
  minWidth: toRem(20),
  width: toRem(20),
});

export const Panel = style({
  display: 'grid',
  gap: config.space.S300,
});
