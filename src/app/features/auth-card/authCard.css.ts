import { globalStyle, style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';
import { forgeColor } from '../forge-theme/forgeColor.css';
import { forgeRadius } from '../forge-theme/tokens';

// Hairlines take the card's text color at low strength, so they hold up in every theme.
const line = (strength: number) =>
  `color-mix(in srgb, ${color.Surface.OnContainer} ${strength}%, transparent)`;

// The card's button is the theme's wine; focus marks are ember, like everywhere else.
const focus = forgeColor.Ember.Main;
// The logo's tile: a pale wine paper behind the mark in both modes.
const logoPaper = '#FAECE7';

// Doubled class (&&) so these win over folds' own classes whatever order the CSS loads in.
export const Card = style({
  selectors: {
    '&&': {
      maxWidth: toRem(380),
      borderRadius: toRem(14),
      boxShadow: 'none',
      border: `1px solid ${line(14)}`,
    },
  },
});

export const Brand = style({
  display: 'grid',
  justifyItems: 'center',
  gap: config.space.S300,
  textAlign: 'center',
});

export const LogoTile = style({
  display: 'grid',
  placeItems: 'center',
  width: toRem(48),
  height: toRem(48),
  borderRadius: toRem(12),
  background: logoPaper,
});

export const Logo = style([DefaultReset, { width: toRem(28), height: toRem(28) }]);

export const Chip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: toRem(6),
  alignSelf: 'center',
  padding: `${toRem(3)} ${toRem(10)}`,
  borderRadius: forgeRadius.control,
  border: `1px solid ${line(18)}`,
  background: 'transparent',
  color: line(70),
  font: 'inherit',
  fontSize: toRem(12),
  lineHeight: 1.4,
  selectors: {
    'button&': { cursor: 'pointer' },
    'button&:hover': { borderColor: line(35), color: color.Surface.OnContainer },
  },
});

export const ServerChipText = style({
  maxWidth: toRem(220),
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

// Tripled, to also outrank the shell's text-field rule (two classes).
export const Field = style({
  selectors: {
    '&&&': {
      height: toRem(40),
      borderRadius: toRem(8),
      backgroundColor: 'transparent',
      boxShadow: `inset 0 0 0 1px ${line(22)}`,
    },
    '&&&:hover': { boxShadow: `inset 0 0 0 1px ${line(35)}` },
    '&&&:focus-within': { boxShadow: `inset 0 0 0 1.5px ${focus}` },
  },
});

// The show-password eye sits on the field without its own square behind it.
globalStyle(`${Field}${Field} button`, { backgroundColor: 'transparent', boxShadow: 'none' });

export const Submit = style({
  selectors: {
    '&&': {
      height: toRem(36),
      borderRadius: toRem(18),
      backgroundColor: color.Primary.Main,
      color: color.Primary.OnMain,
      boxShadow: 'none',
    },
    '&&:hover': { backgroundColor: color.Primary.MainHover },
    '&&:focus-visible': { outline: `2px solid ${focus}`, outlineOffset: 2 },
  },
});

// The quiet second action under the main button (back to login, passkey).
export const Secondary = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: toRem(8),
  width: '100%',
  height: toRem(36),
  borderRadius: toRem(18),
  border: `1px solid ${line(18)}`,
  background: 'transparent',
  color: line(80),
  font: 'inherit',
  fontSize: toRem(13),
  textDecoration: 'none',
  cursor: 'pointer',
  selectors: {
    '&:hover': { borderColor: line(35), color: color.Surface.OnContainer, textDecoration: 'none' },
    '&:focus-visible': { outline: `2px solid ${focus}`, outlineOffset: 2 },
  },
});

// Not wired yet: it shows what is coming without pretending to work.
export const Passkey = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: toRem(8),
  width: '100%',
  height: toRem(36),
  borderRadius: toRem(18),
  border: `1px solid ${line(18)}`,
  background: 'transparent',
  color: line(55),
  font: 'inherit',
  fontSize: toRem(13),
  cursor: 'not-allowed',
});

export const Soon = style({
  padding: `${toRem(1)} ${toRem(7)}`,
  borderRadius: forgeRadius.control,
  background: line(10),
  fontSize: toRem(11),
});

export const Links = style({
  fontSize: toRem(12),
});
