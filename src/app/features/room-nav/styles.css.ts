import { style } from '@vanilla-extract/css';
import { color, config } from 'folds';
import { forgeColor } from '../forge-theme/forgeColor.css';
import { livePill } from '../call-indicator/live.css';

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

// Someone sharing their screen: an ember ring and a Live pill after the name, which watches it.
// Live is ember everywhere (call-indicator/live.css.ts), never the red of errors.
export const CallMemberLiveRing = style({
  boxShadow: `0 0 0 2px ${color.Background.Container}, 0 0 0 4px ${forgeColor.Ember.Main}`,
});
export const CallMemberLive = style({
  ...livePill,
  border: 'none',
  fontFamily: 'inherit',
  selectors: {
    'button&': { cursor: 'pointer' },
    'button&:hover': { filter: 'brightness(1.1)' },
    '&:focus-visible': { outline: `2px solid ${forgeColor.Ember.Main}`, outlineOffset: 2 },
  },
});
