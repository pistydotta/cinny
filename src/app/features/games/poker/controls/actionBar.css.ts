import { globalStyle, keyframes, style } from '@vanilla-extract/css';

/*
 * A quiet casino rail under the felt: graphite surfaces, a felt green for check/call and one
 * soft gold for the main action and selections. Every control row shares the bar's padding and
 * one control height, so the header, the sizing row and the buttons line up.
 *
 * The app's reset (src/index.css) gives every button `padding: 0` and `text-align: inherit`, so
 * each button here sets its own padding and centres its content.
 */
const GOLD = '#d8b872';
const GOLD_TEXT = '#1a150b';
const GOLD_SOFT = 'rgba(216, 184, 114, 0.14)';
const GOLD_RING = 'rgba(216, 184, 114, 0.5)';
const INK = '#ebe8e1';
const MUTED = '#8f8d87';
const LINE = '#2a2e37';
const RAIL = 'rgba(0, 0, 0, 0.28)';
const SURFACE = '#0f1115';
const CONTROL = 36;
const RADIUS = 10;
const MOBILE = 'screen and (max-width: 760px)';
// On a computer the sizing row and the buttons form one compact block on the right, under the
// hand, like a poker client's action panel; stretched across the bar they became huge.
const CONTROLS_WIDTH = 640;
const controlsBlock = {
  width: '100%',
  maxWidth: CONTROLS_WIDTH,
  marginLeft: 'auto',
  boxSizing: 'border-box',
} as const;

const focusRing = {
  '&:focus-visible': { outline: `2px solid ${GOLD}`, outlineOffset: 2 },
} as const;

export const Bar = style({
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  // Wide screens keep the controls in a centred column instead of stretching edge to edge.
  padding: '14px max(18px, calc((100% - 1040px) / 2)) 16px',
  borderTop: `1px solid ${LINE}`,
  boxShadow: 'inset 0 1px 0 rgba(216, 184, 114, 0.12)',
  background: `linear-gradient(180deg, #14161c 0%, ${SURFACE} 60%)`,
  color: INK,
  maxHeight: '52%',
  overflowY: 'auto',
  '@media': { [MOBILE]: { padding: '10px 12px 12px', gap: 10 } },
});

export const Top = style({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  minWidth: 0,
  '@media': { [MOBILE]: { flexWrap: 'wrap', rowGap: 8 } },
});
export const Who = style({ flex: '1 1 140px', minWidth: 0, lineHeight: 1.3 });
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
export const Sub = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 6,
  marginTop: 2,
  fontSize: 12,
  color: MUTED,
  fontVariantNumeric: 'tabular-nums',
});
export const Timer = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  height: 18,
  padding: '0 6px 0 4px',
  borderRadius: 999,
  background: 'rgba(255, 255, 255, 0.05)',
  color: '#cfc9bb',
  fontWeight: 600,
  selectors: {
    '&[data-urgent="true"]': { color: '#f0a198', background: 'rgba(201, 128, 120, 0.14)' },
  },
});

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

export const Hand = style({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexShrink: 0,
  minWidth: 0,
});
export const Cards = style({ display: 'flex', gap: 3, vars: { '--card-w': '30px' } });
export const HandText = style({ fontSize: 12, lineHeight: 1.35, minWidth: 0 });
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
  selectors: { '&:hover': { color: INK }, ...focusRing },
});

export const Divider = style({ height: 1, background: '#1f232b', flexShrink: 0 });

