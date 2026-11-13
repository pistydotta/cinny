import { globalStyle, style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

// Hairlines take the card's text color at low strength, so they hold up in every theme.
const line = (strength: number) =>
  `color-mix(in srgb, ${color.Surface.OnContainer} ${strength}%, transparent)`;

// The login card's own red, a step brighter than the theme's primary so it reads on the
// dark card.
const brand = '#993C1D';
const brandHover = '#86331A';
const onBrand = '#FAECE7';

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
  background: onBrand,
});

export const Logo = style([DefaultReset, { width: toRem(28), height: toRem(28) }]);

export const Chip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: toRem(6),
  alignSelf: 'center',
  padding: `${toRem(3)} ${toRem(10)}`,
  borderRadius: toRem(999),
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

export const Field = style({
  selectors: {
    '&&': {
      height: toRem(40),
      borderRadius: toRem(8),
      backgroundColor: 'transparent',
      boxShadow: `inset 0 0 0 1px ${line(22)}`,
    },
    '&&:hover': { boxShadow: `inset 0 0 0 1px ${line(35)}` },
    '&&:focus-within': { boxShadow: `inset 0 0 0 1.5px ${brand}` },
  },
});

// The show-password eye sits on the field without its own square behind it.
globalStyle(`${Field}${Field} button`, { backgroundColor: 'transparent', boxShadow: 'none' });

export const Submit = style({
  selectors: {
    '&&': {
      height: toRem(36),
      borderRadius: toRem(18),
      backgroundColor: brand,
      color: onBrand,
      boxShadow: 'none',
    },
    '&&:hover, &&:focus-visible': { backgroundColor: brandHover },
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
    '&:focus-visible': { outline: `2px solid ${brand}`, outlineOffset: 2 },
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
  borderRadius: toRem(999),
  background: line(10),
  fontSize: toRem(11),
});

export const Links = style({
  fontSize: toRem(12),
});
