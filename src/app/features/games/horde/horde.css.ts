import { globalStyle, keyframes, style } from '@vanilla-extract/css';

const GOLD = '#f5c84b';
const LINE = 'rgba(255,255,255,0.10)';
const MUTED = 'rgba(255,255,255,0.62)';
const PANEL = 'rgba(20, 16, 28, 0.94)';

export const Page = style({
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  color: '#fff',
  background: 'radial-gradient(ellipse at 50% 0%, #33203a 0%, #150f1c 50%, #08060b 100%)',
  fontFamily: 'InterVariable, Inter, system-ui, sans-serif',
});

export const Inner = style({
  maxWidth: 920,
  margin: '0 auto',
  padding: '20px 16px 48px',
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
});

export const Header = style({ display: 'flex', alignItems: 'center', gap: 12 });

export const IconButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  flexShrink: 0,
  borderRadius: 10,
  border: `1px solid ${LINE}`,
  background: 'rgba(255,255,255,0.05)',
  color: '#fff',
  cursor: 'pointer',
});

export const Title = style({ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5 });
export const Subtitle = style({ margin: '2px 0 0', fontSize: 14, color: MUTED });
export const Grow = style({ flexGrow: 1, minWidth: 0 });

export const GoldPill = style({
  padding: '6px 12px',
  borderRadius: 999,
  background: 'rgba(245,200,75,0.14)',
  border: '1px solid rgba(245,200,75,0.4)',
  color: GOLD,
  fontWeight: 800,
  whiteSpace: 'nowrap',
});

export const SectionTitle = style({
  margin: 0,
  fontSize: 13,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: 1,
  color: MUTED,
});

export const Cards = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
  gap: 12,
});

export const Card = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 6,
  padding: 14,
  borderRadius: 14,
  border: `2px solid ${LINE}`,
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  selectors: {
    '&[data-selected="true"]': { borderColor: GOLD, background: 'rgba(245,200,75,0.10)' },
    '&[data-rarity="rare"]': {
      borderColor: '#b07cff',
      boxShadow: '0 0 18px rgba(176,124,255,0.35)',
    },
    '&[data-rarity="epic"]': {
      borderColor: GOLD,
      boxShadow: '0 0 22px rgba(245,200,75,0.5)',
    },
    '&[data-rarity="evolve"]': {
      borderColor: '#ff6a3a',
      boxShadow: '0 0 22px rgba(255,106,58,0.5)',
    },
    '&:disabled': { opacity: 0.5, cursor: 'default' },
    '&:hover:not(:disabled)': { background: 'rgba(255,255,255,0.08)' },
  },
});

export const CardIcon = style({ fontSize: 30, lineHeight: 1 });

// The first frame of a hero's sheet (eight frames in a row): the hero facing the player.
export const CardSprite = style({
  width: 64,
  height: 64,
  margin: '-4px 0 -2px -8px',
  backgroundSize: '800% 100%',
  backgroundPosition: '0 0',
  imageRendering: 'pixelated',
});
export const CardName = style({ fontSize: 16, fontWeight: 800 });
export const CardText = style({ fontSize: 13, color: MUTED, lineHeight: 1.35 });
export const CardTag = style({ fontSize: 12, fontWeight: 800, color: GOLD });

export const PlayButton = style({
  alignSelf: 'center',
  minWidth: 240,
  padding: '14px 28px',
  borderRadius: 14,
  border: 'none',
  background: 'linear-gradient(180deg, #ff9a3a, #e2541c)',
  color: '#fff',
  font: 'inherit',
  fontSize: 18,
  fontWeight: 900,
  cursor: 'pointer',
  boxShadow: '0 6px 0 #8a2c0c, 0 12px 24px rgba(0,0,0,0.4)',
  selectors: {
    '&:active': { transform: 'translateY(3px)', boxShadow: '0 3px 0 #8a2c0c' },
    '&:disabled': { opacity: 0.6, cursor: 'default' },
  },
});

export const PlainButton = style({
  padding: '10px 18px',
  borderRadius: 12,
  border: `1px solid ${LINE}`,
  background: 'rgba(255,255,255,0.07)',
  color: '#fff',
  font: 'inherit',
  fontWeight: 700,
  cursor: 'pointer',
  selectors: {
    '&:disabled': { opacity: 0.45, cursor: 'default' },
    '&[data-selected="true"]': { borderColor: GOLD, color: GOLD },
  },
});

export const Records = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px 20px',
  fontSize: 14,
  color: MUTED,
});

export const Hint = style({ fontSize: 13, color: MUTED, textAlign: 'center', margin: 0 });

// --- The run -------------------------------------------------------------------------------