export const Row = style({ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' });
export const RowLabel = style({ flex: 1, fontSize: 12, color: MUTED, whiteSpace: 'nowrap' });

/* Raise sizing: presets | slider | amount, on one centre line. On a phone the presets take
   their own row and the slider and amount share the next. */
export const Sizing = style({
  ...controlsBlock,
  display: 'grid',
  gridTemplateColumns: 'auto minmax(110px, 1fr) auto',
  gridTemplateAreas: '"presets slider amount"',
  alignItems: 'center',
  columnGap: 16,
  rowGap: 10,
  '@media': {
    [MOBILE]: {
      gridTemplateColumns: 'minmax(0, 1fr) auto',
      gridTemplateAreas: '"presets presets" "slider amount"',
      columnGap: 12,
      maxWidth: 'none',
    },
  },
});

/* A recessed rail holding a group of segments: presets and the Chips / BB switch. */
const rail = style({
  display: 'flex',
  alignItems: 'stretch',
  gap: 2,
  height: CONTROL,
  padding: 3,
  borderRadius: RADIUS,
  border: `1px solid ${LINE}`,
  background: RAIL,
  boxSizing: 'border-box',
});
const segment = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 0,
  padding: '0 10px',
  borderRadius: RADIUS - 3,
  color: '#b0ada5',
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
  cursor: 'pointer',
  transition: 'background 120ms, color 120ms, box-shadow 120ms',
  selectors: {
    '&:hover:not(:disabled)': { color: INK, background: 'rgba(255, 255, 255, 0.05)' },
    '&[aria-pressed="true"]': {
      color: GOLD,
      background: GOLD_SOFT,
      boxShadow: `inset 0 0 0 1px ${GOLD_RING}`,
    },
    '&:disabled': { opacity: 0.4, cursor: 'default' },
    ...focusRing,
  },
});

export const Presets = style([
  rail,
  { gridArea: 'presets', '@media': { [MOBILE]: { width: '100%' } } },
]);
export const Preset = style([segment, { '@media': { [MOBILE]: { flex: 1, padding: '0 4px' } } }]);

export const Slider = style({
  gridArea: 'slider',
  width: '100%',
  minWidth: 0,
  margin: 0,
  appearance: 'none',
  WebkitAppearance: 'none',
  height: 6,
  borderRadius: 3,
  outline: 'none',
  cursor: 'pointer',
  background: `linear-gradient(${GOLD}, ${GOLD}) 0 / var(--fill, 0%) 100% no-repeat, ${LINE}`,
  selectors: { '&:disabled': { opacity: 0.4, cursor: 'default' } },
});
// A chip-like thumb: gold face with a dark edge.
const thumb = {
  appearance: 'none',
  WebkitAppearance: 'none',
  width: 20,
  height: 20,
  borderRadius: '50%',
  border: `3px solid ${SURFACE}`,
  background: GOLD,
  boxShadow: `0 0 0 1px ${GOLD_RING}, 0 1px 3px rgba(0, 0, 0, 0.6)`,
  cursor: 'pointer',
} as const;
globalStyle(`${Slider}::-webkit-slider-thumb`, thumb);
globalStyle(`${Slider}::-moz-range-thumb`, thumb);
globalStyle(`${Slider}:focus-visible::-webkit-slider-thumb`, { outline: `2px solid ${GOLD}` });
globalStyle(`${Slider}:focus-visible::-moz-range-thumb`, { outline: `2px solid ${GOLD}` });

/* The bet total with its unit switch inside the same field. */
export const Amount = style([
  rail,
  {
    gridArea: 'amount',
    padding: '3px 3px 3px 0',
    selectors: { '&:focus-within': { borderColor: '#4a4f5b' } },
  },
]);
export const AmountInput = style({
  width: 84,
  height: '100%',
  border: 'none',
  background: 'transparent',
  color: INK,
  fontSize: 15,
  fontWeight: 600,
  textAlign: 'right',
  padding: '0 10px',
  fontVariantNumeric: 'tabular-nums',
  outline: 'none',
  MozAppearance: 'textfield',
  '@media': { [MOBILE]: { width: 68 } },
});
globalStyle(
  `${AmountInput}::-webkit-outer-spin-button, ${AmountInput}::-webkit-inner-spin-button`,
  { WebkitAppearance: 'none', margin: 0 }
);

