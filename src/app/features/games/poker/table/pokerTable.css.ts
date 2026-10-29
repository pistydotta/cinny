import { globalStyle, keyframes, style } from '@vanilla-extract/css';

/*
 * The table is drawn inside a size container, so every dimension uses container units (cqmin,
 * cqw, cqh) and the whole scene scales with the space available.
 */

const GOLD = '#f5c84b';

const dealIn = keyframes({
  '0%': {
    opacity: 0,
    transform: 'translate(var(--from-x), var(--from-y)) rotate(-25deg) scale(0.55)',
  },
  '20%': { opacity: 1 },
  '100%': { opacity: 1, transform: 'translate(0, 0) rotate(var(--rot, 0deg)) scale(1)' },
});

const flipIn = keyframes({
  '0%': { transform: 'rotateY(180deg)' },
  '100%': { transform: 'rotateY(0deg)' },
});

const chipsIn = keyframes({
  '0%': { opacity: 0, transform: 'translate(-50%, -50%) translate(var(--from-x), var(--from-y))' },
  '100%': { opacity: 1, transform: 'translate(-50%, -50%)' },
});

const potToWinner = keyframes({
  '0%': { opacity: 0, transform: 'translate(-50%, -50%) scale(0.8)' },
  '15%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
  '70%': { opacity: 1 },
  '100%': { opacity: 0, transform: 'translate(-50%, -50%) translate(var(--to-x), var(--to-y))' },
});

const floatUp = keyframes({
  '0%': { opacity: 0, transform: 'translate(-50%, 0) scale(0.7)' },
  '20%': { opacity: 1, transform: 'translate(-50%, -40%) scale(1.1)' },
  '35%': { transform: 'translate(-50%, -50%) scale(1)' },
  '85%': { opacity: 1 },
  '100%': { opacity: 0, transform: 'translate(-50%, -90%) scale(1)' },
});

const winnerGlow = keyframes({
  '0%, 100%': { boxShadow: `0 0 0 0.5cqmin ${GOLD}, 0 0 2cqmin 0.5cqmin rgba(245,200,75,0.55)` },
  '50%': { boxShadow: `0 0 0 0.5cqmin ${GOLD}, 0 0 4.5cqmin 1.4cqmin rgba(245,200,75,0.85)` },
});

const turnPulse = keyframes({
  '0%, 100%': { boxShadow: `0 0 0 0.45cqmin ${GOLD}, 0 0 1.5cqmin 0.2cqmin rgba(245,200,75,0.5)` },
  '50%': { boxShadow: `0 0 0 0.45cqmin ${GOLD}, 0 0 3.2cqmin 0.8cqmin rgba(245,200,75,0.75)` },
});

const turnTimer = keyframes({
  '0%': { strokeDashoffset: 0 },
  '100%': { strokeDashoffset: 'var(--ring-length)' },
});

const bannerIn = keyframes({
  '0%': { opacity: 0, transform: 'translate(-50%, -50%) translateY(1.5cqmin) scale(0.9)' },
  '100%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
});

export const Stage = style({
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 10',
  containerType: 'size',
  userSelect: 'none',
  fontFamily: 'InterVariable, Inter, system-ui, sans-serif',
  color: '#fff',
  selectors: {
    '&[data-layout="portrait"]': { aspectRatio: '10 / 16' },
  },
});

export const Rail = style({
  position: 'absolute',
  left: '7%',
  right: '7%',
  top: '15%',
  bottom: '19%',
  borderRadius: '9999px',
  background:
    'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.10), transparent 60%), linear-gradient(180deg, #4a2c1a 0%, #2c180d 55%, #1c0f08 100%)',
  boxShadow:
    '0 3cqmin 7cqmin rgba(0,0,0,0.65), inset 0 0.35cqmin 0.5cqmin rgba(255,255,255,0.18), inset 0 -0.6cqmin 1.2cqmin rgba(0,0,0,0.7)',
  selectors: {
    '[data-layout="portrait"] &': { left: '13%', right: '13%', top: '8%', bottom: '13%' },
  },
});

export const Felt = style({
  position: 'absolute',
  inset: '2.8cqmin',
  borderRadius: '9999px',
  overflow: 'hidden',
  background:
    'radial-gradient(ellipse at 50% 42%, #33a865 0%, #1f8048 38%, #135c33 72%, #0c4426 100%)',
  boxShadow: `inset 0 0 7cqmin rgba(0,0,0,0.6), 0 0 0 0.3cqmin rgba(200,162,74,0.55)`,
  '::before': {
    content: '""',
    position: 'absolute',
    inset: '9% 7%',
    borderRadius: '9999px',
    border: '0.25cqmin solid rgba(255,255,255,0.10)',
  },
  '::after': {
    // Subtle cloth texture.
    content: '""',
    position: 'absolute',
    inset: 0,
    opacity: 0.35,
    backgroundImage:
      'repeating-radial-gradient(circle at 30% 20%, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px), repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 2px, transparent 2px 4px)',
  },
});

