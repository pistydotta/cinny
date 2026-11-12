import { createTheme } from '@vanilla-extract/css';
import { config } from 'folds';

export const onLightFontWeight = createTheme(config.fontWeight, {
  W100: '100',
  W200: '200',
  W300: '300',
  W400: '400',
  W500: '500',
  W600: '600',
  W700: '700',
  W800: '800',
  W900: '900',
});

export const onDarkFontWeight = createTheme(config.fontWeight, {
  W100: '100',
  W200: '200',
  W300: '300',
  W400: '400',
  W500: '500',
  W600: '600',
  W700: '700',
  W800: '800',
  W900: '900',
});

// Forge is square-shouldered: one small radius everywhere, avatars stay round.
export const forgeRadii = createTheme(config.radii, {
  R0: '0',
  R300: '4px',
  R400: '4px',
  R500: '6px',
  Round: '50%',
  Pill: '4px',
});
