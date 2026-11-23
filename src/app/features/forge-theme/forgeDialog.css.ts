import { keyframes, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { color, config, toRem } from 'folds';
import { forgeInset, forgeMotion, forgeRadius, forgeType, forgeZ } from './tokens';

const PHONE = 'screen and (max-width: 600px)';

const rise = keyframes({
  from: { opacity: 0, transform: 'translateY(8px)' },
  to: { opacity: 1, transform: 'none' },
});

export const Overlay = style({
  position: 'fixed',
  inset: 0,
  zIndex: forgeZ.overlay,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: toRem(16),
  backgroundColor: color.Other.Overlay,
  '@media': { [PHONE]: { alignItems: 'flex-end', padding: 0 } },
});

// A card in the middle of the window, or a bottom sheet on phones.
export const panel = recipe({
  base: {
    display: 'flex',
    flexDirection: 'column',
    gap: toRem(16),
    width: '100%',
    maxHeight: '100%',
    overflowY: 'auto',
    padding: toRem(24),
    borderRadius: forgeRadius.card,
    backgroundColor: color.Surface.Container,
    color: color.Surface.OnContainer,
    boxShadow: `${forgeInset(color.Surface.ContainerLine)}, ${config.shadow.E300}`,
    animation: `${rise} ${forgeMotion.slow} ${forgeMotion.easeOut} both`,
    '@media': {
      [PHONE]: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: toRem(20) },
      '(prefers-reduced-motion: reduce)': { animation: 'none' },
    },
  },
  variants: {
    size: {
      sm: { maxWidth: toRem(400) },
      md: { maxWidth: toRem(560) },
      lg: { maxWidth: toRem(800) },
    },
  },
  defaultVariants: { size: 'sm' },
});

export const Header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: toRem(12),
});

export const Title = style({ ...forgeType.title, margin: 0 });

export const Close = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: toRem(32),
  height: toRem(32),
  border: 0,
  borderRadius: forgeRadius.control,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  selectors: { '&:hover': { backgroundColor: color.Surface.ContainerHover } },
});