export const FeltLogo = style({
  position: 'absolute',
  left: '50%',
  top: '69%',
  transform: 'translate(-50%, -50%)',
  fontSize: '2.6cqmin',
  fontWeight: 800,
  letterSpacing: '0.9cqmin',
  color: 'rgba(255,255,255,0.10)',
  whiteSpace: 'nowrap',
  textTransform: 'uppercase',
  selectors: {
    '[data-layout="portrait"] &': { top: '64%', fontSize: '3.4cqmin' },
  },
});

export const Board = style({
  position: 'absolute',
  left: '50%',
  top: '47%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  gap: '1.1cqmin',
  vars: { '--card-w': '9.2cqmin' },
  selectors: {
    '[data-layout="portrait"] &': { top: '47%', vars: { '--card-w': '12.5cqmin' } },
  },
});

export const BoardSlot = style({
  width: 'var(--card-w)',
  aspectRatio: '5 / 7',
  borderRadius: 'calc(var(--card-w) * 0.1)',
  border: '0.25cqmin dashed rgba(255,255,255,0.12)',
  position: 'relative',
});

export const Pot = style({
  position: 'absolute',
  left: 'var(--pot-x)',
  top: 'var(--pot-y)',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  alignItems: 'center',
  gap: '1cqmin',
  padding: '0.6cqmin 1.8cqmin 0.6cqmin 0.9cqmin',
  borderRadius: '9999px',
  background: 'rgba(0,0,0,0.45)',
  boxShadow: 'inset 0 0 0 0.2cqmin rgba(255,255,255,0.08)',
  fontSize: '2.3cqmin',
  fontWeight: 700,
  whiteSpace: 'nowrap',
  transition: 'opacity 300ms',
  selectors: {
    '[data-layout="portrait"] &': { fontSize: '3.4cqmin' },
    '&[data-empty="true"]': { opacity: 0 },
  },
});

export const PotLabel = style({
  color: 'rgba(255,255,255,0.65)',
  fontWeight: 600,
});

export const PotAmount = style({
  color: GOLD,
});

export const ResultBanner = style({
  position: 'absolute',
  left: '50%',
  top: '61%',
  transform: 'translate(-50%, -50%)',
  padding: '0.9cqmin 2.4cqmin',
  borderRadius: '9999px',
  background: 'linear-gradient(180deg, rgba(20,16,6,0.92), rgba(10,8,3,0.92))',
  boxShadow: `0 0 0 0.25cqmin ${GOLD}, 0 1cqmin 3cqmin rgba(0,0,0,0.5)`,
  color: '#fff',
  fontSize: '2.2cqmin',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  zIndex: 6,
  animation: `${bannerIn} 400ms cubic-bezier(.2,.9,.3,1.2) both`,
  selectors: {
    '[data-layout="portrait"] &': { top: '56%', fontSize: '3.2cqmin', maxWidth: '86cqw' },
  },
});

export const ResultHighlight = style({
  color: GOLD,
  fontWeight: 800,
});

/* ---------- Seats ---------- */

export const Seat = style({
  position: 'absolute',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  zIndex: 3,
  vars: { '--avatar': '10cqmin', '--card-w': '6.4cqmin' },
  transition: 'opacity 300ms, filter 300ms',
  selectors: {
    '[data-layout="portrait"] &': { vars: { '--avatar': '14cqmin', '--card-w': '9cqmin' } },
    '&[data-hero="true"]': { vars: { '--avatar': '10.5cqmin', '--card-w': '10cqmin' }, zIndex: 4 },
    '[data-layout="portrait"] &[data-hero="true"]': {
      vars: { '--avatar': '15cqmin', '--card-w': '15cqmin' },
    },
    '&[data-folded="true"]': { opacity: 0.55, filter: 'saturate(0.4)' },
    '&[data-out="true"]': { opacity: 0.35 },
  },
});