export const Stage = style({
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  background: '#1a1326',
  color: '#fff',
  fontFamily: 'InterVariable, Inter, system-ui, sans-serif',
  userSelect: 'none',
  touchAction: 'none',
});

export const Canvas = style({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  imageRendering: 'pixelated',
});

export const Overlay = style({ position: 'absolute', inset: 0, overflow: 'hidden' });

export const HudTop = style({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  // Clear of a phone's notch and rounded corners.
  padding: '0 max(10px, env(safe-area-inset-right)) 0 max(10px, env(safe-area-inset-left))',
  paddingTop: 'env(safe-area-inset-top)',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  pointerEvents: 'none',
  textShadow: '0 2px 0 rgba(0,0,0,0.7)',
});

export const XpBar = style({
  height: 10,
  margin: '0 -10px',
  background: 'rgba(0,0,0,0.55)',
});

export const XpFill = style({
  height: '100%',
  background: 'linear-gradient(90deg, #3ab8ff, #7df0ff)',
  transition: 'width 120ms linear',
});

export const HudRow = style({ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800 });

export const Timer = style({ fontSize: 26, fontWeight: 900, fontVariantNumeric: 'tabular-nums' });

export const HudButton = style([
  IconButton,
  { pointerEvents: 'auto', background: 'rgba(0,0,0,0.45)' },
]);

export const Slots = style({ display: 'flex', gap: 4, flexWrap: 'wrap' });

export const Slot = style({
  position: 'relative',
  width: 34,
  height: 34,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 8,
  fontSize: 18,
  background: 'rgba(0,0,0,0.5)',
  border: `1px solid ${LINE}`,
  textShadow: 'none',
});

export const SlotLevel = style({
  position: 'absolute',
  right: -3,
  bottom: -5,
  padding: '0 4px',
  borderRadius: 6,
  fontSize: 10,
  fontWeight: 900,
  background: '#111',
  color: GOLD,
});

export const BossBar = style({
  alignSelf: 'center',
  width: 'min(520px, 90%)',
  height: 14,
  borderRadius: 7,
  overflow: 'hidden',
  background: 'rgba(0,0,0,0.6)',
  border: '1px solid rgba(255,120,60,0.6)',
});

export const BossFill = style({
  height: '100%',
  background: 'linear-gradient(90deg, #ff3a2a, #ff9a3a)',
  transition: 'width 120ms linear',
});

export const HudBottom = style({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 'max(14px, env(safe-area-inset-bottom))',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  pointerEvents: 'none',
  fontWeight: 800,
  fontSize: 13,
  textShadow: '0 2px 0 rgba(0,0,0,0.7)',
});

export const HpBar = style({
  width: 'min(300px, 62%)',
  height: 16,
  borderRadius: 8,
  overflow: 'hidden',
  background: 'rgba(0,0,0,0.6)',
  border: `1px solid ${LINE}`,
});

export const HpFill = style({
  height: '100%',
  background: 'linear-gradient(90deg, #d9263a, #ff5a5a)',
  transition: 'width 120ms linear',
});

export const DashButton = style({
  position: 'absolute',
  right: 'max(18px, env(safe-area-inset-right))',
  bottom: 'max(22px, env(safe-area-inset-bottom))',
  width: 76,
  height: 76,
  borderRadius: '50%',
  border: '2px solid rgba(255,255,255,0.5)',
  background: 'rgba(255,255,255,0.14)',
  color: '#fff',
  font: 'inherit',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  selectors: { '&[data-ready="false"]': { opacity: 0.35 } },
});

const pop = keyframes({
  from: { transform: 'scale(0.9)', opacity: 0 },
  to: { transform: 'scale(1)', opacity: 1 },
});

export const Curtain = style({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  background: 'rgba(8,5,12,0.72)',
  overflowY: 'auto',
});

export const Panel = style({
  width: 'min(760px, 100%)',
  maxHeight: '100%',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  padding: 20,
  borderRadius: 18,
  background: PANEL,
  border: `1px solid ${LINE}`,
  boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  animation: `${pop} 160ms ease-out`,
});

export const PanelTitle = style({ margin: 0, fontSize: 26, fontWeight: 900, textAlign: 'center' });

export const PanelRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: 10,
});

export const Stats = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: 10,
  textAlign: 'center',
});

export const Stat = style({
  padding: 10,
  borderRadius: 12,
  background: 'rgba(255,255,255,0.05)',
  fontSize: 13,
  color: MUTED,
});

export const StatValue = style({ display: 'block', fontSize: 22, fontWeight: 900, color: '#fff' });

