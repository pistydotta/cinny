import { keyframes, style } from '@vanilla-extract/css';

const GOLD = '#f5c84b';
const PANEL = 'rgba(17, 26, 39, 0.92)';
const LINE = 'rgba(255,255,255,0.08)';
const MUTED = 'rgba(255,255,255,0.6)';

export const Page = style({
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  color: '#fff',
  background: 'radial-gradient(ellipse at 50% 0%, #2a1b12 0%, #120c0a 45%, #070507 100%)',
  fontFamily: 'InterVariable, Inter, system-ui, sans-serif',
});

export const Inner = style({
  maxWidth: 1040,
  margin: '0 auto',
  padding: '20px 16px 48px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
});

export const Header = style({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
});

export const IconButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: 10,
  border: `1px solid ${LINE}`,
  background: 'rgba(255,255,255,0.05)',
  color: '#fff',
  cursor: 'pointer',
  flexShrink: 0,
});

export const Title = style({
  margin: 0,
  fontSize: 26,
  fontWeight: 900,
  letterSpacing: '-0.02em',
  background: `linear-gradient(180deg, #ffe7a0, ${GOLD} 55%, #c9781e)`,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
});

export const Subtitle = style({
  margin: '2px 0 0',
  fontSize: 13,
  color: MUTED,
});

export const Grow = style({ flex: '1 1 160px', minWidth: 0 });

export const Pill = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.06)',
  border: `1px solid ${LINE}`,
  fontSize: 14,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
});

export const GoldText = style({ color: GOLD });

export const HeroBar = style({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  borderRadius: 16,
  background: PANEL,
  border: `1px solid ${LINE}`,
  flexWrap: 'wrap',
});

export const Portrait = style({
  width: 48,
  height: 48,
  borderRadius: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 26,
  flexShrink: 0,
});

export const HeroName = style({ fontSize: 16, fontWeight: 800 });
export const Muted = style({ fontSize: 13, color: MUTED });

export const Bar = style({
  position: 'relative',
  height: 8,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.08)',
  overflow: 'hidden',
  marginTop: 6,
});

export const BarFill = style({
  position: 'absolute',
  inset: 0,
  right: 'auto',
  borderRadius: 999,
  transition: 'width 180ms linear',
});

export const Tabs = style({
  display: 'flex',
  gap: 6,
  overflowX: 'auto',
  paddingBottom: 2,
});

export const Tab = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '9px 14px',
  borderRadius: 12,
  border: `1px solid ${LINE}`,
  background: 'rgba(255,255,255,0.04)',
  color: MUTED,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  selectors: {
    '&[aria-selected="true"]': {
      color: '#2a1d00',
      background: `linear-gradient(180deg, #ffd96a, ${GOLD} 55%, #d9a520)`,
      borderColor: 'transparent',
    },
  },
});

export const Dot = style({
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: '#ff5a4f',
});

export const Panel = style({
  padding: 16,
  borderRadius: 18,
  background: PANEL,
  border: `1px solid ${LINE}`,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  minWidth: 0,
});

export const PanelTitle = style({
  margin: 0,
  fontSize: 15,
  fontWeight: 800,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

export const Columns = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: 16,
  alignItems: 'start',
});

export const BattleColumns = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 3fr) minmax(280px, 2fr)',
  gap: 16,
  alignItems: 'start',
  '@media': {
    '(max-width: 820px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
  },
});

export const Row = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
});

export const Button = style({
  height: 38,
  padding: '0 14px',
  borderRadius: 11,
  border: 'none',
  background: `linear-gradient(180deg, #ffd96a 0%, ${GOLD} 50%, #d9a520 100%)`,
  color: '#2a1d00',
  fontSize: 14,
  fontWeight: 800,
  cursor: 'pointer',
  selectors: {
    '&:disabled': {
      background: 'rgba(255,255,255,0.06)',
      color: 'rgba(255,255,255,0.35)',
      cursor: 'default',
    },
  },
});

export const GhostButton = style([
  Button,
  {
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    border: `1px solid ${LINE}`,
  },
]);

export const DangerButton = style([
  GhostButton,
  {
    color: '#ff8a80',
  },
]);