export const EmptySeat = style({
  position: 'absolute',
  transform: 'translate(-50%, -50%)',
  width: '9cqmin',
  height: '9cqmin',
  borderRadius: '50%',
  border: '0.3cqmin dashed rgba(255,255,255,0.15)',
  background: 'rgba(0,0,0,0.18)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.6cqmin',
  color: 'rgba(255,255,255,0.35)',
  selectors: {
    '[data-layout="portrait"] &': { width: '13cqmin', height: '13cqmin', fontSize: '2.4cqmin' },
  },
});

export const SeatCards = style({
  position: 'absolute',
  // Cards peek out above the avatar; 100% is the height of the seat (avatar + name plate).
  bottom: 'calc(100% - var(--avatar) * 0.35)',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  zIndex: 0,
  transition: 'bottom 400ms cubic-bezier(.2,.8,.2,1)',
  selectors: {
    '&[data-revealed="true"]': { bottom: 'calc(100% - var(--avatar) * 0.55)', zIndex: 3 },
    '[data-hero="true"] &': { bottom: 'calc(100% - var(--avatar) * 0.3)', zIndex: 3 },
  },
});

export const SeatCard = style({
  margin: '0 calc(var(--card-w) * -0.18)',
  selectors: {
    '&:first-child': { vars: { '--rot': '-7deg' }, transform: 'rotate(-7deg)' },
    '&:last-child': { vars: { '--rot': '7deg' }, transform: 'rotate(7deg)' },
  },
});

export const AvatarWrap = style({
  position: 'relative',
  width: 'var(--avatar)',
  height: 'var(--avatar)',
  borderRadius: '50%',
  zIndex: 1,
  boxShadow: '0 0 0 0.35cqmin rgba(255,255,255,0.18), 0 0.8cqmin 2cqmin rgba(0,0,0,0.55)',
  transition: 'box-shadow 300ms',
  selectors: {
    '&[data-turn="true"]': { animation: `${turnPulse} 1.6s ease-in-out infinite` },
    '&[data-winner="true"]': { animation: `${winnerGlow} 1.2s ease-in-out infinite` },
  },
});

export const Avatar = style({
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 'calc(var(--avatar) * 0.38)',
  fontWeight: 800,
  color: '#fff',
  textShadow: '0 0.2cqmin 0.4cqmin rgba(0,0,0,0.35)',
});

export const AvatarImage = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const TimerRing = style({
  position: 'absolute',
  inset: '-0.9cqmin',
  width: 'calc(100% + 1.8cqmin)',
  height: 'calc(100% + 1.8cqmin)',
  transform: 'rotate(-90deg)',
  pointerEvents: 'none',
  overflow: 'visible',
});

export const TimerTrack = style({
  fill: 'none',
  stroke: 'rgba(0,0,0,0.45)',
  strokeWidth: 5,
});

export const TimerCircle = style({
  fill: 'none',
  stroke: GOLD,
  strokeWidth: 5,
  strokeLinecap: 'round',
  strokeDasharray: 'var(--ring-length)',
  animationName: turnTimer,
  animationTimingFunction: 'linear',
  animationFillMode: 'both',
  filter: 'drop-shadow(0 0 2px rgba(245,200,75,0.8))',
});

export const Plate = style({
  position: 'relative',
  zIndex: 2,
  marginTop: 'calc(var(--avatar) * -0.16)',
  minWidth: '15cqmin',
  padding: '0.5cqmin 1.6cqmin 0.6cqmin',
  borderRadius: '1.2cqmin',
  background: 'linear-gradient(180deg, rgba(24,28,36,0.96), rgba(10,12,18,0.96))',
  boxShadow: '0 0 0 0.18cqmin rgba(255,255,255,0.09), 0 0.8cqmin 1.8cqmin rgba(0,0,0,0.5)',
  textAlign: 'center',
  lineHeight: 1.2,
  selectors: {
    '[data-layout="portrait"] &': { minWidth: '21cqmin', padding: '0.6cqmin 2cqmin 0.8cqmin' },
  },
});

export const PlateName = style({
  fontSize: '1.75cqmin',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.88)',
  maxWidth: '18cqmin',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  selectors: {
    '[data-layout="portrait"] &': { fontSize: '2.7cqmin', maxWidth: '24cqmin' },
  },
});

export const PlateStack = style({
  fontSize: '2cqmin',
  fontWeight: 800,
  color: GOLD,
  fontVariantNumeric: 'tabular-nums',
  selectors: {
    '[data-layout="portrait"] &': { fontSize: '3cqmin' },
  },
});

