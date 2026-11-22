import { assignVars, createThemeContract, globalStyle } from '@vanilla-extract/css';
import { forgeExtraDark, forgeExtraLight } from './palette';

// The roles folds' `color` has no slot for (see palette.ts), as CSS variables on <body>, which
// carries the theme class. Import `forgeColor` the way you import folds' `color`.
export const forgeColor = createThemeContract({
  Ember: { Main: null, OnMain: null },
  Text: { Secondary: null, Faint: null },
});

globalStyle('body', { vars: assignVars(forgeColor, forgeExtraLight) });
globalStyle('body.dark-theme', { vars: assignVars(forgeColor, forgeExtraDark) });

// Links were Cinny's blue, the only blue in the app. index.css sets --tc-link on :root and
// .dark-theme; body.dark-theme is more specific, and body sits below :root.
globalStyle('body, body.dark-theme', { vars: { '--tc-link': forgeColor.Ember.Main } });
