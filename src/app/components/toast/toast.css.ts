import { keyframes, style, styleVariants } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';
import { forgeInset, forgeMotion, forgeRadius } from '../../features/forge-theme/tokens';

// One stack for every toast and corner card, above the composer's row on the right, so a
// short message and the app card never land on top of each other. It sits over folds' overlays
// too: "link copied" is said from inside the invite dialog.
export const Stack = style({
  position: 'fixed',
  right: config.space.S400,
  bottom: toRem(88),
  zIndex: `calc(${config.zIndex.Max} + 1)`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: config.space.S200,
  pointerEvents: 'none',
  '@media': {
    'screen and (max-width: 600px)': { left: config.space.S300, right: config.space.S300 },
  },
});

const rise = keyframes({
  from: { opacity: 0, transform: 'translateY(6px)' },
  to: { opacity: 1, transform: 'none' },
});

export const Card = style({
  pointerEvents: 'auto',
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: config.space.S200,
  maxWidth: toRem(380),
  padding: `${config.space.S200} ${config.space.S200} ${config.space.S200} ${config.space.S400}`,
  borderRadius: forgeRadius.card,
  backgroundColor: color.Surface.Container,
  color: color.Surface.OnContainer,
  boxShadow: `${forgeInset(color.Surface.ContainerLine)}, ${config.shadow.E200}`,
  animation: `${rise} ${forgeMotion.base} ${forgeMotion.easeOut} both`,
  '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
});

export const Text = style({ flex: '1 1 12rem', minWidth: 0 });

export const Actions = style({ display: 'flex', alignItems: 'center', gap: config.space.S200 });

// The tone is the icon's colour only; the card itself stays on the surface.
export const Tone = styleVariants({
  Success: { color: color.Success.Main, flexShrink: 0 },
  Critical: { color: color.Critical.Main, flexShrink: 0 },
});