export const KeyHint = style({
  alignSelf: 'flex-end',
  padding: '1px 7px',
  borderRadius: 6,
  border: `1px solid ${LINE}`,
  fontSize: 11,
  fontWeight: 800,
  color: MUTED,
});

export const Offline = style({
  margin: 0,
  padding: '10px 14px',
  borderRadius: 12,
  fontSize: 13,
  lineHeight: 1.4,
  color: '#ffd9a0',
  background: 'rgba(255,154,58,0.12)',
  border: '1px solid rgba(255,154,58,0.35)',
});

export const Ranking = style({
  margin: 0,
  padding: 0,
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

export const RankRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '4px 12px 4px 8px',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.04)',
  fontSize: 14,
  selectors: {
    '&[data-me="true"]': { background: 'rgba(245,200,75,0.12)', outline: `1px solid ${GOLD}` },
  },
});

export const RankPlace = style({ width: 22, textAlign: 'center', fontWeight: 900, color: MUTED });

export const RankSprite = style({
  width: 32,
  height: 32,
  flexShrink: 0,
  backgroundSize: '800% 100%',
  backgroundPosition: '0 0',
  imageRendering: 'pixelated',
});

export const RankName = style({
  flexGrow: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontWeight: 700,
});

export const RankStat = style({
  minWidth: 64,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  color: MUTED,
});

// --- Jumping, the camera and the controls screen --------------------------------------------

export const JumpButton = style([
  DashButton,
  { right: 104, bottom: 40, width: 84, height: 84, fontSize: 14 },
]);

export const Speed = style({
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
  color: MUTED,
  selectors: { '&[data-fast="true"]': { color: GOLD } },
});

export const AimHint = style({
  position: 'absolute',
  left: '50%',
  top: '58%',
  transform: 'translateX(-50%)',
  padding: '8px 14px',
  borderRadius: 12,
  background: 'rgba(0,0,0,0.55)',
  fontSize: 13,
  fontWeight: 800,
  pointerEvents: 'none',
  textAlign: 'center',
});

export const ControlsList = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto auto',
  alignItems: 'center',
  gap: '6px 8px',
  fontSize: 14,
});

export const KeyButton = style({
  minWidth: 92,
  padding: '6px 10px',
  borderRadius: 8,
  border: `1px solid ${LINE}`,
  background: 'rgba(255,255,255,0.07)',
  color: '#fff',
  font: 'inherit',
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
  selectors: {
    '&[data-conflict="true"]': { borderColor: '#ff6a5a', color: '#ffb0a6' },
    '&[data-waiting="true"]': { borderColor: GOLD, color: GOLD },
  },
});

export const SettingRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontSize: 14,
  flexWrap: 'wrap',
});

export const Warning = style({ margin: 0, fontSize: 13, color: '#ffb0a6', textAlign: 'center' });

// --- Stats screen, defense bars and powerups ------------------------------------------------

export const StatGroups = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 14,
});

export const StatGroup = style({ display: 'flex', flexDirection: 'column', gap: 2 });

export const StatGroupTitle = style({
  margin: '0 0 4px',
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: GOLD,
});

export const StatRow = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: '5px 8px',
  borderRadius: 8,
  border: 'none',
  background: 'transparent',
  color: MUTED,
  font: 'inherit',
  fontSize: 13,
  textAlign: 'left',
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: 'rgba(255,255,255,0.06)' },
    '&[data-changed="true"]': { color: '#fff' },
  },
});

export const StatLine = style({ display: 'flex', alignItems: 'center', gap: 8, width: '100%' });

export const StatNumber = style({ fontWeight: 800, fontVariantNumeric: 'tabular-nums' });

export const StatHelp = style({ fontSize: 12, lineHeight: 1.35, color: MUTED });

export const ShieldBar = style({
  width: 'min(300px, 62%)',
  height: 6,
  borderRadius: 3,
  overflow: 'hidden',
  background: 'rgba(0,0,0,0.6)',
});

export const ShieldFill = style({
  height: '100%',
  background: 'linear-gradient(90deg, #5ab8ff, #a8e0ff)',
  transition: 'width 120ms linear',
});

export const Buffs = style({ display: 'flex', gap: 6, justifyContent: 'center' });

export const Buff = style({
  padding: '2px 8px',
  borderRadius: 10,
  background: 'rgba(0,0,0,0.55)',
  fontSize: 12,
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
});

export const DamageList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 13,
});

export const DamageRow = style({ display: 'flex', alignItems: 'center', gap: 8 });

export const DamageBar = style({
  height: 8,
  borderRadius: 4,
  background: 'linear-gradient(90deg, #ff9a3a, #e2541c)',
});

// --- Build, ability and chests ------------------------------------------------------------

export const BuildRow = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '5px 8px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.03)',
  fontSize: 13,
});

