import { style } from '@vanilla-extract/css';
import { color, config } from 'folds';

export const CategoryButton = style({
  flexGrow: 1,
});
export const CategoryButtonIcon = style({
  opacity: config.opacity.P400,
});

// Whoever is talking in the call gets a green ring, like Discord's voice list. The gap ring is
// the sidebar's own background so the green reads as a halo, not a thicker border.
export const CallMemberAvatar = style({
  borderRadius: '50%',
  transition: 'box-shadow 120ms ease-out',
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } },
});
export const CallMemberSpeaking = style({
  boxShadow: `0 0 0 2px ${color.Background.Container}, 0 0 0 4px ${color.Success.Main}`,
});
export const CallMemberNameSpeaking = style({ color: color.Surface.OnContainer, opacity: 1 });

// Someone sharing their screen: a red ring and a Live badge after the name, which watches it.
export const CallMemberLiveRing = style({
  boxShadow: `0 0 0 2px ${color.Background.Container}, 0 0 0 4px ${color.Critical.Main}`,
});
export const CallMemberLive = style({
  flexShrink: 0,
  padding: `1px ${config.space.S200}`,
  border: 'none',
  borderRadius: config.radii.Pill,
  backgroundColor: color.Critical.Main,
  color: color.Critical.OnMain,
  fontSize: '0.6875rem',
  fontWeight: 600,
  lineHeight: 1.5,
  selectors: {
    'button&': { cursor: 'pointer' },
    'button&:hover': { filter: 'brightness(1.1)' },
    '&:focus-visible': { outline: `2px solid ${color.Critical.Main}`, outlineOffset: 2 },
  },
});
