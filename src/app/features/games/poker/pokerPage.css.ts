import { globalStyle, keyframes, style } from '@vanilla-extract/css';
import { color, toRem } from 'folds';
import { game, LobbyScope, StageScope } from '../ui/gameTheme.css';
import { tint } from '../ui/tint';
import { gameButton } from '../ui/gameUi.css';
import { forgeInset, forgeRadius, forgeType } from '../../forge-theme/tokens';
import { forgeStage } from '../../forge-theme/palette';

// Poker on the games kit (games/ui): graphite where the game is played, the app's theme in the
// lobby and setup screens, wine for the main action, ember for a choice, gold for money only.

const fadeIn = keyframes({
  from: { opacity: 0, transform: 'translateY(8px)' },
  to: { opacity: 1, transform: 'none' },
});

const page = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
  backgroundColor: game.Bg,
} as const;

// The lobby, practice and tournament setup follow the theme; the table is the stage.
export const Page = style([LobbyScope, page]);
export const TablePage = style([StageScope, page]);

/** Text next to an icon that is dropped on narrow screens. */
export const WideOnly = style({
  '@media': {
    'screen and (max-width: 600px)': { display: 'none' },
  },
});

// The top bar's buttons: an icon, sometimes with a word beside it.
export const IconButton = style([
  gameButton({ variant: 'ghost', size: 'md' }),
  { minWidth: toRem(40), padding: `0 ${toRem(10)}` },
]);

export const TableArea = style({
  position: 'relative',
  flexGrow: 1,
  minHeight: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 16px',
  containerType: 'size',
});

export const StageWrap = style({
  width: 'min(100cqw, 160cqh)',
  selectors: {
    '&[data-layout="portrait"]': { width: 'min(100cqw, 62.5cqh)' },
  },
});

export const Overlay = style({
  position: 'absolute',
  inset: 0,
  zIndex: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  backgroundColor: color.Other.Overlay,
});

export const Dialog = style({
  width: 'min(440px, 100%)',
  maxHeight: '100%',
  overflowY: 'auto',
  padding: 24,
  borderRadius: forgeRadius.card,
  backgroundColor: game.Raised,
  color: game.Ink,
  boxShadow: forgeInset(game.Line),
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  animation: `${fadeIn} 280ms ease-out both`,
});

export const DialogTitle = style({ ...forgeType.title, margin: 0 });

export const DialogText = style({ ...forgeType.body, color: game.Muted, margin: 0 });

export const Field = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

export const FieldHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  ...forgeType.bodySm,
  fontWeight: 600,
  color: game.Muted,
});

export const FieldValue = style({
  ...forgeType.heading,
  color: game.Money,
  fontVariantNumeric: 'tabular-nums',
});

export const Range = style({
  width: '100%',
  accentColor: game.Accent,
  cursor: 'pointer',
});

export const RangeLimits = style({
  display: 'flex',
  justifyContent: 'space-between',
  ...forgeType.caption,
  color: game.Muted,
});

export const Segmented = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: 6,
});

export const SegmentButton = style([
  gameButton({ variant: 'secondary', size: 'md' }),
  { padding: 0, fontVariantNumeric: 'tabular-nums' },
]);

export const InfoBox = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '12px 14px',
  borderRadius: forgeRadius.card,
  backgroundColor: game.Bg,
  boxShadow: forgeInset(game.Line),
  ...forgeType.bodySm,
  color: game.Muted,
});

export const InfoRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
});

export const PrimaryButton = gameButton({ variant: 'primary', size: 'lg' });
export const SecondaryButton = gameButton({ variant: 'secondary', size: 'md' });
export const SmallButton = gameButton({ variant: 'primary', size: 'md' });
export const QuietButton = gameButton({ variant: 'secondary', size: 'md' });

export const ErrorText = style({ ...forgeType.bodySm, color: game.Critical, margin: 0 });

export const Note = style({ ...forgeType.caption, fontWeight: 400, color: game.Muted, margin: 0 });

/* ---------- Hand guide ---------- */

export const GuideCards = style({
  display: 'flex',
  gap: 4,
  flexWrap: 'wrap',
  vars: { '--card-w': '29px' },
});
export const GuideNote = style({
  margin: '4px 0',
  color: game.Muted,
  ...forgeType.caption,
  fontWeight: 400,
});
export const HandLadder = style({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'grid',
  gap: 8,
});
export const HandLadderRow = style({
  display: 'grid',
  gridTemplateColumns: '26px 1fr',
  gap: 8,
  padding: 10,
  borderRadius: forgeRadius.card,
  backgroundColor: game.Bg,
  boxShadow: forgeInset(game.Line),
  selectors: {
    '&[aria-current="true"]': {
      backgroundColor: tint(game.Accent, 12),
      boxShadow: forgeInset(game.Accent),
    },
  },
});

