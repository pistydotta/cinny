import { keyframes, style } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';
import { color, config, toRem } from 'folds';
import { forgeInset, forgeMotion, forgeRadius, forgeType } from '../../forge-theme/tokens';
import { game } from './gameTheme.css';
import { tint } from './tint';

const PHONE = 'screen and (max-width: 600px)';

// Selected, in every control that can be on or off: an ember ring on an ember tint. Gold is
// for money only, so it never marks a choice.
const pressed = {
  backgroundColor: tint(game.Accent, 14),
  boxShadow: forgeInset(game.Accent),
  color: game.Ink,
};

const variants = {
  // The one main action of a screen: flat wine, the app's own primary button.
  primary: {
    backgroundColor: color.Primary.Main,
    color: color.Primary.OnMain,
    selectors: { '&:hover:not(:disabled)': { backgroundColor: color.Primary.MainHover } },
  },
  secondary: {
    backgroundColor: game.Raised,
    color: game.Ink,
    boxShadow: forgeInset(game.Line),
    selectors: {
      '&:hover:not(:disabled)': { backgroundColor: game.RaisedHover },
      '&[aria-pressed="true"]': pressed,
    },
  },
  ghost: {
    backgroundColor: 'transparent',
    color: game.Ink,
    selectors: {
      '&:hover:not(:disabled)': { backgroundColor: game.RaisedHover },
      '&[aria-pressed="true"]': pressed,
    },
  },
  danger: {
    backgroundColor: tint(game.Critical, 14),
    color: game.Critical,
    selectors: { '&:hover:not(:disabled)': { backgroundColor: tint(game.Critical, 22) } },
  },
};

const control = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: toRem(8),
  flexShrink: 0,
  border: 0,
  borderRadius: forgeRadius.control,
  fontFamily: 'inherit',
  fontWeight: 600,
  textAlign: 'center',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  transition: `background-color ${forgeMotion.fast} ${forgeMotion.easeOut}`,
  selectors: { '&:disabled': { opacity: 0.45, cursor: 'default' } },
} as const;

// One button for every game: four looks, three heights (32, 40, 48).
export const gameButton = recipe({
  base: control,
  variants: {
    variant: variants,
    size: {
      sm: { height: toRem(32), padding: `0 ${toRem(12)}`, ...forgeType.bodySm, fontWeight: 600 },
      md: { height: toRem(40), padding: `0 ${toRem(16)}`, ...forgeType.body, fontWeight: 600 },
      lg: { height: toRem(48), padding: `0 ${toRem(20)}`, ...forgeType.heading },
    },
  },
  defaultVariants: { variant: 'secondary', size: 'md' },
});
export type GameButtonVariants = RecipeVariants<typeof gameButton>;

// A square button with an icon only; it always needs an aria-label.
export const gameIconButton = recipe({
  base: control,
  variants: {
    variant: { secondary: variants.secondary, ghost: variants.ghost },
    size: {
      sm: { width: toRem(32), height: toRem(32) },
      md: { width: toRem(40), height: toRem(40) },
    },
  },
  defaultVariants: { variant: 'ghost', size: 'md' },
});

/* ---------- Top bar ---------- */

// Back, the title and a line under it, then the wallet or score and up to three actions.
export const TopBar = style({
  display: 'flex',
  alignItems: 'center',
  gap: toRem(12),
  flexShrink: 0,
  minHeight: toRem(56),
  padding: `${toRem(8)} ${toRem(16)}`,
  borderBottom: `1px solid ${game.Line}`,
  backgroundColor: game.Bg,
  color: game.Ink,
  '@media': { [PHONE]: { gap: toRem(6), padding: `${toRem(6)} ${toRem(8)}`, flexWrap: 'wrap' } },
});

export const TopTitle = style({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  flexGrow: 1,
  '@media': { [PHONE]: { minWidth: toRem(100) } },
});

const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;
export const TopTitleText = style({ ...forgeType.heading, ...ellipsis });
export const TopSubtitle = style({ ...forgeType.caption, color: game.Muted, ...ellipsis });

export const TopActions = style({ display: 'flex', alignItems: 'center', gap: toRem(6) });

/* ---------- Wallet ---------- */

export const Wallet = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: toRem(8),
  height: toRem(32),
  padding: `0 ${toRem(12)} 0 ${toRem(4)}`,
  flexShrink: 0,
  borderRadius: forgeRadius.pill,
  backgroundColor: game.MoneyContainer,
  boxShadow: forgeInset(tint(game.Money, 35)),
  ...forgeType.bodySm,
  fontWeight: 700,
  whiteSpace: 'nowrap',
});

export const Coin = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: toRem(24),
  height: toRem(24),
  flexShrink: 0,
  borderRadius: forgeRadius.round,
  backgroundColor: game.Money,
  color: game.OnMoney,
  ...forgeType.caption,
  fontWeight: 800,
});

export const WalletValue = style({ color: game.Money, fontVariantNumeric: 'tabular-nums' });

export const WalletExtra = style({
  color: game.Muted,
  fontWeight: 600,
  '@media': { [PHONE]: { display: 'none' } },
});

/* ---------- Dialog ---------- */

const rise = keyframes({
  from: { opacity: 0, transform: 'translateY(8px)' },
  to: { opacity: 1, transform: 'none' },
});

export const dialog = recipe({
  base: {
    display: 'flex',
    flexDirection: 'column',
    gap: toRem(16),
    width: '100%',
    maxHeight: '100%',
    overflowY: 'auto',
    padding: toRem(24),
    borderRadius: forgeRadius.card,
    backgroundColor: game.Raised,
    color: game.Ink,
    boxShadow: `${forgeInset(game.Line)}, ${config.shadow.E300}`,
    animation: `${rise} ${forgeMotion.slow} ${forgeMotion.easeOut} both`,
    '@media': {
      // A bottom sheet on phones.
      [PHONE]: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: toRem(20) },
      '(prefers-reduced-motion: reduce)': { animation: 'none' },
    },
  },
  variants: {
    size: {
      sm: { maxWidth: toRem(400) },
      md: { maxWidth: toRem(560) },
    },
  },
  defaultVariants: { size: 'sm' },
});
