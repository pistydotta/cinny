import { globalStyle, keyframes, style } from '@vanilla-extract/css';

// The run's HUD, drawn like the game's pixel art: hard 2px edges with notched corners, a light
// edge on top and a dark one below, the icons at twice their size, and a pixel font. Weapons
// sit in gold frames and Boletos in green ones with a barcode, the two colors of the flag.

export const PIXEL_FONT = '"Jersey 10", InterVariable, Inter, system-ui, sans-serif';

const INK = '#1c1220';
const PANEL = '#2b2236';
const PANEL_LIGHT = '#4a3d5c';
const PANEL_DARK = '#160f1c';
const CREAM = '#fff4dc';
const MUTED = '#b8a9c9';
const GOLD = '#ffd23a';
const GOLD_DARK = '#a8700f';
const GREEN = '#5bd25b';
const GREEN_DARK = '#1d6a33';

// A box with a 2px outline that skips the corners, like a sprite's, and bevelled edges.
const pixelBox = (fill: string, light: string, dark: string, outline = INK) => ({
  background: fill,
  boxShadow: [
    `0 -2px 0 0 ${outline}`,
    `0 2px 0 0 ${outline}`,
    `-2px 0 0 0 ${outline}`,
    `2px 0 0 0 ${outline}`,
    `inset 0 2px 0 0 ${light}`,
    `inset 0 -2px 0 0 ${dark}`,
  ].join(', '),
});

const SHADOW = `2px 2px 0 ${INK}, -1px -1px 0 ${INK}, 1px -1px 0 ${INK}, -1px 1px 0 ${INK}`;

export const Layer = style({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  fontFamily: PIXEL_FONT,
  color: CREAM,
  textShadow: SHADOW,
  fontVariantNumeric: 'tabular-nums',
});

globalStyle(`${Layer} img`, { imageRendering: 'pixelated' });

// --- Experience: a segmented bar along the top edge --------------------------------------

export const Xp = style({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 12,
  background: INK,
  borderBottom: `2px solid ${INK}`,
});

export const XpFill = style({
  height: '100%',
  background: `linear-gradient(#c8f6ff 0 3px, #38c8ff 3px 8px, #1f7fc0 8px)`,
  transition: 'width 120ms linear',
});

export const XpTicks = style({
  position: 'absolute',
  inset: 0,
  background:
    'repeating-linear-gradient(90deg, transparent 0 calc(5% - 2px), rgba(28,18,32,0.7) calc(5% - 2px) 5%)',
});

// --- The hero: portrait, health and the build -------------------------------------------

export const Hero = style({
  position: 'absolute',
  top: 'calc(22px + env(safe-area-inset-top))',
  left: 'max(14px, env(safe-area-inset-left))',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
});

export const HeroRow = style({ display: 'flex', alignItems: 'flex-start', gap: 10 });

export const Portrait = style([
  pixelBox('#3a5a8c', '#6f93c8', '#22385c'),
  {
    position: 'relative',
    flexShrink: 0,
    width: 56,
    height: 56,
    // The sheet's first frame, faced front, zoomed in on the head.
    backgroundSize: '672px 84px',
    backgroundPosition: '-14px -2px',
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
    '@media': { '(max-width: 560px)': { display: 'none' } },
  },
]);

export const LevelBadge = style([
  pixelBox(GOLD, '#fff2a0', GOLD_DARK),
  {
    position: 'absolute',
    left: '50%',
    bottom: -10,
    transform: 'translateX(-50%)',
    padding: '0 5px',
    fontSize: 18,
    lineHeight: '16px',
    fontWeight: 400,
    whiteSpace: 'nowrap',
    color: INK,
    textShadow: 'none',
  },
]);

export const Bars = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  width: 210,
  paddingTop: 2,
  '@media': { '(max-width: 560px)': { width: 'min(170px, calc(100vw - 230px))' } },
});

export const BarLine = style({ display: 'flex', alignItems: 'center', gap: 6 });

globalStyle(`${BarLine} > img`, { width: 24, height: 24, flexShrink: 0 });

