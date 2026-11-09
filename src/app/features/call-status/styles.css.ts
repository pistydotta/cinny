import { keyframes, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { color, config, toRem } from 'folds';

export const LiveChipText = style({
  color: color.Critical.Main,
});

export const CallStatus = style([
  {
    padding: `${toRem(6)} ${config.space.S200}`,
    borderTop: `${config.borderWidth.B300} solid ${color.Background.ContainerLine}`,
  },
]);

export const ControlDivider = style({
  height: toRem(16),
});

export const SpeakerAvatarOutline = style({
  boxShadow: `0 0 0 ${config.borderWidth.B600} ${color.Success.Main}`,
});


// The room's name is the only part of the pill that goes to the room, so it reads as a link.
export const PillName = style({
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontWeight: 600,
  cursor: 'pointer',
  textUnderlineOffset: toRem(3),
  selectors: {
    '&:hover': { textDecoration: 'underline' },
    '&:focus-visible': {
      outline: `2px solid ${color.Primary.Main}`,
      outlineOffset: 2,
      borderRadius: 4,
    },
  },
});
export const PillSpace = style({ opacity: 0.6 });

// The call's room as one pill beside the call buttons, neutral like the rest of the bar.
// Folded, everything but the name opens the card.
const PILL_PAD_Y = toRem(4);
const PILL_PAD_END = toRem(12);
export const CallPill = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: toRem(6),
    minWidth: 0,
    maxWidth: toRem(300),
    padding: `${PILL_PAD_Y} ${PILL_PAD_END} ${PILL_PAD_Y} ${toRem(9)}`,
    border: `${config.borderWidth.B300} solid ${color.Background.ContainerLine}`,
    borderRadius: config.radii.Pill,
    background: color.SurfaceVariant.Container,
    color: color.SurfaceVariant.OnContainer,
    transition: 'background 200ms',
  },
  variants: {
    folded: {
      true: {
        cursor: 'pointer',
        selectors: {
          [`&:hover:not(:has(${PillName}:hover))`]: {
            background: color.SurfaceVariant.ContainerHover,
          },
        },
      },
      false: {},
    },
  },
});

// For the whole call, a green dot on the speaker says you are in it: a
// strong pulse, kept tight so it never grows past the pill. A saturated status green, not the
// theme's Success, which is a pale mint in the dark theme, the speaker's own color.
const ONLINE = '#23C55E';
export const PillSpeaker = style({ position: 'relative', display: 'flex', flexShrink: 0 });
const onlinePulse = keyframes({
  '0%': { boxShadow: `0 0 0 0 ${ONLINE}` },
  '70%, 100%': { boxShadow: `0 0 0 ${toRem(5)} rgba(35, 197, 94, 0)` },
});
export const OnlineDot = style({
  position: 'absolute',
  right: toRem(-5),
  bottom: toRem(-3),
  width: toRem(11),
  height: toRem(11),
  borderRadius: '50%',
  background: ONLINE,
  border: `${toRem(2)} solid ${color.SurfaceVariant.Container}`,
  animation: `${onlinePulse} 1.4s ease-out infinite`,
  '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
});

// The restore end runs to the pill's edge; a hairline sets it apart from the room.
export const PillRestore = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  alignSelf: 'stretch',
  flexShrink: 0,
  margin: `-${PILL_PAD_Y} -${PILL_PAD_END} -${PILL_PAD_Y} ${toRem(2)}`,
  padding: `0 ${toRem(11)} 0 ${toRem(9)}`,
  border: 'none',
  borderLeft: `${config.borderWidth.B300} solid ${color.Background.ContainerLine}`,
  borderRadius: `0 ${config.radii.Pill} ${config.radii.Pill} 0`,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  selectors: {
    '&:focus-visible': { outline: `2px solid ${color.Primary.Main}`, outlineOffset: -2 },
  },
});
export const PillLiveDot = style({
  position: 'absolute',
  top: toRem(4),
  right: toRem(6),
  width: toRem(8),
  height: toRem(8),
  borderRadius: '50%',
  background: color.Critical.Main,
  boxShadow: `0 0 0 2px ${color.SurfaceVariant.Container}`,
});
