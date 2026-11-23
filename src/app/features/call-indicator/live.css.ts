import { keyframes, style } from '@vanilla-extract/css';
import { toRem } from 'folds';
import { forgeColor } from '../forge-theme/forgeColor.css';
import { forgeInset, forgeRadius, forgeTint, forgeType } from '../forge-theme/tokens';

// "Live" is ember, never the red of errors: a soft ember pill with a dot that breathes.
const ember = forgeColor.Ember.Main;

export const livePill = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: toRem(4),
  flexShrink: 0,
  height: toRem(20),
  padding: `0 ${toRem(8)}`,
  borderRadius: forgeRadius.pill,
  backgroundColor: forgeTint(ember, 16),
  boxShadow: forgeInset(forgeTint(ember, 40)),
  color: ember,
  ...forgeType.caption,
  fontWeight: 600,
  whiteSpace: 'nowrap',
} as const;

export const LivePill = style(livePill);

const breathe = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.35 },
});

export const LiveDot = style({
  width: toRem(6),
  height: toRem(6),
  flexShrink: 0,
  borderRadius: forgeRadius.round,
  backgroundColor: ember,
  animation: `${breathe} 2s ease-in-out infinite`,
  '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
});

// The rail's corner mark for a call somewhere in a server: an ember disc with the speaker.
export const RailBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: toRem(18),
  height: toRem(18),
  borderRadius: forgeRadius.round,
  backgroundColor: ember,
  color: forgeColor.Ember.OnMain,
});
