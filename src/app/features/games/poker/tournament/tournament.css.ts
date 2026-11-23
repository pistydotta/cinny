import { style } from '@vanilla-extract/css';
import { game } from '../../ui/gameTheme.css';
import { tint } from '../../ui/tint';
import { forgeRadius } from '../../../forge-theme/tokens';

// The same stage colours as the action bar (controls/actionBar.css.ts): ember for a choice.
const ACCENT = game.Accent;
const ACCENT_SOFT = tint(game.Accent, 14);
const ACCENT_RING = tint(game.Accent, 50);
const INK = game.Ink;
const MUTED = game.Muted;
const LINE = game.Line;
const GOOD = '#6fcf97';
const WARN = '#e6b450';
const BAD = '#eb6f6f';
const MOBILE = 'screen and (max-width: 760px)';

export const InfoBar = style({
  flexShrink: 0,
  display: 'flex',
  alignItems: 'stretch',
  gap: 4,
  padding: '6px 12px',
  overflowX: 'auto',
  borderBottom: `1px solid ${LINE}`,
  background: 'rgba(8, 10, 14, 0.7)',
  color: INK,
  scrollbarWidth: 'none',
});

export const InfoItem = style({
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  minWidth: 84,
  padding: '2px 10px',
  borderRight: `1px solid ${LINE}`,
  lineHeight: 1.25,
  selectors: { '&:last-of-type': { borderRight: 'none' } },
  '@media': { [MOBILE]: { minWidth: 72, padding: '2px 8px' } },
});

export const InfoLabel = style({
  fontSize: 10.5,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: MUTED,
  whiteSpace: 'nowrap',
});

export const InfoValue = style({
  fontSize: 14,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
  selectors: { '&[data-accent="true"]': { color: game.Money } },
});

export const InfoSub = style({
  fontSize: 11,
  color: MUTED,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
});

export const InfoButton = style({
  flex: '0 0 auto',
  alignSelf: 'center',
  height: 30,
  padding: '0 12px',
  borderRadius: 8,
  border: `1px solid ${LINE}`,
  background: 'transparent',
  color: INK,
  fontSize: 12,
  fontWeight: 600,
  textAlign: 'center',
  cursor: 'pointer',
  selectors: {
    '&:hover': { borderColor: ACCENT_RING },
    '&[aria-pressed="true"]': { background: ACCENT_SOFT, borderColor: ACCENT_RING, color: ACCENT },
    '&:focus-visible': { outline: `2px solid ${ACCENT}`, outlineOffset: 2 },
  },
});

export const DetailsSection = style({
  marginTop: 10,
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: MUTED,
});

export const DetailsRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  fontVariantNumeric: 'tabular-nums',
  selectors: {
    '&[data-me="true"]': { color: ACCENT, fontWeight: 700 },
    '&[data-dim="true"]': { opacity: 0.55 },
  },
});

/* ---------- Coach ---------- */

export const Coach = style({
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '10px max(18px, calc((100% - 1040px) / 2))',
  borderTop: `1px solid ${LINE}`,
  background: 'rgba(12, 14, 19, 0.92)',
  color: INK,
  maxHeight: '34%',
  overflowY: 'auto',
  '@media': { [MOBILE]: { padding: '8px 12px', gap: 6 } },
});

export const CoachHead = style({
  display: 'flex',
  alignItems: 'baseline',
  flexWrap: 'wrap',
  gap: '2px 10px',
});

export const CoachTag = style({
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: ACCENT,
});

export const CoachAction = style({ fontSize: 15, fontWeight: 700 });

export const CoachReason = style({ flex: '1 1 240px', fontSize: 12.5, color: '#bdb9ae' });

export const CoachToggle = style({
  marginLeft: 'auto',
  padding: '2px 8px',
  border: 'none',
  borderRadius: 6,
  background: 'transparent',
  color: MUTED,
  fontSize: 12,
  textAlign: 'center',
  cursor: 'pointer',
  selectors: {
    '&:hover': { color: INK },
    '&:focus-visible': { outline: `2px solid ${ACCENT}`, outlineOffset: 2 },
  },
});

export const Metrics = style({ display: 'flex', flexWrap: 'wrap', gap: 6 });

export const Metric = style({
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: 5,
  padding: '3px 8px',
  borderRadius: forgeRadius.control,
  background: 'rgba(255, 255, 255, 0.05)',
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
});

export const MetricLabel = style({ color: MUTED });

export const Sizes = style({ display: 'flex', flexWrap: 'wrap', gap: 6 });

export const Size = style({
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  minWidth: 78,
  padding: '5px 10px',
  borderRadius: 9,
  border: `1px solid ${LINE}`,
  background: 'rgba(255, 255, 255, 0.03)',
  color: INK,
  textAlign: 'center',
  lineHeight: 1.2,
  cursor: 'pointer',
  selectors: {
    '&:hover:not(:disabled)': { borderColor: ACCENT_RING },
    '&[data-recommended="true"]': { background: ACCENT_SOFT, borderColor: ACCENT_RING },
    '&:disabled': { opacity: 0.5, cursor: 'default' },
    '&:focus-visible': { outline: `2px solid ${ACCENT}`, outlineOffset: 2 },
  },
});

export const SizeAmount = style({
  fontSize: 13,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
});
export const SizePurpose = style({ fontSize: 10.5, color: MUTED });

export const Decisions = style({ display: 'flex', flexDirection: 'column', gap: 5 });

export const Decision = style({
  display: 'grid',
  gridTemplateColumns: '62px minmax(110px, auto) 1fr',
  alignItems: 'baseline',
  gap: '0 10px',
  fontSize: 12.5,
  '@media': { [MOBILE]: { gridTemplateColumns: '54px 1fr' } },
});

export const DecisionStreet = style({ color: MUTED });
export const DecisionAction = style({ fontWeight: 600, fontVariantNumeric: 'tabular-nums' });

export const DecisionVerdict = style({
  '@media': { [MOBILE]: { gridColumn: '1 / -1' } },
  selectors: {
    '&[data-kind="good"]': { color: GOOD },
    '&[data-kind="warn"]': { color: WARN },
    '&[data-kind="bad"]': { color: BAD },
  },
});

export const DecisionNote = style({ color: MUTED });

/* ---------- Dialogs ---------- */

export const WideDialog = style({
  width: 'min(560px, 100%)',
  maxHeight: '100%',
  overflowY: 'auto',
});

export const Place = style({
  fontSize: 34,
  fontWeight: 800,
  lineHeight: 1.1,
  color: ACCENT,
  fontVariantNumeric: 'tabular-nums',
});

export const StatGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: '6px 16px',
  fontSize: 13,
  fontVariantNumeric: 'tabular-nums',
});

export const StatValue = style({ fontWeight: 700, textAlign: 'right' });

export const Heading = style({
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: MUTED,
});

export const Costly = style({ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 });

export const CostlyRow = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '8px 10px',
  borderRadius: 10,
  background: 'rgba(255, 255, 255, 0.04)',
});

export const CostlyHead = style({
  display: 'flex',
  justifyContent: 'space-between',
  gap: 10,
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
});

export const CostlyLoss = style({ color: BAD, whiteSpace: 'nowrap' });

export const Entrants = style({ display: 'flex', flexWrap: 'wrap', gap: 6 });

export const Entrant = style({
  padding: '4px 10px',
  borderRadius: forgeRadius.control,
  background: 'rgba(255, 255, 255, 0.06)',
  fontSize: 12.5,
});