const bar = {
  position: 'relative' as const,
  flexGrow: 1,
  background: PANEL_DARK,
  boxShadow: `0 -2px 0 0 ${INK}, 0 2px 0 0 ${INK}, -2px 0 0 0 ${INK}, 2px 0 0 0 ${INK}`,
};

export const Hp = style({ ...bar, height: 20 });

export const HpFill = style({
  height: '100%',
  background: 'linear-gradient(#ff9a9a 0 3px, #e83b3b 3px 14px, #8f1f2a 14px)',
  transition: 'width 120ms linear',
});

export const HpText = style({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 19,
  fontWeight: 400,
  lineHeight: 1,
});

export const Over = style({ color: GOLD, marginLeft: 4 });

export const Shield = style({ ...bar, height: 8, marginLeft: 30 });

export const ShieldFill = style({
  height: '100%',
  background: 'linear-gradient(#d8f2ff 0 2px, #5ab8ff 2px)',
  transition: 'width 120ms linear',
});

export const Build = style({ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 2 });

export const SlotRow = style({ display: 'flex', gap: 8 });

const slotBase = {
  position: 'relative' as const,
  width: 40,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 22,
  textShadow: 'none',
};

export const Weapon = style([
  pixelBox(PANEL, PANEL_LIGHT, PANEL_DARK, GOLD_DARK),
  slotBase,
  {
    selectors: {
      '&[data-max="true"]': {
        boxShadow: [
          `0 -2px 0 0 ${GOLD}`,
          `0 2px 0 0 ${GOLD}`,
          `-2px 0 0 0 ${GOLD}`,
          `2px 0 0 0 ${GOLD}`,
          `inset 0 2px 0 0 ${PANEL_LIGHT}`,
          `inset 0 -2px 0 0 ${PANEL_DARK}`,
        ].join(', '),
      },
      '&[data-evolved="true"]': {
        background: 'linear-gradient(#6a2a10, #3a1408)',
        boxShadow: [
          `0 -2px 0 0 #ff9a2e`,
          `0 2px 0 0 #ff9a2e`,
          `-2px 0 0 0 #ff9a2e`,
          `2px 0 0 0 #ff9a2e`,
          `0 0 10px 0 rgba(255,140,40,0.7)`,
        ].join(', '),
      },
    },
  },
]);

export const Boleto = style([
  pixelBox('#20302a', '#3c5a48', '#111a16', GREEN_DARK),
  slotBase,
  {
    // A strip of barcode along the bottom: a Boleto is a payment slip.
    '::after': {
      content: '""',
      position: 'absolute',
      left: 5,
      right: 5,
      bottom: 3,
      height: 3,
      opacity: 0.55,
      background: `repeating-linear-gradient(90deg, ${GREEN} 0 1px, transparent 1px 2px, ${GREEN} 2px 4px, transparent 4px 5px)`,
    },
  },
]);

export const EmptySlot = style({
  width: 40,
  height: 40,
  boxShadow: `inset 0 0 0 2px rgba(168,112,15,0.55)`,
  background: 'rgba(28,18,32,0.4)',
  selectors: { '&[data-kind="boleto"]': { boxShadow: 'inset 0 0 0 2px rgba(91,210,91,0.4)' } },
});

globalStyle(`${Weapon} img, ${Boleto} img`, { width: 32, height: 32 });

// The level of a weapon (up to 50) or a Boleto (up to 99), on its corner; gold once maxed.
export const WeaponLevel = style({
  position: 'absolute',
  right: -6,
  bottom: -8,
  minWidth: 18,
  padding: '0 3px',
  fontSize: 15,
  lineHeight: '14px',
  textAlign: 'center',
  color: INK,
  textShadow: 'none',
  background: GOLD,
  boxShadow: `0 0 0 2px ${INK}`,
  selectors: {
    [`${Weapon}[data-evolved="true"] &`]: { background: '#ff9a2e' },
    '&[data-boleto]': { background: GREEN },
    '&[data-boleto][data-max="true"]': { background: GOLD },
  },
});

