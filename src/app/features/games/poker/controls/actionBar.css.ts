import { globalStyle, keyframes, style } from '@vanilla-extract/css';

/* A quiet graphite bar: neutral controls, one soft gold for the main action and selections. */
const GOLD = '#d8b872';
const GOLD_TEXT = '#1a150b';
const INK = '#ebe8e1';
const MUTED = '#8f8d87';
const LINE = '#2a2e37';
const SURFACE = '#0f1115';

export const Bar = style({
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: '14px 18px 16px',
  borderTop: `1px solid ${LINE}`,
  background: SURFACE,
  color: INK,
  maxHeight: '52%',
  overflowY: 'auto',
  '@media': { 'screen and (max-width: 760px)': { padding: '10px 12px 12px', gap: 10 } },
});

export const Top = style({ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 });
export const Who = style({ flex: 1, minWidth: 0, lineHeight: 1.3 });
export const Name = style({
  fontSize: 14,
  fontWeight: 600,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  selectors: {
    '&[data-tone="win"]': { color: GOLD },
    '&[data-tone="lose"]': { color: MUTED },
  },
});
export const Sub = style({ fontSize: 12, color: MUTED, fontVariantNumeric: 'tabular-nums' });

const countdown = keyframes({
  from: { strokeDashoffset: 0 },
  to: { strokeDashoffset: 'var(--ring-length)' },
});

export const Avatar = style({
  position: 'relative',
  width: 44,
  height: 44,
  flexShrink: 0,
  vars: { '--avatar': '44px' },
});
export const Ring = style({
  position: 'absolute',
  inset: -4,
  width: 52,
  height: 52,
  transform: 'rotate(-90deg)',
  pointerEvents: 'none',
});
export const RingTrack = style({ fill: 'none', stroke: LINE, strokeWidth: 4 });
export const RingFill = style({
  fill: 'none',
  stroke: GOLD,
  strokeWidth: 4,
  strokeLinecap: 'round',
  strokeDasharray: 'var(--ring-length)',
  animationName: countdown,
  animationTimingFunction: 'linear',
  animationFillMode: 'both',
});

export const Hand = style({ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 });
export const Cards = style({ display: 'flex', gap: 3, vars: { '--card-w': '30px' } });
export const HandText = style({ fontSize: 12, lineHeight: 1.35 });
export const Link = style({
  display: 'block',
  padding: 0,
  border: 'none',
  background: 'none',
  color: MUTED,
  fontSize: 12,
  textDecoration: 'underline',
  textUnderlineOffset: 3,
  cursor: 'pointer',
  selectors: { '&:hover': { color: INK } },
});

export const Divider = style({ height: 1, background: '#1f232b', flexShrink: 0 });

export const Row = style({ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' });
export const RowLabel = style({ flex: 1, fontSize: 12, color: MUTED, whiteSpace: 'nowrap' });

export const Preset = style({
  height: 26,
  padding: '0 10px',
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  color: '#b0ada5',
  fontSize: 12,
  cursor: 'pointer',
  selectors: {
    '&:hover:not(:disabled)': { color: INK, background: 'rgba(255,255,255,0.05)' },
    '&[aria-pressed="true"]': { background: GOLD, color: GOLD_TEXT },
    '&:disabled': { opacity: 0.4, cursor: 'default' },
  },
});

export const Slider = style({
  flex: '1 1 120px',
  minWidth: 100,
  margin: '0 6px',
  appearance: 'none',
  WebkitAppearance: 'none',
  height: 2,
  borderRadius: 1,
  outline: 'none',
  background: `linear-gradient(${GOLD}, ${GOLD}) 0 / var(--fill, 0%) 100% no-repeat, ${LINE}`,
});
const thumb = {
  appearance: 'none',
  WebkitAppearance: 'none',
  width: 16,
  height: 16,
  borderRadius: '50%',
  border: 'none',
  background: INK,
  cursor: 'pointer',
} as const;
globalStyle(`${Slider}::-webkit-slider-thumb`, thumb);
globalStyle(`${Slider}::-moz-range-thumb`, thumb);

export const Amount = style({
  display: 'flex',
  alignItems: 'center',
  height: 32,
  border: `1px solid ${LINE}`,
  borderRadius: 6,
  overflow: 'hidden',
});
export const AmountInput = style({
  width: 76,
  height: '100%',
  border: 'none',
  background: 'transparent',
  color: INK,
  fontSize: 14,
  fontWeight: 600,
  textAlign: 'right',
  padding: '0 8px',
  fontVariantNumeric: 'tabular-nums',
  outline: 'none',
});
export const Units = style({ display: 'flex', height: '100%', borderLeft: `1px solid ${LINE}` });
export const Unit = style({
  padding: '0 8px',
  border: 'none',
  background: 'transparent',
  color: '#5f5e59',
  fontSize: 11,
  cursor: 'pointer',
  selectors: {
    '&[aria-pressed="true"]': { color: INK, background: 'rgba(255,255,255,0.06)' },
    '&:hover': { color: INK },
  },
});

export const Buttons = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1.3fr',
  gap: 8,
});
const button = style({
  height: 44,
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: 0.2,
  cursor: 'pointer',
  fontVariantNumeric: 'tabular-nums',
  transition: 'background 120ms, border-color 120ms, opacity 120ms',
  selectors: {
    '&:disabled': { opacity: 0.4, cursor: 'default' },
  },
});
export const Neutral = style([
  button,
  {
    border: `1px solid ${LINE}`,
    background: 'transparent',
    color: INK,
    selectors: { '&:hover:not(:disabled)': { borderColor: '#3b404b', background: '#151820' } },
  },
]);
export const Fold = style([Neutral, { color: '#bdb8ad' }]);
export const Primary = style([
  button,
  {
    border: 'none',
    background: GOLD,
    color: GOLD_TEXT,
    selectors: { '&:hover:not(:disabled)': { background: '#e2c483' } },
  },
]);

export const Chip = style({
  height: 30,
  padding: '0 12px',
  borderRadius: 6,
  border: `1px solid ${LINE}`,
  background: 'transparent',
  color: '#cfc9bb',
  fontSize: 12,
  cursor: 'pointer',
  selectors: {
    '&:hover:not(:disabled)': { borderColor: '#3b404b' },
    '&[aria-pressed="true"]': { borderColor: GOLD, color: '#ead19a' },
    '&:disabled': { opacity: 0.4, cursor: 'default' },
  },
});
export const Separator = style({ width: 1, height: 20, background: LINE });
export const Danger = style({
  height: 30,
  padding: '0 8px',
  border: 'none',
  background: 'transparent',
  color: '#c98078',
  fontSize: 12,
  cursor: 'pointer',
  selectors: { '&:hover:not(:disabled)': { color: '#e39a91' }, '&:disabled': { opacity: 0.4 } },
});
export const Hint = style({ flexBasis: '100%', fontSize: 11, color: MUTED, lineHeight: 1.5 });
