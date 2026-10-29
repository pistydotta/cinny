import { keyframes, style } from '@vanilla-extract/css';

const GOLD = '#f5c84b';

const fadeIn = keyframes({
  from: { opacity: 0, transform: 'translateY(8px) scale(0.98)' },
  to: { opacity: 1, transform: 'none' },
});

export const Page = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
  color: '#fff',
  background: 'radial-gradient(ellipse at 50% 45%, #18263a 0%, #0d1522 45%, #070b12 100%)',
  fontFamily: 'InterVariable, Inter, system-ui, sans-serif',
});

export const TopBar = style({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '10px 16px',
  '@media': {
    'screen and (max-width: 600px)': { gap: 8, padding: '10px 12px' },
  },
  flexShrink: 0,
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(5,8,13,0.55)',
  backdropFilter: 'blur(6px)',
});

export const TopTitle = style({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  flexGrow: 1,
});

export const TitleText = style({
  fontSize: 16,
  fontWeight: 700,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const SubtitleText = style({
  fontSize: 12,
  color: 'rgba(255,255,255,0.55)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

/** Text next to an icon that is dropped on narrow screens. */
export const WideOnly = style({
  '@media': {
    'screen and (max-width: 600px)': { display: 'none' },
  },
});

export const IconButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 36,
  minWidth: 36,
  padding: '0 10px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.9)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  flexShrink: 0,
  selectors: {
    '&:hover': { background: 'rgba(255,255,255,0.10)' },
    '&[aria-pressed="true"]': { background: 'rgba(245,200,75,0.15)', borderColor: GOLD },
    '&:disabled': { opacity: 0.4, cursor: 'default' },
  },
});

export const WalletPill = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  height: 36,
  padding: '0 12px 0 6px',
  borderRadius: 9999,
  background: 'rgba(245,200,75,0.10)',
  border: '1px solid rgba(245,200,75,0.35)',
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: 'nowrap',
  flexShrink: 0,
});

export const Coin = style({
  width: 24,
  height: 24,
  borderRadius: '50%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(circle at 35% 30%, #fff1b8, #f5c84b 45%, #b8860b)',
  boxShadow: 'inset 0 0 0 2px rgba(120,80,0,0.35)',
  color: '#6b4500',
  fontSize: 12,
  fontWeight: 900,
  flexShrink: 0,
});

export const WalletValue = style({
  color: GOLD,
  fontVariantNumeric: 'tabular-nums',
});

export const WalletMuted = style({
  color: 'rgba(255,255,255,0.55)',
  fontWeight: 600,
  '@media': {
    'screen and (max-width: 600px)': { display: 'none' },
  },
});

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
  background: 'rgba(3,6,10,0.55)',
  backdropFilter: 'blur(3px)',
});

export const Dialog = style({
  width: 'min(440px, 100%)',
  maxHeight: '100%',
  overflowY: 'auto',
  padding: 24,
  borderRadius: 20,
  background: 'linear-gradient(180deg, #172131 0%, #0e1520 100%)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,200,75,0.10)',
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  animation: `${fadeIn} 280ms ease-out both`,
});

export const DialogTitle = style({
  fontSize: 22,
  fontWeight: 800,
  margin: 0,
});

export const DialogText = style({
  fontSize: 14,
  lineHeight: 1.5,
  color: 'rgba(255,255,255,0.7)',
  margin: 0,
});

export const Field = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

export const FieldHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  fontSize: 13,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.7)',
});

export const FieldValue = style({
  fontSize: 18,
  fontWeight: 800,
  color: GOLD,
  fontVariantNumeric: 'tabular-nums',
});

export const Range = style({
  width: '100%',
  accentColor: GOLD,
  cursor: 'pointer',
});

export const RangeLimits = style({
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 11,
  color: 'rgba(255,255,255,0.45)',
});

export const Segmented = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: 6,
});

export const SegmentButton = style({
  textAlign: 'center',
  height: 40,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  selectors: {
    '&[aria-pressed="true"]': {
      background: 'rgba(245,200,75,0.16)',
      borderColor: GOLD,
      color: GOLD,
    },
  },
});

export const InfoBox = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '12px 14px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.04)',
  fontSize: 13,
  color: 'rgba(255,255,255,0.7)',
});

export const InfoRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
});