/* Chips / BB: a segmented switch, standalone in the header or inside the amount field. */
export const Units = style([rail, { flexShrink: 0 }]);
export const UnitsInline = style({ display: 'flex', alignItems: 'stretch', gap: 2 });
export const Unit = style([segment, { padding: '0 9px', fontSize: 11, letterSpacing: 0.2 }]);

/* Fold, check/call and raise: equal columns, centred icon and label. */
export const Buttons = style({
  ...controlsBlock,
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 10,
  // On a phone "Raise to 1.250" needs more room than "Fold".
  '@media': {
    [MOBILE]: {
      gridTemplateColumns: 'minmax(0, 0.85fr) minmax(0, 1fr) minmax(0, 1.25fr)',
      gap: 6,
      maxWidth: 'none',
    },
  },
});
const button = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  minWidth: 0,
  height: 44,
  padding: '0 14px',
  borderRadius: RADIUS,
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: 0.2,
  textAlign: 'center',
  cursor: 'pointer',
  fontVariantNumeric: 'tabular-nums',
  transition: 'background 120ms, border-color 120ms, opacity 120ms, transform 80ms',
  selectors: {
    '&:active:not(:disabled)': { transform: 'translateY(1px)' },
    '&:disabled': { opacity: 0.4, cursor: 'default' },
    ...focusRing,
  },
  '@media': { [MOBILE]: { height: 46, padding: '0 8px', gap: 6, fontSize: 13 } },
});
export const ButtonLabel = style({
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  '@media': { [MOBILE]: { whiteSpace: 'normal', lineHeight: 1.15 } },
});
export const ButtonIcon = style({ flexShrink: 0, opacity: 0.9 });

export const Fold = style([
  button,
  {
    border: '1px solid #3a2c2e',
    background: '#16171c',
    color: '#e0cdc9',
    selectors: {
      '&:hover:not(:disabled)': { borderColor: '#5c3b3a', background: '#1f191b' },
    },
  },
]);
globalStyle(`${Fold} ${ButtonIcon}`, { color: '#d48a80' });
export const Neutral = style([
  button,
  {
    border: '1px solid #2d6e50',
    background: 'linear-gradient(180deg, #1e5a40 0%, #174631 100%)',
    color: '#eef5ef',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    selectors: {
      '&:hover:not(:disabled)': {
        borderColor: '#3b8a64',
        background: 'linear-gradient(180deg, #236749 0%, #1a5038 100%)',
      },
    },
  },
]);
export const Primary = style([
  button,
  {
    border: '1px solid #e6cd93',
    background: `linear-gradient(180deg, #e4c582 0%, ${GOLD} 45%, #c39d55 100%)`,
    color: GOLD_TEXT,
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 1px 2px rgba(0, 0, 0, 0.4)',
    selectors: {
      '&:hover:not(:disabled)': {
        background: 'linear-gradient(180deg, #ecd092 0%, #e0c27f 45%, #caa660 100%)',
      },
    },
  },
]);

export const Chip = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 32,
  padding: '0 12px',
  borderRadius: 999,
  border: `1px solid ${LINE}`,
  background: 'transparent',
  color: '#cfc9bb',
  fontSize: 12,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  selectors: {
    '&:hover:not(:disabled)': { borderColor: '#3b404b' },
    '&[aria-pressed="true"]': { borderColor: GOLD_RING, background: GOLD_SOFT, color: '#ead19a' },
    '&:disabled': { opacity: 0.4, cursor: 'default' },
    ...focusRing,
  },
});
export const Separator = style({ width: 1, height: 20, background: LINE });
export const Danger = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 32,
  padding: '0 10px',
  borderRadius: 999,
  border: 'none',
  background: 'transparent',
  color: '#c98078',
  fontSize: 12,
  cursor: 'pointer',
  selectors: {
    '&:hover:not(:disabled)': { color: '#e39a91', background: 'rgba(201, 128, 120, 0.08)' },
    '&:disabled': { opacity: 0.4 },
    ...focusRing,
  },
});
export const Hint = style({ flexBasis: '100%', fontSize: 11, color: MUTED, lineHeight: 1.5 });
