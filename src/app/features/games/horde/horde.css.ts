import { keyframes, style } from '@vanilla-extract/css';

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
  selectors: { '&:disabled': { opacity: 0.45, cursor: 'default' } },
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
  padding: '0 10px',
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
  bottom: 14,
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
  right: 18,
  bottom: 22,
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

// The card on the games hub.
export const HubArt = style({
  height: 170,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  fontSize: 40,
  background: 'radial-gradient(ellipse at 50% 80%, #6a2a55 0%, #2a1638 50%, #0e0a16 100%)',
  boxShadow: 'inset 0 -20px 40px rgba(0,0,0,0.35)',
});