export const SmallButton = style({
  height: 26,
  minWidth: 26,
  padding: '0 8px',
  borderRadius: 8,
  border: 'none',
  background: GOLD,
  color: '#2a1d00',
  fontWeight: 900,
  cursor: 'pointer',
});

export const ErrorText = style({ color: '#ff8a80', fontSize: 13, margin: 0 });

// Battle

export const Arena = style({
  position: 'relative',
  borderRadius: 18,
  padding: '18px 16px',
  overflow: 'hidden',
  border: `1px solid ${LINE}`,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
});

export const StageLine = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  flexWrap: 'wrap',
});

export const StageName = style({ fontSize: 17, fontWeight: 900 });

export const Versus = style({
  width: '100%',
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  alignItems: 'center',
  gap: 10,
});

export const VsMark = style({
  fontSize: 14,
  fontWeight: 900,
  color: 'rgba(255,255,255,0.4)',
});

const bob = keyframes({
  '0%, 100%': { transform: 'translateY(0)' },
  '50%': { transform: 'translateY(-4px)' },
});

export const FighterCard = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  padding: 12,
  borderRadius: 14,
  background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 100%)',
  minWidth: 0,
  textAlign: 'center',
});

export const FxCanvas = style({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 2,
});

export const ArenaTop = style({ position: 'relative', zIndex: 3 });

export const Stage = style({
  position: 'relative',
  zIndex: 1,
  willChange: 'transform',
  minHeight: 230,
  display: 'flex',
  alignItems: 'flex-end',
});

export const Ground = style({
  position: 'absolute',
  left: '-16px',
  right: '-16px',
  bottom: -18,
  height: 70,
  background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.08), transparent 70%)',
  pointerEvents: 'none',
});

export const Mini = style({ fontSize: 11, color: MUTED, fontVariantNumeric: 'tabular-nums' });

const pulse = keyframes({
  '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,211,107,0.0)' },
  '50%': { boxShadow: '0 0 22px 2px rgba(255,211,107,0.45)' },
});

export const DropBanner = style({
  position: 'relative',
  zIndex: 3,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 12px',
  borderRadius: 12,
  border: '2px solid',
  background: 'rgba(0,0,0,0.55)',
  animation: `${pulse} 1.2s ease-in-out infinite`,
});

export const FighterIcon = style({
  fontSize: 56,
  lineHeight: 1.1,
  display: 'inline-block',
  filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.55))',
  selectors: {
    '&[data-down="true"]': { opacity: 0.25, filter: 'grayscale(1)' },
    '&[data-boss="true"]': { fontSize: 76 },
  },
});

export const FighterBob = style({
  display: 'inline-block',
  animation: `${bob} 2.4s ease-in-out infinite`,
});

export const PetIcon = style({
  position: 'absolute',
  bottom: 2,
  left: -6,
  fontSize: 24,
  animation: `${bob} 1.7s ease-in-out infinite`,
});

export const FighterName = style({
  fontSize: 14,
  fontWeight: 800,
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const BossTag = style({
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#ff8a65',
});

export const HpWrap = style({ width: '100%' });

export const HpText = style({
  fontSize: 12,
  color: MUTED,
  fontVariantNumeric: 'tabular-nums',
  marginTop: 3,
});

export const Log = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  maxHeight: 260,
  overflowY: 'auto',
  fontSize: 13,
  fontVariantNumeric: 'tabular-nums',
});

export const LogLine = style({
  color: 'rgba(255,255,255,0.75)',
  selectors: {
    '&[data-tone="good"]': { color: '#8be28f' },
    '&[data-tone="bad"]': { color: '#ff8a80' },
    '&[data-tone="gold"]': { color: GOLD },
    '&[data-tone="loot"]': { fontWeight: 700 },
    '&[data-tone="great"]': { fontWeight: 800, color: '#ffd36b' },
  },
});

// Hero

export const StatGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  gap: '6px 16px',
  fontSize: 13,
});

export const StatRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  padding: '4px 0',
  borderBottom: `1px solid ${LINE}`,
});

export const StatValue = style({ fontWeight: 800, fontVariantNumeric: 'tabular-nums' });

export const SlotGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 8,
});

