import { globalStyle, keyframes, style } from '@vanilla-extract/css';

/*
 * "Tentos": Truco and Fodinha drawn from above on graphite, with thin rings instead of felt.
 * Same palette as the poker bar: neutral outlined controls, one sober gold for the main
 * action, the turn and what just happened.
 */
const GOLD = '#d8b872';
const GOLD_TEXT = '#1a150b';
const INK = '#ebe8e1';
const MUTED = '#8f8d87';
const LINE = '#2e3037';
const SURFACE = '#141518';
const RAISED = '#1b1c20';
const CARD = '#f5f1e8';
const RED = '#a3352b';
const SERIF = "'Fraunces', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif";

export const Screen = style({
  position: 'relative',
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: SURFACE,
  color: INK,
  fontSize: 13,
});

export const Stage = style({ position: 'relative', flex: 1, minHeight: 320 });
/* The seats and the cards; on a phone it starts below the corners so the tentos stay clear. */
export const Felt = style({
  position: 'absolute',
  inset: 0,
  selectors: { '&[data-layout="portrait"]': { top: 92 } },
});

export const Rings = style({
  position: 'absolute',
  left: '50%',
  top: '47%',
  width: 'min(62vh, 70%)',
  aspectRatio: '1',
  transform: 'translate(-50%, -50%)',
  borderRadius: '50%',
  border: `1px solid ${LINE}`,
  pointerEvents: 'none',
  '::after': {
    content: '""',
    position: 'absolute',
    inset: '18%',
    borderRadius: '50%',
    border: `1px dashed ${LINE}`,
  },
});

export const Corner = style({
  position: 'absolute',
  top: 14,
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  zIndex: 3,
  selectors: { '&[data-side="left"]': { left: 14 }, '&[data-side="right"]': { right: 14 } },
});
export const TableName = style({ color: MUTED, fontSize: 12, marginTop: 6, maxWidth: 180 });

export const Pill = style({
  height: 34,
  padding: '0 14px',
  borderRadius: 999,
  border: `1px solid #4b4b52`,
  background: RAISED,
  color: INK,
  font: 'inherit',
  fontSize: 13,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  selectors: {
    '&:hover:not(:disabled)': { borderColor: '#6a6a72' },
    '&:disabled': { opacity: 0.4, cursor: 'default' },
    '&:focus-visible': { outline: `2px solid ${GOLD}`, outlineOffset: 2 },
    '&[data-primary="true"]': {
      background: GOLD,
      borderColor: GOLD,
      color: GOLD_TEXT,
      fontWeight: 600,
    },
    '&[aria-pressed="true"]': { borderColor: GOLD, color: GOLD },
  },
});

/* Tentos: twelve sticks per pair, lit in gold for us. */
export const Tally = style({ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 });
export const TallyRow = style({ display: 'flex', alignItems: 'center', gap: 8 });
export const TallyLabel = style({ width: 36, color: MUTED, fontSize: 11 });
export const Sticks = style({ display: 'flex', gap: 3 });
export const Stick = style({
  width: 3,
  height: 18,
  borderRadius: 1,
  background: '#33343a',
  selectors: {
    '&:nth-child(3n)': { marginRight: 3 },
    '&[data-on="true"]': { background: '#9a958a' },
    '&[data-on="true"][data-ours="true"]': { background: GOLD },
  },
});
export const TallyScore = style({ fontFamily: SERIF, fontSize: 15, minWidth: 18 });

export const Center = style({
  position: 'absolute',
  left: '50%',
  top: '47%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  textAlign: 'center',
  zIndex: 1,
  maxWidth: 220,
});
export const CenterTitle = style({ fontFamily: SERIF, fontSize: 15, color: GOLD });
export const CenterLine = style({ color: MUTED, fontSize: 12 });
export const Callout = style({
  marginTop: 4,
  padding: '4px 12px',
  borderRadius: 999,
  border: `1px solid ${GOLD}`,
  color: GOLD,
  fontFamily: SERIF,
  fontSize: 14,
  selectors: { '&[data-quiet="true"]': { borderColor: LINE, color: INK, fontSize: 13 } },
});
// Truco's three tricks: gold for us, a muted red for them, outlined while still open.
export const Marks = style({ display: 'flex', gap: 6, marginTop: 2 });
export const Mark = style({
  minWidth: 26,
  padding: '1px 6px',
  borderRadius: 999,
  border: `1px solid ${LINE}`,
  color: MUTED,
  fontSize: 11,
  selectors: {
    '&[data-mark="us"]': { background: GOLD, borderColor: GOLD, color: GOLD_TEXT },
    '&[data-mark="them"]': { background: '#6b3a35', borderColor: '#6b3a35', color: INK },
    '&[data-mark="tie"]': { borderColor: MUTED, color: INK },
  },
});