/* ---------- History drawer ---------- */

export const Drawer = style({
  position: 'absolute',
  top: 8,
  right: 8,
  bottom: 8,
  zIndex: 15,
  width: 'min(300px, calc(100% - 16px))',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: forgeRadius.card,
  backgroundColor: game.Raised,
  boxShadow: forgeInset(game.Line),
  animation: `${fadeIn} 200ms ease-out both`,
});

export const DrawerHeader = style({
  padding: '12px 14px',
  ...forgeType.body,
  fontWeight: 700,
  borderBottom: `1px solid ${game.Line}`,
});

export const DrawerList = style({
  flexGrow: 1,
  overflowY: 'auto',
  padding: '8px 14px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  ...forgeType.caption,
  fontWeight: 400,
  color: game.Muted,
});

export const DrawerHand = style({ marginTop: 8, fontWeight: 700, color: game.Ink });

/* ---------- Lobby ---------- */

export const LobbyScroll = style({
  flexGrow: 1,
  minHeight: 0,
  overflowY: 'auto',
});

export const LobbyInner = style({
  maxWidth: 880,
  margin: '0 auto',
  padding: '24px 16px 48px',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
});

export const SectionHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
});

export const SectionTitle = style({ ...forgeType.heading, margin: 0 });

export const TableList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

export const TableRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '12px 16px',
  borderRadius: forgeRadius.card,
  backgroundColor: game.Raised,
  boxShadow: forgeInset(game.Line),
});

// A bit of felt: the one place the lobby shows the game's own colour.
export const TableIcon = style({
  width: 40,
  height: 40,
  borderRadius: forgeRadius.card,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  ...forgeType.title,
  color: forgeStage.Ink,
  backgroundColor: forgeStage.Felt,
});

export const TableInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 0,
  flexGrow: 1,
});

export const TableName = style({
  ...forgeType.body,
  fontWeight: 600,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const TableMeta = style({ ...forgeType.caption, fontWeight: 400, color: game.Muted });

export const EmptyState = style({
  padding: '22px 18px',
  borderRadius: forgeRadius.card,
  border: `1px dashed ${game.Line}`,
  ...forgeType.body,
  color: game.Muted,
  textAlign: 'center',
});

export const PracticeCard = style({
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '16px 18px',
  borderRadius: forgeRadius.card,
  backgroundColor: game.Raised,
  boxShadow: `${forgeInset(game.Line)}, inset 3px 0 0 ${game.Accent}`,
});

export const TextInput = style({
  height: 40,
  borderRadius: forgeRadius.control,
  border: 0,
  backgroundColor: game.Bg,
  boxShadow: forgeInset(game.Line),
  color: game.Ink,
  ...forgeType.body,
  padding: '0 12px',
  outline: 'none',
  selectors: {
    '&:focus': { boxShadow: forgeInset(game.Accent, 2) },
  },
});

export const CheckRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 10px',
  borderRadius: forgeRadius.control,
  cursor: 'pointer',
  ...forgeType.body,
  selectors: {
    '&:hover': { backgroundColor: game.RaisedHover },
  },
});

export const ContactList = style({
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 180,
  overflowY: 'auto',
  borderRadius: forgeRadius.card,
  backgroundColor: game.Bg,
  boxShadow: forgeInset(game.Line),
});

export const Muted = style({ color: game.Muted, ...forgeType.caption, fontWeight: 400 });

/* The app resets the native look of inputs; draw checkboxes and sliders ourselves. */

export const CheckInput = style({
  appearance: 'none',
  WebkitAppearance: 'none',
  width: 18,
  height: 18,
  flexShrink: 0,
  margin: 0,
  borderRadius: forgeRadius.control,
  border: `2px solid ${game.Muted}`,
  background: 'transparent',
  cursor: 'pointer',
  selectors: {
    '&:checked': {
      borderColor: game.Accent,
      background: `${game.Accent} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.5 8.5l3 3 6-7' fill='none' stroke='white' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 14px no-repeat`,
    },
  },
});

globalStyle(`${Range}`, {
  appearance: 'none',
  WebkitAppearance: 'none',
  height: 6,
  borderRadius: forgeRadius.pill,
  background: game.Line,
  outline: 'none',
});

const thumb = {
  appearance: 'none',
  WebkitAppearance: 'none',
  width: 18,
  height: 18,
  borderRadius: forgeRadius.round,
  border: 0,
  background: game.Accent,
  cursor: 'pointer',
} as const;

globalStyle(`${Range}::-webkit-slider-thumb`, thumb);
globalStyle(`${Range}::-moz-range-thumb`, thumb);

export const RowActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexShrink: 0,
});