export const PrimaryButton = style({
  textAlign: 'center',
  height: 48,
  borderRadius: 12,
  border: 'none',
  background: `linear-gradient(180deg, #ffd96a 0%, ${GOLD} 50%, #d9a520 100%)`,
  color: '#2a1d00',
  fontSize: 16,
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 6px 18px rgba(245,200,75,0.25), inset 0 1px 0 rgba(255,255,255,0.6)',
  selectors: {
    '&:hover': { filter: 'brightness(1.05)' },
    '&:disabled': { opacity: 0.45, cursor: 'default', filter: 'grayscale(0.5)' },
  },
});

export const SecondaryButton = style({
  textAlign: 'center',
  height: 44,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.05)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
});

export const ErrorText = style({
  fontSize: 13,
  color: '#ff8080',
  margin: 0,
});

export const Note = style({
  fontSize: 12,
  lineHeight: 1.5,
  color: 'rgba(255,255,255,0.45)',
  margin: 0,
});

/* ---------- Action bar ---------- */

export const ActionBar = style({
  flexShrink: 0,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 16,
  padding: '12px 16px 16px',
  borderTop: '1px solid rgba(255,255,255,0.06)',
  background: 'linear-gradient(180deg, rgba(8,12,18,0.7), rgba(5,8,12,0.95))',
  '@media': {
    'screen and (max-width: 760px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 10,
      padding: '10px 12px 12px',
    },
  },
});

export const HandInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minWidth: 0,
});

export const Status = style({
  fontSize: 15,
  fontWeight: 700,
  selectors: {
    '&[data-tone="turn"]': { color: GOLD },
    '&[data-tone="win"]': { color: '#7dffa8' },
    '&[data-tone="lose"]': { color: 'rgba(255,255,255,0.6)' },
  },
});

export const HandStrength = style({
  fontSize: 13,
  color: 'rgba(255,255,255,0.6)',
});

export const HandStrengthValue = style({
  color: '#fff',
  fontWeight: 700,
});

export const Controls = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  alignItems: 'stretch',
  width: 'min(560px, 100%)',
});

export const RaiseRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap',
});

export const Preset = style({
  textAlign: 'center',
  height: 30,
  padding: '0 10px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.85)',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: 'rgba(255,255,255,0.1)' },
  },
});

export const RaiseSlider = style({
  flexGrow: 1,
  minWidth: 120,
  accentColor: GOLD,
});

export const AmountInput = style({
  width: 92,
  height: 30,
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(0,0,0,0.35)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  textAlign: 'right',
  padding: '0 8px',
  fontVariantNumeric: 'tabular-nums',
});

export const Buttons = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1.25fr',
  gap: 8,
});

const actionButton = style({
  height: 52,
  borderRadius: 12,
  border: 'none',
  color: '#fff',
  fontSize: 15,
  fontWeight: 800,
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1.15,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 6px 14px rgba(0,0,0,0.35)',
  transition: 'transform 80ms, filter 150ms, opacity 150ms',
  selectors: {
    '&:hover:not(:disabled)': { filter: 'brightness(1.1)' },
    '&:active:not(:disabled)': { transform: 'translateY(1px)' },
    '&:disabled': { opacity: 0.35, cursor: 'default', boxShadow: 'none' },
  },
});

export const FoldButton = style([
  actionButton,
  { background: 'linear-gradient(180deg, #4a4f5a, #343841)' },
]);

export const CallButton = style([
  actionButton,
  { background: 'linear-gradient(180deg, #2c8ef0, #1b65c0)' },
]);

export const RaiseButton = style([
  actionButton,
  {
    background: `linear-gradient(180deg, #ffd96a, ${GOLD} 50%, #d9a520)`,
    color: '#2a1d00',
  },
]);

export const ButtonSub = style({
  fontSize: 12,
  fontWeight: 700,
  opacity: 0.85,
  fontVariantNumeric: 'tabular-nums',
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
  borderRadius: 14,
  background: 'rgba(8,12,18,0.94)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
  animation: `${fadeIn} 200ms ease-out both`,
});

export const DrawerHeader = style({
  padding: '12px 14px',
  fontSize: 14,
  fontWeight: 800,
  borderBottom: '1px solid rgba(255,255,255,0.06)',
});

export const DrawerList = style({
  flexGrow: 1,
  overflowY: 'auto',
  padding: '8px 14px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 12.5,
  color: 'rgba(255,255,255,0.75)',
});

export const DrawerHand = style({
  marginTop: 8,
  fontWeight: 800,
  color: GOLD,
});