export const Card = style({
  position: 'relative',
  width: 'var(--card-w, 46px)',
  height: 'calc(var(--card-w, 46px) * 1.4)',
  borderRadius: 6,
  background: CARD,
  color: '#1b1b1d',
  fontFamily: SERIF,
  boxSizing: 'border-box',
  padding: '4px 5px',
  lineHeight: 1,
  fontSize: 'calc(var(--card-w, 46px) * 0.34)',
  flexShrink: 0,
  transition: 'transform 120ms ease, opacity 120ms ease',
  selectors: {
    '&[data-red="true"]': { color: RED },
    '&[data-back="true"]': {
      background: '#24252a',
      border: `1px solid #6d5c36`,
      backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 5px, #2c2d33 5px 6px)',
    },
    '&[data-win="true"]': { outline: `2px solid ${GOLD}`, outlineOffset: 2 },
    '&[data-dim="true"]': { opacity: 0.6 },
  },
});
export const CardSuit = style({ display: 'block', fontSize: '0.8em', marginTop: 2 });
export const CardBig = style({
  position: 'absolute',
  right: '12%',
  bottom: '8%',
  fontSize: '1.35em',
});

export const Placed = style({
  position: 'absolute',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  zIndex: 2,
  animationName: keyframes({
    from: { opacity: 0, transform: 'translate(-50%, -40%) scale(0.92)' },
    to: { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
  }),
  animationDuration: '180ms',
  animationTimingFunction: 'ease-out',
});
export const PlacedName = style({
  maxWidth: 90,
  padding: '1px 7px',
  borderRadius: 999,
  background: RAISED,
  border: `1px solid ${LINE}`,
  color: INK,
  fontSize: 11,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  selectors: {
    '&[data-latest="true"]': { borderColor: GOLD },
    '&[data-win="true"]': { background: GOLD, borderColor: GOLD, color: GOLD_TEXT },
  },
});

export const Seat = style({
  position: 'absolute',
  transform: 'translate(-50%, -50%)',
  width: 120,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 3,
  textAlign: 'center',
  zIndex: 2,
  selectors: { '&[data-out="true"]': { opacity: 0.4 } },
});
export const Avatar = style({
  position: 'relative',
  width: 42,
  height: 42,
  borderRadius: '50%',
  background: '#2a2b30',
  border: `1.5px solid #3c3d43`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#cfc8b8',
  fontSize: 13,
  selectors: {
    '&[data-turn="true"]': { borderColor: GOLD },
    '&[data-empty="true"]': {
      borderStyle: 'dashed',
      borderColor: '#55555c',
      background: 'transparent',
    },
  },
});
export const AvatarImage = style({
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  objectFit: 'cover',
});
const countdown = keyframes({
  from: { strokeDashoffset: 0 },
  to: { strokeDashoffset: 'var(--ring-length)' },
});
export const Ring = style({
  position: 'absolute',
  inset: -5,
  width: 52,
  height: 52,
  transform: 'rotate(-90deg)',
  pointerEvents: 'none',
});
export const RingFill = style({
  fill: 'none',
  stroke: GOLD,
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeDasharray: 'var(--ring-length)',
  animationName: countdown,
  animationTimingFunction: 'linear',
  animationFillMode: 'both',
});
export const SeatName = style({
  maxWidth: 120,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
export const SeatSub = style({
  color: MUTED,
  fontSize: 11,
  selectors: { '&[data-tone="gold"]': { color: GOLD } },
});
export const Lives = style({ display: 'flex', gap: 3 });
export const Life = style({
  width: 3,
  height: 12,
  borderRadius: 1,
  background: GOLD,
  selectors: { '&[data-lost="true"]': { background: '#3a3b41' } },
});
export const SeatCards = style({ display: 'flex', gap: 2, vars: { '--card-w': '24px' } });
export const Count = style({ color: MUTED, fontSize: 11, alignSelf: 'center', marginLeft: 3 });

export const Bar = style({
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: '12px 18px 16px',
  borderTop: `1px solid ${LINE}`,
  background: '#0f1013',
  '@media': { 'screen and (max-width: 640px)': { padding: '10px 12px 12px' } },
});
export const Status = style({
  color: MUTED,
  minHeight: 18,
  selectors: { '&[data-mine="true"]': { color: GOLD } },
});
export const BarRow = style({
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
});
export const Hand = style({
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  vars: { '--card-w': '58px' },
  selectors: { '&[data-many="true"]': { gap: 4, vars: { '--card-w': '44px' } } },
});
export const HandButton = style({
  padding: 0,
  border: 'none',
  background: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  transition: 'transform 120ms ease',
  selectors: {
    '&:hover:not(:disabled)': { transform: 'translateY(-6px)' },
    '&:disabled': { cursor: 'default' },
    '&:focus-visible': { outline: `2px solid ${GOLD}`, outlineOffset: 3 },
  },
});
export const Actions = style({ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' });

/* The sheet over the table: seats, bots and invitations. */
export const Scrim = style({
  position: 'absolute',
  inset: 0,
  zIndex: 10,
  background: '#0b0c0ecc',
  display: 'flex',
  justifyContent: 'flex-end',
});
export const Sheet = style({
  width: 'min(360px, 100%)',
  height: '100%',
  boxSizing: 'border-box',
  overflowY: 'auto',
  padding: 18,
  background: RAISED,
  borderLeft: `1px solid ${LINE}`,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
});
export const SheetHead = style({ display: 'flex', alignItems: 'flex-start', gap: 8 });
export const SheetTitle = style({ fontFamily: SERIF, fontSize: 19, margin: 0, fontWeight: 500 });
export const SectionLabel = style({ color: MUTED, fontSize: 12, margin: '4px 0 0' });
export const SeatRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minHeight: 38,
  padding: '4px 8px',
  borderRadius: 8,
  selectors: { '&[data-empty="true"]': { border: `1px dashed #3d3e45` } },
});
export const SmallAvatar = style([Avatar, { width: 28, height: 28, fontSize: 11 }]);
export const Grow = style({ flex: 1, minWidth: 0 });
export const Muted = style({ color: MUTED, fontSize: 12, lineHeight: 1.5 });
export const ErrorText = style({ color: '#e7a69c', fontSize: 12 });

/* Lobby. */
export const Lobby = style({
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  background: SURFACE,
  color: INK,
});
export const LobbyInner = style({
  maxWidth: 760,
  margin: '0 auto',
  padding: '24px 16px 48px',
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
});
export const LobbyHead = style({ display: 'flex', alignItems: 'center', gap: 12 });
export const LobbyTitle = style({ fontFamily: SERIF, fontSize: 26, fontWeight: 500, margin: 0 });
export const List = style({
  display: 'flex',
  flexDirection: 'column',
  border: `1px solid ${LINE}`,
  borderRadius: 12,
  overflow: 'hidden',
});
export const ListRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  background: 'none',
  border: 'none',
  borderTop: `1px solid ${LINE}`,
  color: INK,
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  selectors: {
    '&:first-child': { borderTop: 'none' },
    '&:hover': { background: RAISED },
    '&:focus-visible': { outline: `2px solid ${GOLD}`, outlineOffset: -2 },
  },
});
export const Tag = style({
  padding: '2px 8px',
  borderRadius: 999,
  border: `1px solid ${GOLD}`,
  color: GOLD,
  fontSize: 11,
});
export const Form = style({ display: 'flex', flexDirection: 'column', gap: 12 });
export const Field = style({ display: 'flex', flexDirection: 'column', gap: 6, color: MUTED });
export const Input = style({
  height: 38,
  padding: '0 12px',
  borderRadius: 8,
  border: `1px solid #3d3e45`,
  background: SURFACE,
  color: INK,
  font: 'inherit',
  selectors: { '&:focus-visible': { outline: `2px solid ${GOLD}`, outlineOffset: 1 } },
});
export const Choices = style({ display: 'flex', gap: 6, flexWrap: 'wrap' });

globalStyle(`${Sheet} details summary`, { cursor: 'pointer', color: MUTED });
