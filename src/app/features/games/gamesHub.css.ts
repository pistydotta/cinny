import { globalStyle, style } from '@vanilla-extract/css';

const GOLD = '#f5c84b';

export const Hub = style({
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  color: '#fff',
  background: 'radial-gradient(ellipse at 50% 0%, #1b2a40 0%, #0d1522 50%, #070b12 100%)',
  fontFamily: 'InterVariable, Inter, system-ui, sans-serif',
});

export const HubInner = style({
  maxWidth: 960,
  margin: '0 auto',
  padding: '24px 16px 48px',
  display: 'flex',
  flexDirection: 'column',
  gap: 28,
});

export const HubHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
});

export const BackButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.05)',
  color: '#fff',
  cursor: 'pointer',
});

export const Title = style({
  margin: 0,
  fontSize: 30,
  fontWeight: 900,
  letterSpacing: '-0.02em',
});

export const Subtitle = style({
  margin: '4px 0 0',
  fontSize: 15,
  color: 'rgba(255,255,255,0.6)',
});

export const WalletCard = style({
  display: 'flex',
  alignItems: 'center',
  gap: 18,
  padding: '20px 22px',
  borderRadius: 20,
  background:
    'linear-gradient(135deg, rgba(245,200,75,0.18) 0%, rgba(245,200,75,0.05) 45%, rgba(255,255,255,0.03) 100%)',
  border: '1px solid rgba(245,200,75,0.3)',
  boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
  flexWrap: 'wrap',
});

export const BigCoin = style({
  width: 64,
  height: 64,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(circle at 35% 30%, #fff1b8, #f5c84b 45%, #b8860b)',
  boxShadow:
    'inset 0 0 0 4px rgba(120,80,0,0.3), inset 0 0 0 7px rgba(255,241,184,0.5), 0 8px 24px rgba(245,200,75,0.35)',
  color: '#6b4500',
  fontSize: 28,
  fontWeight: 900,
  flexShrink: 0,
});

export const WalletInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  flexGrow: 1,
});

export const WalletLabel = style({
  fontSize: 13,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'rgba(255,255,255,0.6)',
});

export const WalletBalance = style({
  fontSize: 34,
  fontWeight: 900,
  color: GOLD,
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1.1,
});

export const WalletHint = style({
  fontSize: 13,
  color: 'rgba(255,255,255,0.55)',
});

export const SectionTitle = style({
  margin: 0,
  fontSize: 18,
  fontWeight: 800,
});

export const Grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: 16,
});

export const GameCard = style({
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 20,
  overflow: 'hidden',
  background: '#111a27',
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
  transition: 'transform 150ms, box-shadow 150ms',
  selectors: {
    '&[data-playable="true"]:hover': {
      transform: 'translateY(-3px)',
      boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,200,75,0.35)',
    },
  },
});

export const PokerArt = style({
  position: 'relative',
  height: 170,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background:
    'radial-gradient(ellipse at 50% 60%, #33a865 0%, #1f8048 40%, #135c33 75%, #0c4426 100%)',
  boxShadow: 'inset 0 -20px 40px rgba(0,0,0,0.35)',
  vars: { '--card-w': '54px' },
});

export const ArtCard = style({
  margin: '0 -10px',
});

export const ArtChips = style({
  position: 'absolute',
  right: 22,
  bottom: 22,
  display: 'flex',
  alignItems: 'flex-end',
  gap: 4,
});

globalStyle(`${ArtChips} > *`, {
  vars: { '--chip': '26px' },
});

export const SoonArt = style({
  height: 170,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background:
    'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0 10px, transparent 10px 20px), #0f1622',
  fontSize: 46,
  color: 'rgba(255,255,255,0.18)',
});

export const CardBody = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '16px 18px 18px',
  flexGrow: 1,
});

export const GameName = style({
  fontSize: 18,
  fontWeight: 800,
});

export const GameMeta = style({
  fontSize: 13,
  color: 'rgba(255,255,255,0.55)',
});

export const PlayButton = style({
  textAlign: 'center',
  marginTop: 10,
  height: 44,
  borderRadius: 12,
  border: 'none',
  background: `linear-gradient(180deg, #ffd96a 0%, ${GOLD} 50%, #d9a520 100%)`,
  color: '#2a1d00',
  fontSize: 15,
  fontWeight: 800,
  cursor: 'pointer',
  selectors: {
    '&:disabled': {
      background: 'rgba(255,255,255,0.06)',
      color: 'rgba(255,255,255,0.4)',
      cursor: 'default',
    },
  },
});