export const EvolvedStar = style({
  position: 'absolute',
  top: -9,
  right: -9,
  width: 18,
  height: 18,
});

// --- The top middle: the clock, kills and gold, and the boss ------------------------------

export const Center = style({
  position: 'absolute',
  top: 'calc(20px + env(safe-area-inset-top))',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 10,
  width: 'min(480px, 52%)',
  // On a phone the clock goes to the right, beside the pause button.
  '@media': {
    '(max-width: 560px)': {
      left: 'auto',
      right: 'max(56px, calc(env(safe-area-inset-right) + 42px))',
      transform: 'none',
      width: 'auto',
      alignItems: 'flex-end',
      gap: 8,
    },
  },
});

export const Clock = style([
  pixelBox(PANEL, PANEL_LIGHT, PANEL_DARK),
  {
    padding: '2px 14px 4px',
    fontSize: 40,
    fontWeight: 400,
    lineHeight: 1.05,
    letterSpacing: 1,
    '@media': { '(max-width: 560px)': { fontSize: 30, padding: '1px 10px 3px' } },
    selectors: { '&[data-late="true"]': { color: '#ff8a6a' } },
  },
]);

export const Counters = style({
  display: 'flex',
  gap: 14,
  marginTop: -4,
  fontSize: 22,
  fontWeight: 400,
});

export const Counter = style({ display: 'flex', alignItems: 'center', gap: 4 });

globalStyle(`${Counter} img`, { width: 20, height: 20 });

export const Gold = style({ color: GOLD });

export const Boss = style({
  ...bar,
  flexGrow: 0,
  width: '100%',
  height: 22,
  marginTop: 4,
  boxShadow: `0 -2px 0 0 ${INK}, 0 2px 0 0 ${INK}, -2px 0 0 0 ${INK}, 2px 0 0 0 ${INK}, 0 0 0 4px #8f1f2a`,
  '@media': {
    '(max-width: 700px)': {
      position: 'fixed',
      top: 'calc(198px + env(safe-area-inset-top))',
      left: '4%',
      width: '92%',
    },
  },
});

export const BossFill = style({
  height: '100%',
  background: 'linear-gradient(#ffb070 0 3px, #ff5a2a 3px 15px, #8f1f2a 15px)',
  transition: 'width 120ms linear',
});

export const BossText = style([HpText, { gap: 6, fontSize: 18, letterSpacing: 1 }]);

globalStyle(`${BossText} img`, { width: 16, height: 16 });

export const Pause = style([
  pixelBox(PANEL, PANEL_LIGHT, PANEL_DARK),
  {
    position: 'absolute',
    top: 'calc(20px + env(safe-area-inset-top))',
    right: 'max(14px, env(safe-area-inset-right))',
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    pointerEvents: 'auto',
    '::before': { content: '""', width: 4, height: 14, background: CREAM },
    '::after': { content: '""', width: 4, height: 14, background: CREAM },
  },
]);

// The minimap's canvas, drawn by `MapHud`, under the pause button (under the clock on a phone).
export const MiniMap = style({
  position: 'absolute',
  right: 'max(14px, env(safe-area-inset-right))',
  top: 'calc(64px + env(safe-area-inset-top))',
  width: 'clamp(88px, 22vw, 128px)',
  aspectRatio: '1',
  imageRendering: 'pixelated',
  pointerEvents: 'none',
  opacity: 0.94,
  boxShadow: `0 -2px 0 0 ${INK}, 0 2px 0 0 ${INK}, -2px 0 0 0 ${INK}, 2px 0 0 0 ${INK}, inset 0 0 0 2px ${PANEL_LIGHT}`,
  '@media': { '(max-width: 560px)': { top: 'calc(100px + env(safe-area-inset-top))' } },
});

// --- The bottom: objectives, powerups, speed ---------------------------------------------

export const Bottom = style({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 'max(16px, env(safe-area-inset-bottom))',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
});

