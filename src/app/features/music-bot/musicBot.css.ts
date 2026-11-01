import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const Bar = style({
  padding: `${config.space.S200} ${config.space.S400}`,
  borderTop: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
});

export const Cover = style({
  width: toRem(40),
  height: toRem(40),
  borderRadius: config.radii.R300,
  objectFit: 'cover',
  flexShrink: 0,
  background: color.Surface.ContainerActive,
});

export const CoverIcon = style([
  Cover,
  { display: 'flex', alignItems: 'center', justifyContent: 'center' },
]);

export const TitleLink = style({
  color: 'inherit',
  textDecoration: 'none',
  selectors: { '&:hover': { textDecoration: 'underline' } },
});

export const Volume = style({
  width: toRem(84),
  accentColor: color.Primary.Main,
});

export const Queue = style({
  maxHeight: toRem(180),
});

export const QueueItem = style({
  padding: `${config.space.S100} ${config.space.S200}`,
  borderRadius: config.radii.R300,
  selectors: { '&:hover': { background: color.Surface.ContainerHover } },
});