export const HandName = style({
  position: 'absolute',
  top: '100%',
  left: '50%',
  transform: 'translate(-50%, 0.6cqmin)',
  padding: '0.3cqmin 1.2cqmin',
  borderRadius: '0.8cqmin',
  background: 'rgba(0,0,0,0.7)',
  fontSize: '1.5cqmin',
  fontWeight: 700,
  whiteSpace: 'nowrap',
  color: 'rgba(255,255,255,0.9)',
  selectors: {
    '&[data-winner="true"]': { color: '#1a1205', background: GOLD },
    '[data-layout="portrait"] &': { fontSize: '2.3cqmin' },
  },
});

export const ActionBadge = style({
  position: 'absolute',
  top: '-1.5cqmin',
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '0.2cqmin 1.1cqmin',
  borderRadius: '9999px',
  fontSize: '1.45cqmin',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.1cqmin',
  whiteSpace: 'nowrap',
  boxShadow: '0 0.3cqmin 0.8cqmin rgba(0,0,0,0.4)',
  background: '#5b6475',
  color: '#fff',
  selectors: {
    '[data-layout="portrait"] &': { fontSize: '2.1cqmin', top: '-2.2cqmin' },
    '&[data-kind="fold"]': { background: '#3d424d', color: 'rgba(255,255,255,0.75)' },
    '&[data-kind="check"]': { background: '#2f6fd6' },
    '&[data-kind="call"]': { background: '#1f9d55' },
    '&[data-kind="bet"], &[data-kind="raise"]': { background: '#e08a1e' },
    '&[data-kind="allin"]': { background: '#d63a3a' },
    '&[data-kind="sb"], &[data-kind="bb"]': { background: '#4b5563' },
  },
});

export const WinAmount = style({
  position: 'absolute',
  left: '50%',
  // Centered on the avatar, clear of any cards above it.
  top: 'calc(var(--avatar) * 0.25)',
  zIndex: 8,
  fontSize: '3.4cqmin',
  fontWeight: 900,
  color: '#7dffa8',
  textShadow: '0 0.3cqmin 1cqmin rgba(0,0,0,0.9), 0 0 2cqmin rgba(125,255,168,0.5)',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  animation: `${floatUp} 2.6s ease-out both`,
  selectors: {
    '[data-layout="portrait"] &': { fontSize: '5cqmin' },
  },
});

export const DealerButton = style({
  position: 'absolute',
  transform: 'translate(-50%, -50%)',
  width: '3.4cqmin',
  height: '3.4cqmin',
  borderRadius: '50%',
  background: 'radial-gradient(circle at 35% 30%, #ffffff, #e9e4d6 60%, #c9c1aa)',
  color: '#1a1a1a',
  fontWeight: 900,
  fontSize: '1.8cqmin',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 0.35cqmin 0 #9f977f, 0 0.8cqmin 1.4cqmin rgba(0,0,0,0.5)',
  zIndex: 2,
  transition: 'left 600ms cubic-bezier(.2,.8,.2,1), top 600ms cubic-bezier(.2,.8,.2,1)',
  selectors: {
    '[data-layout="portrait"] &': { width: '5cqmin', height: '5cqmin', fontSize: '2.6cqmin' },
  },
});

/* ---------- Bets and chips ---------- */

export const Bet = style({
  position: 'absolute',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.6cqmin',
  zIndex: 2,
  animation: `${chipsIn} 350ms cubic-bezier(.2,.8,.2,1) both`,
  transition:
    'left 550ms cubic-bezier(.5,0,.3,1), top 550ms cubic-bezier(.5,0,.3,1), opacity 550ms ease-in',
  selectors: {
    // Slide into the pot; the stage sets --pot-x/--pot-y from the layout.
    '&[data-collecting="true"]': {
      left: 'var(--pot-x) !important',
      top: 'var(--pot-y) !important',
      opacity: 0,
    },
  },
});

export const BetAmount = style({
  padding: '0.2cqmin 1cqmin',
  borderRadius: '9999px',
  background: 'rgba(0,0,0,0.55)',
  fontSize: '1.7cqmin',
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
  selectors: {
    '[data-layout="portrait"] &': { fontSize: '2.6cqmin' },
  },
});

export const ChipStack = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column-reverse',
  alignItems: 'center',
  vars: { '--chip': '3.2cqmin' },
  selectors: {
    '[data-layout="portrait"] &': { vars: { '--chip': '4.6cqmin' } },
  },
});