export const AbilityButton = style([
  DashButton,
  { right: 30, bottom: 112, width: 64, height: 64, fontSize: 24 },
]);

// The ability's icon in the corner on a keyboard, filling up while it recharges.
export const AbilityChip = style({
  position: 'absolute',
  right: 14,
  bottom: 14,
  width: 52,
  height: 52,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 24,
  background: 'rgba(0,0,0,0.55)',
  border: `1px solid ${LINE}`,
  overflow: 'hidden',
  pointerEvents: 'none',
  selectors: { '&[data-ready="true"]': { borderColor: GOLD, boxShadow: `0 0 12px ${GOLD}` } },
});

export const AbilityFill = style({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(245,200,75,0.25)',
});

export const AbilityKey = style({
  position: 'absolute',
  right: 3,
  bottom: 1,
  fontSize: 10,
  fontWeight: 900,
  color: MUTED,
});

export const CardActions = style({ display: 'flex', gap: 6, alignSelf: 'stretch' });

export const SmallButton = style([
  PlainButton,
  { padding: '4px 8px', fontSize: 12, borderRadius: 8 },
]);

const spin = keyframes({
  '0%': { transform: 'rotateY(0deg) scale(0.6)', opacity: 0 },
  '60%': { transform: 'rotateY(540deg) scale(1.1)', opacity: 1 },
  '100%': { transform: 'rotateY(720deg) scale(1)', opacity: 1 },
});

// A chest's prize spins in, one after the other.
export const ChestCard = style([
  Card,
  {
    cursor: 'default',
    animationName: spin,
    animationDuration: '900ms',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'both',
  },
]);

export const CardSlot = style({ display: 'flex', flexDirection: 'column', gap: 6 });

// The card fills its slot, so banish buttons line up under cards of any length.
globalStyle(`${CardSlot} > button:first-child`, { flexGrow: 1 });

// A goal or a warning just over the health bar: a challenge's countdown, a curse, a shrine.
export const Objective = style({
  padding: '3px 10px',
  borderRadius: 10,
  background: 'rgba(0,0,0,0.6)',
  color: '#ffd9a0',
  fontSize: 13,
  selectors: { '&[data-curse]': { color: '#d08aff' } },
});

// --- Results, the daily challenge, achievements and the ranking's builds -----------------

export const ResultNotes = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  fontSize: 14,
  color: MUTED,
  textAlign: 'center',
});

export const Good = style({ color: GOLD, fontWeight: 800 });

export const DailyCard = style({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 12,
  borderRadius: 14,
  border: `1px solid ${LINE}`,
  background: 'rgba(255,255,255,0.04)',
  flexWrap: 'wrap',
});

export const Achievements = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
  gap: 8,
});

export const Achievement = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: '8px 10px',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.04)',
  fontSize: 13,
  color: MUTED,
  selectors: { '&[data-done="true"]': { color: '#fff', background: 'rgba(245,200,75,0.08)' } },
});

export const ProgressBar = style({
  height: 5,
  borderRadius: 3,
  overflow: 'hidden',
  background: 'rgba(0,0,0,0.5)',
});

globalStyle(`${ProgressBar} > span`, {
  display: 'block',
  height: '100%',
  background: 'linear-gradient(90deg, #ff9a3a, #f5c84b)',
});

export const RankBuild = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 3,
  fontSize: 12,
  marginTop: 2,
});

globalStyle(`${RankBuild} > span[data-evolved="true"]`, { filter: `drop-shadow(0 0 3px ${GOLD})` });

export const DailyText = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  flex: '1 1 220px',
  minWidth: 0,
});

// The first run's tips, under the top of the screen.
export const Tip = style({
  position: 'absolute',
  left: '50%',
  top: 96,
  transform: 'translateX(-50%)',
  maxWidth: 'calc(100% - 32px)',
  padding: '8px 14px',
  borderRadius: 12,
  background: 'rgba(0,0,0,0.6)',
  border: `1px solid ${GOLD}`,
  color: '#fff',
  fontSize: 14,
  fontWeight: 800,
  textAlign: 'center',
  pointerEvents: 'none',
});

export const Select = style({
  padding: '6px 10px',
  borderRadius: 8,
  border: `1px solid ${LINE}`,
  background: '#1c1626',
  color: '#fff',
  font: 'inherit',
  fontSize: 13,
});

// The banner while watching someone's run.
export const Watching = style({
  position: 'absolute',
  left: '50%',
  top: 96,
  transform: 'translateX(-50%)',
  padding: '6px 14px',
  borderRadius: 12,
  background: 'rgba(0,0,0,0.6)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 800,
  pointerEvents: 'none',
});
