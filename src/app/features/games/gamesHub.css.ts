import { globalStyle, style } from '@vanilla-extract/css';
import { color } from 'folds';

// Numbers (balance) share the shell's monospace stack; secondary text is the theme ink dimmed.
const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const muted = `color-mix(in srgb, ${color.Surface.OnContainer} 72%, transparent)`;
const line = `1px solid ${color.SurfaceVariant.ContainerLine}`;

export const Hub = style({
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  color: color.Background.OnContainer,
  background: color.Background.Container,
});

export const HubInner = style({
  maxWidth: 1080,
  margin: '0 auto',
  padding: '24px 16px 48px',
  display: 'flex',
  flexDirection: 'column',
  gap: 32,
});

export const HubHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
});

export const BackButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: 4,
  border: line,
  background: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  cursor: 'pointer',
  selectors: { '&:hover': { background: color.SurfaceVariant.ContainerHover } },
});

export const Title = style({
  margin: 0,
  fontSize: 28,
  fontWeight: 900,
  letterSpacing: '-0.02em',
  flexGrow: 1,
});

// The wallet is a quiet chip in the header: it matters at a table, not on the way in.
export const WalletChip = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: 4,
  borderRadius: 999,
  border: line,
  background: color.SurfaceVariant.Container,
  flexWrap: 'wrap',
});

/* The coin is a minted illustration, not a control, so it keeps its gold. */
export const ChipCoin = style({
  width: 26,
  height: 26,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(circle at 35% 30%, #fff1b8, #f5c84b 45%, #b8860b)',
  color: '#6b4500',
  fontSize: 13,
  fontWeight: 900,
  flexShrink: 0,
});

export const ChipText = style({ display: 'flex', flexDirection: 'column', lineHeight: 1.15 });

export const ChipBalance = style({
  fontFamily: mono,
  fontWeight: 800,
  fontSize: 14,
  fontVariantNumeric: 'tabular-nums',
});

export const ChipHint = style({ fontSize: 11, color: muted });

export const ChipTopUp = style({
  width: 28,
  height: 28,
  padding: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  border: 'none',
  background: color.SurfaceVariant.ContainerHover,
  color: color.SurfaceVariant.OnContainer,
  cursor: 'pointer',
  selectors: {
    '&:hover:not(:disabled)': { background: color.SurfaceVariant.ContainerActive },
    '&:disabled': { opacity: 0.55, cursor: 'not-allowed' },
  },
});

// TopUpButton's "leave your tables" note: too long for the chip, so it wraps under it.
globalStyle(`${WalletChip} > p`, { flexBasis: '100%', margin: '0 8px 2px', fontSize: 11 });

export const SectionTitle = style({ margin: 0, fontSize: 17, fontWeight: 800 });

export const GameSection = style({ display: 'flex', flexDirection: 'column', gap: 12 });

export const Live = style([GameSection]);

export const LiveEmpty = style({
  margin: 0,
  padding: '18px 16px',
  borderRadius: 4,
  border: `1px dashed ${color.SurfaceVariant.ContainerLine}`,
  color: muted,
  fontSize: 14,
});

export const LiveList = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  borderRadius: 4,
  border: line,
  background: color.SurfaceVariant.Container,
  overflow: 'hidden',
});

export const LiveRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '12px 14px',
  selectors: {
    '& + &': { borderTop: line },
    '&[data-role="seated"]': { boxShadow: `inset 3px 0 0 ${color.Primary.Main}` },
    // Still listed so you can go back or watch, but not as something happening now.
    '&[data-idle="true"]': { opacity: 0.6 },
  },
  // On a phone the players and the time need the whole width: the button goes under them.
  '@media': { 'screen and (max-width: 560px)': { flexWrap: 'wrap' } },
});

export const LiveThumb = style({
  width: 52,
  height: 52,
  flexShrink: 0,
  borderRadius: 4,
  objectFit: 'cover',
  display: 'block',
});