export const Chip = style({
  width: 'var(--chip)',
  height: 'var(--chip)',
  borderRadius: '50%',
  marginTop: 'calc(var(--chip) * -0.78)',
  background:
    'radial-gradient(circle, var(--chip-color) 0 50%, transparent 51%), repeating-conic-gradient(var(--chip-color) 0 22.5deg, #f7f3e8 22.5deg 45deg)',
  boxShadow:
    '0 calc(var(--chip) * 0.08) 0 rgba(0,0,0,0.45), inset 0 0 0 calc(var(--chip) * 0.06) rgba(0,0,0,0.18)',
  position: 'relative',
  '::after': {
    content: '""',
    position: 'absolute',
    inset: '24%',
    borderRadius: '50%',
    border: 'calc(var(--chip) * 0.06) dashed rgba(255,255,255,0.65)',
  },
  selectors: {
    '&:first-child': { marginTop: 0 },
  },
});

export const WinnerPile = style({
  position: 'absolute',
  left: 'var(--pot-x)',
  top: 'var(--pot-y)',
  zIndex: 7,
  animation: `${potToWinner} 1.4s cubic-bezier(.5,0,.3,1) 250ms both`,
});

/* ---------- Cards ---------- */

export const Card = style({
  position: 'relative',
  width: 'var(--card-w)',
  aspectRatio: '5 / 7',
  perspective: '800px',
  flexShrink: 0,
  transition: 'transform 300ms, filter 300ms',
  selectors: {
    '&[data-anim="deal"]': {
      animation: `${dealIn} 480ms cubic-bezier(.2,.8,.2,1) both`,
      animationDelay: 'var(--delay, 0ms)',
    },
    '&[data-highlight="true"]': { transform: 'translateY(-10%)' },
    '&[data-dim="true"]': { filter: 'brightness(0.5) saturate(0.6)' },
  },
});

export const CardInner = style({
  position: 'absolute',
  inset: 0,
  transformStyle: 'preserve-3d',
  transition: 'transform 600ms cubic-bezier(.2,.8,.2,1)',
  selectors: {
    '&[data-face="down"]': { transform: 'rotateY(180deg)' },
    '&[data-anim="flip"]': {
      animation: `${flipIn} 650ms cubic-bezier(.2,.8,.2,1) both`,
      animationDelay: 'var(--delay, 0ms)',
    },
  },
});

const cardFace = style({
  position: 'absolute',
  inset: 0,
  borderRadius: 'calc(var(--card-w) * 0.1)',
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
  boxShadow: '0 calc(var(--card-w) * 0.05) calc(var(--card-w) * 0.12) rgba(0,0,0,0.45)',
});

export const CardFront = style([
  cardFace,
  {
    background: 'linear-gradient(160deg, #ffffff 0%, #f5f2ea 100%)',
    color: '#15171c',
    overflow: 'hidden',
    selectors: {
      '&[data-red="true"]': { color: '#d42b2b' },
      [`${Card}[data-highlight="true"] &`]: {
        boxShadow: `0 0 0 calc(var(--card-w) * 0.045) ${GOLD}, 0 0 calc(var(--card-w) * 0.35) rgba(245,200,75,0.8)`,
      },
    },
  },
]);

export const CardRank = style({
  position: 'absolute',
  top: '5%',
  left: '9%',
  fontSize: 'calc(var(--card-w) * 0.4)',
  fontWeight: 800,
  lineHeight: 1,
  letterSpacing: 'calc(var(--card-w) * -0.03)',
});

export const CardCornerSuit = style({
  position: 'absolute',
  top: '38%',
  left: '10%',
  fontSize: 'calc(var(--card-w) * 0.24)',
  lineHeight: 1,
});

export const CardBigSuit = style({
  position: 'absolute',
  right: '7%',
  bottom: '3%',
  fontSize: 'calc(var(--card-w) * 0.62)',
  lineHeight: 1,
});

export const CardBack = style([
  cardFace,
  {
    transform: 'rotateY(180deg)',
    background:
      'repeating-linear-gradient(45deg, rgba(255,255,255,0.10) 0 calc(var(--card-w) * 0.035), transparent calc(var(--card-w) * 0.035) calc(var(--card-w) * 0.11)), repeating-linear-gradient(-45deg, rgba(255,255,255,0.10) 0 calc(var(--card-w) * 0.035), transparent calc(var(--card-w) * 0.035) calc(var(--card-w) * 0.11)), linear-gradient(160deg, #b3202f 0%, #7d1020 100%)',
    boxShadow:
      'inset 0 0 0 calc(var(--card-w) * 0.055) #f6f2e8, inset 0 0 0 calc(var(--card-w) * 0.075) #d9b65b, 0 calc(var(--card-w) * 0.05) calc(var(--card-w) * 0.12) rgba(0,0,0,0.45)',
  },
]);

globalStyle(`${Stage} *`, {
  boxSizing: 'border-box',
});
