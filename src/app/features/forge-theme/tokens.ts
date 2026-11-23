// Forge's scale for what folds' config doesn't settle: type roles, the spacing steps above
// folds' S700, radii by purpose, stacking layers and motion. Plain values, so style files and
// tests can import them; colours live in palette.ts. Use these instead of a new literal: the
// ratchet test (literals.test.ts) counts the literals left in our style files.

const rem = (px: number) => `${px / 16}rem`;

export const forgeFont = {
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};

// Nine sizes in all: these seven plus the stage numbers games size with container units.
export const forgeType = {
  display: { fontSize: rem(28), lineHeight: rem(34), fontWeight: 800 },
  title: { fontSize: rem(20), lineHeight: rem(26), fontWeight: 700 },
  heading: { fontSize: rem(16), lineHeight: rem(22), fontWeight: 700 },
  body: { fontSize: rem(14), lineHeight: rem(20), fontWeight: 400 },
  bodySm: { fontSize: rem(13), lineHeight: rem(18), fontWeight: 400 },
  caption: { fontSize: rem(12), lineHeight: rem(16), fontWeight: 500 },
  overline: { fontSize: rem(11), lineHeight: rem(14), fontWeight: 600, letterSpacing: '0.08em' },
} as const;

// folds' S100–S700 (4–32px) plus two page gutters.
export const forgeSpace = {
  S100: rem(4),
  S200: rem(8),
  S300: rem(12),
  S400: rem(16),
  S500: rem(20),
  S600: rem(24),
  S700: rem(32),
  S800: rem(40),
  S900: rem(48),
};

// Square-shouldered controls, slightly softer cards; pill only where a pill means something
// (a count, a live marker, the wallet).
export const forgeRadius = {
  control: rem(4),
  card: rem(8),
  round: '50%',
  pill: '9999px',
};

// Stacking layers. 1–3 stay fine for local order inside a component.
export const forgeZ = {
  sticky: 10,
  floating: 50,
  overlay: 300,
  toast: 400,
  effect: 9999,
};

export const forgeMotion = {
  fast: '120ms',
  base: '180ms',
  slow: '280ms',
  easeOut: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  spring: 'cubic-bezier(0.3, 1.3, 0.5, 1)',
};

// Elevation per mode, assigned to folds' config.shadow in shell.css.ts. E100 lifts a card,
// E200 menus and toasts, E300 dialogs, E400 the floating screen-share viewer.
export const forgeShadowDark = {
  E100: '0 1px 2px rgba(0, 0, 0, 0.5)',
  E200: '0 8px 24px rgba(0, 0, 0, 0.55)',
  E300: '0 16px 48px rgba(0, 0, 0, 0.6)',
  E400: '0 24px 64px rgba(0, 0, 0, 0.65)',
};

export const forgeShadowLight: typeof forgeShadowDark = {
  E100: '0 1px 2px rgba(16, 18, 20, 0.08)',
  E200: '0 8px 24px rgba(16, 18, 20, 0.14)',
  E300: '0 16px 48px rgba(16, 18, 20, 0.2)',
  E400: '0 24px 64px rgba(16, 18, 20, 0.24)',
};

// A field's hairline or focus ring drawn inside its box, so it takes no layout space.
export const forgeInset = (ink: string, width = 1) => `inset 0 0 0 ${width}px ${ink}`;

// A role's colour at some strength over whatever is behind it: soft fills and rings.
export const forgeTint = (ink: string, percent: number) =>
  `color-mix(in srgb, ${ink} ${percent}%, transparent)`;