export const SlotBox = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  aspectRatio: '1',
  borderRadius: 12,
  border: `1px dashed rgba(255,255,255,0.15)`,
  background: 'rgba(0,0,0,0.25)',
  color: MUTED,
  fontSize: 11,
  cursor: 'pointer',
  padding: 4,
  minWidth: 0,
  selectors: {
    '&[data-filled="true"]': { borderStyle: 'solid', borderWidth: 2 },
    '&[aria-pressed="true"]': { boxShadow: `0 0 0 2px ${GOLD}` },
  },
});

export const SlotIcon = style({ fontSize: 26, lineHeight: 1 });

export const ItemBox = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: 12,
  borderRadius: 14,
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid',
});

export const ItemName = style({ fontSize: 15, fontWeight: 800 });

export const ModLine = style({
  fontSize: 13,
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  fontVariantNumeric: 'tabular-nums',
});

export const Up = style({ color: '#8be28f', fontWeight: 800 });
export const Down = style({ color: '#ff8a80', fontWeight: 800 });

// Upgrades and arena

export const List = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
});

export const ListItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 12,
  borderRadius: 14,
  background: 'rgba(0,0,0,0.25)',
  border: `1px solid ${LINE}`,
});

export const ListIcon = style({
  width: 42,
  height: 42,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 22,
  background: 'rgba(255,255,255,0.06)',
  flexShrink: 0,
});

export const Strong = style({ fontSize: 15, fontWeight: 800 });

// Class picker

export const ClassGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 10,
});

export const ClassCard = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 4,
  padding: 12,
  borderRadius: 14,
  border: `2px solid ${LINE}`,
  background: 'rgba(0,0,0,0.3)',
  color: '#fff',
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'transform 120ms, border-color 120ms',
  selectors: {
    '&:hover': { transform: 'translateY(-2px)' },
  },
});

export const ClassIcon = style({ fontSize: 32, lineHeight: 1.1 });

export const Input = style({
  height: 40,
  padding: '0 12px',
  borderRadius: 11,
  border: `1px solid ${LINE}`,
  background: 'rgba(0,0,0,0.35)',
  color: '#fff',
  fontSize: 15,
  minWidth: 0,
  flexGrow: 1,
});

export const Banner = style({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  borderRadius: 16,
  background: 'linear-gradient(135deg, rgba(245,200,75,0.18), rgba(245,200,75,0.04))',
  border: '1px solid rgba(245,200,75,0.35)',
  flexWrap: 'wrap',
});

// Inventory and item cards

export const Chips = style({ display: 'flex', gap: 6, flexWrap: 'wrap' });

export const Chip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  height: 30,
  padding: '0 10px',
  borderRadius: 999,
  border: `1px solid ${LINE}`,
  background: 'rgba(255,255,255,0.04)',
  color: MUTED,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  selectors: {
    '&[aria-pressed="true"]': {
      background: 'rgba(245,200,75,0.18)',
      color: GOLD,
      borderColor: 'rgba(245,200,75,0.5)',
    },
  },
});

export const Select = style({
  height: 30,
  borderRadius: 9,
  border: `1px solid ${LINE}`,
  background: 'rgba(0,0,0,0.4)',
  color: '#fff',
  fontSize: 13,
  padding: '0 8px',
});

export const ItemGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
  gap: 6,
  maxHeight: 420,
  overflowY: 'auto',
  padding: 2,
});

export const ItemCard = style({
  position: 'relative',
  aspectRatio: '1',
  borderRadius: 10,
  border: '2px solid',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 28,
  cursor: 'pointer',
  padding: 0,
  color: '#fff',
  transition: 'transform 100ms',
  selectors: {
    '&:hover': { transform: 'translateY(-2px)' },
    '&[aria-pressed="true"]': { boxShadow: `0 0 0 3px ${GOLD}, 0 0 16px rgba(245,200,75,0.5)` },
  },
});

export const CardPlus = style({
  position: 'absolute',
  top: 2,
  left: 4,
  fontSize: 11,
  fontWeight: 900,
  color: '#ffe7a0',
  textShadow: '0 1px 2px #000',
});

export const CardDelta = style({
  position: 'absolute',
  bottom: 1,
  right: 3,
  fontSize: 12,
  fontWeight: 900,
  textShadow: '0 1px 2px #000',
});

export const CardLock = style({ position: 'absolute', top: 1, right: 3, fontSize: 11 });