export const LivePokerThumb = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(ellipse at 50% 60%, #33a865 0%, #1f8048 45%, #135c33 100%)',
  vars: { '--card-w': '22px' },
});

export const LiveThumbCard = style({ margin: '0 -3px' });

export const LiveFootballThumb = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 26,
  background: 'radial-gradient(ellipse at 50% 60%, #3fa34d 0%, #26803a 50%, #165a26 100%)',
});

// Someone moved recently: the game is going on right now.
export const LiveBadge = style({
  display: 'inline-flex',
  whiteSpace: 'nowrap',
  alignItems: 'center',
  gap: 5,
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: color.Success.Main,
  selectors: {
    '&::before': {
      content: '""',
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: color.Success.Main,
    },
  },
});

export const LivePeople = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minWidth: 0,
  marginTop: 4,
});

// The game names the row; the table's own name comes second.
export const LiveGame = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 15,
  fontWeight: 800,
});

export const LiveInfo = style({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  flexGrow: 1,
  flexBasis: 0,
});

export const LiveName = style({
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const LiveWhy = style({
  padding: '1px 7px',
  borderRadius: 999,
  background: color.SurfaceVariant.ContainerHover,
  color: muted,
  fontSize: 11,
  fontWeight: 600,
});

export const LiveDetail = style({
  fontSize: 13,
  color: muted,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  '@media': { 'screen and (max-width: 560px)': { whiteSpace: 'normal' } },
});

export const LiveJoin = style({
  height: 34,
  padding: '0 18px',
  borderRadius: 4,
  border: 'none',
  background: color.Primary.Main,
  color: color.Primary.OnMain,
  fontWeight: 800,
  fontSize: 14,
  cursor: 'pointer',
  flexShrink: 0,
  selectors: { '&:hover': { background: color.Primary.MainHover } },
  '@media': { 'screen and (max-width: 560px)': { flexBasis: '100%' } },
});

export const LiveWatch = style([
  LiveJoin,
  {
    background: 'transparent',
    color: color.SurfaceVariant.OnContainer,
    border: line,
    selectors: { '&:hover': { background: color.SurfaceVariant.ContainerHover } },
  },
]);

export const TileGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))',
  gap: 12,
});

export const Tile = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: 0,
  paddingBottom: 12,
  textAlign: 'left',
  borderRadius: 4,
  overflow: 'hidden',
  border: line,
  background: color.Surface.Container,
  color: 'inherit',
  font: 'inherit',
  cursor: 'pointer',
  selectors: {
    '&:hover': { borderColor: color.Primary.Main },
    '&:focus-visible': { outline: `2px solid ${color.Primary.Main}`, outlineOffset: 2 },
  },
});

export const TileArt = style({ height: 104, overflow: 'hidden', marginBottom: 8 });

export const TileImg = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
});

export const TileName = style({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '0 12px',
  fontWeight: 800,
  fontSize: 15,
});

export const StakeMark = style({
  width: 16,
  height: 16,
  borderRadius: '50%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f5c84b',
  color: '#6b4500',
  fontSize: 10,
  fontWeight: 900,
});

export const TileMeta = style({ padding: '0 12px', fontSize: 12, color: muted });

export const Footnote = style({ margin: 0, fontSize: 12, color: muted });

export const PokerArt = style({
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background:
    'radial-gradient(ellipse at 50% 60%, #33a865 0%, #1f8048 40%, #135c33 75%, #0c4426 100%)',
  vars: { '--card-w': '34px' },
});

export const ArtCard = style({ margin: '0 -7px' });

export const IdleArt = style({
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  background: 'radial-gradient(ellipse at 50% 70%, #6b3a17 0%, #3a1d0e 45%, #160a06 100%)',
});

export const IdleArtIcon = style({ fontSize: 26 });

export const FootballArt = style({
  background: 'radial-gradient(ellipse at 50% 70%, #3f9a4c 0%, #1f6b2e 50%, #0d3a18 100%)',
});
