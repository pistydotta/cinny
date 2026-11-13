import { globalStyle, style } from '@vanilla-extract/css';
import { color } from 'folds';

// Numbers (balance) share the shell's monospace stack; secondary text is the theme ink dimmed.
const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const muted = `color-mix(in srgb, ${color.Surface.OnContainer} 72%, transparent)`;

export const Hub = style({
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  color: color.Background.OnContainer,
  background: color.Background.Container,
});

export const HubInner = style({
  maxWidth: 1440,
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
  borderRadius: 4,
  border: `1px solid ${color.SurfaceVariant.ContainerLine}`,
  background: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: color.SurfaceVariant.ContainerHover },
  },
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
  color: muted,
});

export const WalletCard = style({
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '12px 16px',
  borderRadius: 4,
  background: color.SurfaceVariant.Container,
  border: `1px solid ${color.SurfaceVariant.ContainerLine}`,
  flexWrap: 'wrap',
});

/* The coin is a minted illustration, not a control, so it keeps its gold. */
export const BigCoin = style({
  width: 40,
  height: 40,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(circle at 35% 30%, #fff1b8, #f5c84b 45%, #b8860b)',
  boxShadow:
    'inset 0 0 0 3px rgba(120,80,0,0.3), inset 0 0 0 5px rgba(255,241,184,0.5), 0 4px 14px rgba(245,200,75,0.3)',
  color: '#6b4500',
  fontSize: 18,
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
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: muted,
});

export const WalletBalance = style({
  fontSize: 20,
  fontWeight: 800,
  color: color.Background.OnContainer,
  fontFamily: mono,
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1.1,
});

export const WalletHint = style({
  fontSize: 13,
  color: muted,
});

export const GameSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
});

export const SectionTitle = style({
  margin: 0,
  fontSize: 18,
  fontWeight: 800,
});

export const Grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
  gap: 16,
});

export const GameCard = style({
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 4,
  overflow: 'hidden',
  background: color.Surface.Container,
  border: `1px solid ${color.Surface.ContainerLine}`,
  transition: 'transform 150ms, border-color 150ms',
  selectors: {
    '&[data-playable="true"]:hover': {
      transform: 'translateY(-3px)',
      borderColor: color.Primary.Main,
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

export const IdleArt = style({
  height: 170,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  background: 'radial-gradient(ellipse at 50% 70%, #6b3a17 0%, #3a1d0e 45%, #160a06 100%)',
  boxShadow: 'inset 0 -20px 40px rgba(0,0,0,0.35)',
});

export const IdleArtIcon = style({
  fontSize: 38,
  filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.5))',
});

export const SoonArt = style({
  height: 170,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `repeating-linear-gradient(45deg, ${color.SurfaceVariant.ContainerHover} 0 10px, transparent 10px 20px), ${color.SurfaceVariant.Container}`,
  fontSize: 46,
  color: muted,
});

export const CardBody = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '16px 18px 18px',
  flexGrow: 1,
});

// What kind of game it is, above its name.
export const GameGenre = style({
  alignSelf: 'flex-start',
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: color.Surface.OnContainer,
  border: `1px solid ${color.Surface.ContainerLine}`,
  background: color.Surface.ContainerHover,
});

export const GameName = style({
  fontSize: 18,
  fontWeight: 800,
});

export const GameMeta = style({
  fontSize: 13,
  color: muted,
});

export const PlayButton = style({
  textAlign: 'center',
  marginTop: 10,
  height: 44,
  borderRadius: 4,
  border: 'none',
  background: color.Primary.Main,
  color: color.Primary.OnMain,
  fontSize: 15,
  fontWeight: 800,
  cursor: 'pointer',
  selectors: {
    '&:hover:not(:disabled)': { background: color.Primary.MainHover },
    '&:active:not(:disabled)': { background: color.Primary.MainActive },
    '&:disabled': {
      background: color.Surface.ContainerActive,
      color: muted,
      cursor: 'default',
    },
  },
});

export const WalletTopUp = style([
  PlayButton,
  {
    marginTop: 0,
    padding: '0 18px',
  },
]);

export const GameArtwork = style({
  width: '100%',
  height: 170,
  objectFit: 'cover',
  display: 'block',
  flexShrink: 0,
});