export const Tag = style([
  pixelBox(PANEL, PANEL_LIGHT, PANEL_DARK),
  {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 10px',
    fontSize: 20,
    color: '#ffd9a0',
    selectors: { '&[data-curse]': { color: '#d08aff' } },
  },
]);

globalStyle(`${Tag} img`, { width: 20, height: 20 });

const blink = keyframes({ '50%': { opacity: 0.45 } });

export const Buffs = style({ display: 'flex', gap: 10 });

export const Buff = style([
  Tag,
  {
    color: CREAM,
    selectors: {
      '&[data-ending="true"]': { animation: `${blink} 0.4s steps(1) infinite` },
    },
  },
]);

export const Speed = style({
  fontSize: 19,
  color: MUTED,
  selectors: { '&[data-fast="true"]': { color: GOLD } },
});

// --- The hero's ability and dodge, bottom right -----------------------------------------

export const Skills = style({
  position: 'absolute',
  right: 'max(16px, env(safe-area-inset-right))',
  bottom: 'max(16px, env(safe-area-inset-bottom))',
  display: 'flex',
  alignItems: 'flex-end',
  gap: 12,
});

export const Skill = style([
  pixelBox(PANEL, PANEL_LIGHT, PANEL_DARK),
  {
    position: 'relative',
    width: 58,
    height: 58,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    fontSize: 26,
    textShadow: 'none',
    selectors: {
      '&[data-ready="true"]': {
        boxShadow: [
          `0 -2px 0 0 ${GOLD}`,
          `0 2px 0 0 ${GOLD}`,
          `-2px 0 0 0 ${GOLD}`,
          `2px 0 0 0 ${GOLD}`,
          `inset 0 2px 0 0 ${PANEL_LIGHT}`,
          `inset 0 -2px 0 0 ${PANEL_DARK}`,
          `0 0 12px 0 rgba(255,210,58,0.55)`,
        ].join(', '),
      },
      '&[data-small]': { width: 42, height: 42, fontSize: 18, fontWeight: 400 },
    },
  },
]);

globalStyle(`${Skill} img`, { width: 32, height: 32, position: 'relative' });

// The part still recharging, darkened from the top.
export const SkillWait = style({
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  background: 'rgba(14,8,20,0.72)',
  borderBottom: `2px solid ${GOLD}`,
});

export const SkillKey = style({
  position: 'absolute',
  right: 3,
  bottom: 1,
  fontSize: 16,
  fontWeight: 400,
  color: CREAM,
  textShadow: SHADOW,
});

export const SkillName = style({ position: 'relative', textShadow: SHADOW, color: CREAM });

// --- Hints over the scene -----------------------------------------------------------------

export const Hint = style([
  pixelBox('rgba(28,18,32,0.82)', 'rgba(74,61,92,0.9)', 'rgba(14,8,20,0.9)'),
  {
    position: 'absolute',
    left: '50%',
    top: '60%',
    transform: 'translateX(-50%)',
    padding: '6px 14px',
    fontSize: 20,
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },
]);

// Touch buttons, as before but in the same frames.
const touchButton = {
  position: 'absolute' as const,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  color: CREAM,
  fontFamily: PIXEL_FONT,
  fontWeight: 400,
  textShadow: SHADOW,
  cursor: 'pointer',
  pointerEvents: 'auto' as const,
  opacity: 0.88,
};

export const DashButton = style([
  pixelBox(PANEL, PANEL_LIGHT, PANEL_DARK),
  touchButton,
  {
    right: 'max(18px, env(safe-area-inset-right))',
    bottom: 'max(22px, env(safe-area-inset-bottom))',
    width: 72,
    height: 72,
    fontSize: 20,
    selectors: { '&[data-ready="false"]': { opacity: 0.35 } },
  },
]);

export const JumpButton = style([DashButton, { right: 104, bottom: 36, width: 80, height: 80 }]);

export const AbilityButton = style([
  DashButton,
  { right: 30, bottom: 108, width: 60, height: 60, fontSize: 24 },
]);

globalStyle(`${AbilityButton} img`, { width: 32, height: 32 });