export const CardNew = style({
  position: 'absolute',
  top: 4,
  right: 4,
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: '#ff5a4f',
  boxShadow: '0 0 6px #ff5a4f',
});

export const Compare = style({
  display: 'grid',
  gridTemplateColumns: '1fr auto auto',
  gap: '3px 10px',
  fontSize: 13,
  fontVariantNumeric: 'tabular-nums',
  alignItems: 'baseline',
});

export const Divider = style({ height: 1, background: LINE, margin: '2px 0' });

export const BigDelta = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '8px 10px',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.05)',
  fontWeight: 800,
  fontSize: 14,
});

export const Feed = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  maxHeight: 240,
  overflowY: 'auto',
});

export const FeedRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '5px 8px',
  borderRadius: 9,
  fontSize: 13,
  background: 'rgba(255,255,255,0.03)',
  borderLeft: '3px solid',
  selectors: {
    '&[data-great="true"]': { background: 'rgba(245,200,75,0.1)' },
    '&[data-gone="true"]': { opacity: 0.55 },
  },
});

export const Badge = style({
  fontSize: 10,
  fontWeight: 900,
  padding: '2px 6px',
  borderRadius: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
});

// Forge

export const ForgeAnvil = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  padding: 16,
  borderRadius: 16,
  background: 'radial-gradient(ellipse at 50% 70%, rgba(255,120,40,0.25), rgba(0,0,0,0.3) 70%)',
  textAlign: 'center',
});

const forgeHit = keyframes({
  '0%': { transform: 'scale(1)', filter: 'brightness(1)' },
  '30%': { transform: 'scale(1.25)', filter: 'brightness(2.2)' },
  '100%': { transform: 'scale(1)', filter: 'brightness(1)' },
});
const forgeFail = keyframes({
  '0%, 100%': { transform: 'translateX(0)' },
  '20%': { transform: 'translateX(-8px)' },
  '40%': { transform: 'translateX(8px)' },
  '60%': { transform: 'translateX(-5px)' },
  '80%': { transform: 'translateX(5px)' },
});

export const ForgeIcon = style({
  fontSize: 64,
  lineHeight: 1.1,
  filter: 'drop-shadow(0 0 16px rgba(255,140,60,0.6))',
  selectors: {
    '&[data-result="success"]': { animation: `${forgeHit} 500ms ease-out` },
    '&[data-result="downgrade"]': { animation: `${forgeFail} 450ms ease-out` },
    '&[data-result="broken"]': { animation: `${forgeFail} 450ms ease-out`, opacity: 0.3 },
  },
});

export const ChanceBar = style({
  position: 'relative',
  width: '100%',
  height: 14,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.08)',
  overflow: 'hidden',
});

export const Warning = style({
  padding: '8px 10px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
  background: 'rgba(255,90,79,0.15)',
  border: '1px solid rgba(255,90,79,0.5)',
  color: '#ffb4ad',
});

// Talents

export const TalentCols = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 12,
});

export const TalentNode = style({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '8px 10px',
  borderRadius: 12,
  border: `1px solid ${LINE}`,
  background: 'rgba(0,0,0,0.3)',
  color: '#fff',
  textAlign: 'left',
  cursor: 'pointer',
  selectors: {
    '&:disabled': { cursor: 'default', opacity: 0.45 },
    '&[data-maxed="true"]': {
      borderColor: 'rgba(245,200,75,0.6)',
      background: 'rgba(245,200,75,0.08)',
    },
    '&[data-ranked="true"]': { borderColor: 'rgba(139,226,143,0.45)' },
  },
});

export const TalentIcon = style({
  width: 34,
  height: 34,
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  background: 'rgba(255,255,255,0.06)',
  flexShrink: 0,
});

export const RowLabel = style({
  fontSize: 11,
  fontWeight: 800,
  color: MUTED,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginTop: 4,
});

// Rebirth

export const RebirthHero = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: 16,
  borderRadius: 16,
  background:
    'radial-gradient(ellipse at 50% 0%, rgba(255,110,40,0.3), rgba(60,10,10,0.4) 60%, rgba(0,0,0,0.3))',
  border: '1px solid rgba(255,140,60,0.35)',
});

export const SpecGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 10,
});
