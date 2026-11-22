import { style } from '@vanilla-extract/css';
import { color, toRem } from 'folds';
import { forgeMotion, forgeRadius, forgeType } from './tokens';

// A raised track with the chosen option in the theme's wine: the one way to pick one of a few.
export const Track = style({
  display: 'inline-flex',
  gap: toRem(2),
  padding: toRem(2),
  borderRadius: forgeRadius.control,
  backgroundColor: color.SurfaceVariant.Container,
  border: `1px solid ${color.SurfaceVariant.ContainerLine}`,
});

export const Segment = style({
  minWidth: toRem(64),
  height: toRem(28),
  padding: `0 ${toRem(12)}`,
  border: 0,
  borderRadius: toRem(3),
  background: 'transparent',
  color: color.SurfaceVariant.OnContainer,
  font: 'inherit',
  ...forgeType.bodySm,
  fontWeight: 600,
  cursor: 'pointer',
  transition: `background-color ${forgeMotion.fast} ${forgeMotion.easeOut}`,
  selectors: {
    '&:hover': { backgroundColor: color.SurfaceVariant.ContainerHover },
    '&[aria-checked=true]': {
      backgroundColor: color.Primary.Main,
      color: color.Primary.OnMain,
      cursor: 'default',
    },
  },
});
