import { globalStyle, style } from '@vanilla-extract/css';
import { color } from 'folds';
import { forgeColor } from '../forge-theme/forgeColor.css';
import { forgeRadius, forgeType } from '../forge-theme/tokens';
import { game } from './ui/gameTheme.css';

// Numbers (balance) share the shell's monospace stack; secondary text is the theme ink dimmed.
const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const muted = `color-mix(in srgb, ${color.Surface.OnContainer} 72%, transparent)`;
const line = `1px solid ${color.SurfaceVariant.ContainerLine}`;
const PHONE = 'screen and (max-width: 600px)';

export const Hub = style({
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  color: color.Background.OnContainer,
  background: color.Background.Container,
});

export const HubInner = style({
  maxWidth: 1120,
  margin: '0 auto',
  padding: '24px 16px 48px',
  display: 'flex',
  flexDirection: 'column',
  gap: 36,
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

export const SectionTitle = style({ margin: 0, ...forgeType.title, fontWeight: 800 });

export const SectionHead = style({
  display: 'flex',
  alignItems: 'baseline',
  gap: 12,
  flexWrap: 'wrap',
});

export const VisuallyHidden = style({
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
});

export const GameSection = style({ display: 'flex', flexDirection: 'column', gap: 14 });

/* Happening now: the table that matters most is the banner, the rest a short list beside it. */
export const Live = style({ display: 'flex', flexWrap: 'wrap', gap: 16 });

export const LiveEmpty = style({
  flexBasis: '100%',
  margin: 0,
  padding: '18px 16px',
  borderRadius: forgeRadius.card,
  border: `1px dashed ${color.SurfaceVariant.ContainerLine}`,
  color: muted,
  fontSize: 14,
});

export const Hero = style({
  position: 'relative',
  flex: '999 1 520px',
  minWidth: 0,
  minHeight: 300,
  padding: 28,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  borderRadius: forgeRadius.card,
  border: `1px solid ${game.Line}`,
  background: game.Bg,
  overflow: 'hidden',
  selectors: { '&[data-idle="true"]': { minHeight: 240 } },
  '@media': { [PHONE]: { padding: 20, minHeight: 260 } },
});

export const HeroArt = style({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
});

// The felt and the pitch get their pictures drawn on the right, where the scrim is lightest.
export const HeroPokerArt = style([
  HeroArt,
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: '8%',
    boxSizing: 'border-box',
    background:
      'radial-gradient(ellipse at 75% 50%, #33a865 0%, #1f8048 35%, #135c33 70%, #0c4426 100%)',
    vars: { '--card-w': '64px' },
    '@media': { [PHONE]: { vars: { '--card-w': '40px' } } },
  },
]);

export const HeroFootballArt = style([
  HeroArt,
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: '10%',
    boxSizing: 'border-box',
    fontSize: 96,
    background: 'radial-gradient(ellipse at 75% 50%, #3f9a4c 0%, #1f6b2e 50%, #0d3a18 100%)',
  },
]);

// Text sits on a photo in either theme, so the banner is a stage: dark, with a scrim under
// the words that fades out where the picture is.
export const HeroScrim = style({
  position: 'absolute',
  inset: 0,
  background: `linear-gradient(90deg, color-mix(in srgb, ${game.Bg} 94%, transparent) 0%, color-mix(in srgb, ${game.Bg} 78%, transparent) 45%, color-mix(in srgb, ${game.Bg} 15%, transparent) 100%)`,
  '@media': {
    [PHONE]: {
      background: `linear-gradient(0deg, color-mix(in srgb, ${game.Bg} 96%, transparent) 0%, color-mix(in srgb, ${game.Bg} 70%, transparent) 60%, color-mix(in srgb, ${game.Bg} 30%, transparent) 100%)`,
    },
  },
});

export const HeroBody = style({
  position: 'relative',
  maxWidth: 560,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
});

export const HeroTags = style({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
  ...forgeType.bodySm,
  color: game.Muted,
});

export const HeroLive = style({
  ...forgeType.overline,
  textTransform: 'uppercase',
  padding: '3px 8px',
  borderRadius: forgeRadius.control,
  background: color.Critical.Main,
  color: color.Critical.OnMain,
});

export const HeroTitle = style({
  margin: 0,
  fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
  lineHeight: 1.1,
  fontWeight: 800,
  letterSpacing: '-0.02em',
  overflowWrap: 'anywhere',
});

export const HeroScore = style({
  fontSize: 26,
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
});

export const HeroPeople = style({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
  ...forgeType.bodySm,
  color: game.Muted,
});

export const HeroActions = style({ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 });

export const Side = style({
  flex: '1 1 300px',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
});

export const SideHead = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 8,
});

export const Overline = style({
  margin: 0,
  ...forgeType.overline,
  textTransform: 'uppercase',
  color: muted,
});

export const TextButton = style({
  padding: 0,
  border: 0,
  background: 'none',
  font: 'inherit',
  ...forgeType.bodySm,
  fontWeight: 600,
  color: forgeColor.Ember.Main,
  cursor: 'pointer',
  selectors: { '&:hover': { textDecoration: 'underline' } },
});

export const LiveList = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

export const LiveRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 12,
  borderRadius: forgeRadius.card,
  border: line,
  background: color.Surface.Container,
  selectors: {
    '&[data-role="seated"]': { boxShadow: `inset 3px 0 0 ${color.Primary.Main}` },
    // Still listed so you can go back or watch, but not as something happening now.
    '&[data-idle="true"]': { opacity: 0.6 },
  },
});

export const LiveThumb = style({
  width: 48,
  height: 48,
  flexShrink: 0,
  borderRadius: forgeRadius.control,
  objectFit: 'cover',
  display: 'block',
});

export const LivePokerThumb = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(ellipse at 50% 60%, #33a865 0%, #1f8048 45%, #135c33 100%)',
  vars: { '--card-w': '20px' },
});

export const LiveThumbCard = style({ margin: '0 -3px' });

export const LiveFootballThumb = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 24,
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

// The game names the row; the table's own name comes second.
export const LiveGame = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  fontSize: 14,
  fontWeight: 800,
});

export const LiveInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  minWidth: 0,
  flexGrow: 1,
  flexBasis: 0,
});

export const LiveDetail = style({
  fontSize: 13,
  color: muted,
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

/* The games: card games get big cards with their own buttons, the rest smaller tiles. */
export const WalletNote = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  ...forgeType.bodySm,
  color: muted,
});

export const NoteCoin = style([ChipCoin, { width: 16, height: 16, fontSize: 10 }]);

export const CardGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
  gap: 16,
});

export const GameCard = style({
  display: 'flex',
  flexDirection: 'column',
  borderRadius: forgeRadius.card,
  border: line,
  background: color.Surface.Container,
  overflow: 'hidden',
});

// The art and the name open the game's lobby, like the whole tile always did.
export const CardOpen = style({
  display: 'flex',
  flexDirection: 'column',
  padding: 0,
  border: 0,
  background: 'none',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  selectors: { '&:hover': { background: color.Surface.ContainerHover } },
});

export const CardArt = style({ height: 150, overflow: 'hidden' });

export const CardHead = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 8,
  flexWrap: 'wrap',
  padding: '14px 16px 0',
});

export const CardName = style({ ...forgeType.title, fontWeight: 800 });

export const CardMeta = style({ ...forgeType.caption, color: muted });

export const CardStatus = style({
  margin: 0,
  padding: '6px 16px 0',
  ...forgeType.bodySm,
  color: muted,
  selectors: { '&[data-mine="true"]': { color: forgeColor.Ember.Main, fontWeight: 600 } },
});

export const CardActions = style({
  display: 'flex',
  gap: 8,
  padding: 16,
  marginTop: 'auto',
});

export const CardMain = style({ flexGrow: 1 });

export const MoreGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))',
  gap: 16,
});

export const MoreTile = style([
  GameCard,
  {
    padding: 0,
    textAlign: 'left',
    color: 'inherit',
    font: 'inherit',
    cursor: 'pointer',
    selectors: { '&:hover': { borderColor: color.Primary.Main } },
  },
]);

export const MoreArt = style({ height: 120, overflow: 'hidden' });

export const MoreBody = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: 14,
});

export const MoreName = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
  ...forgeType.heading,
  fontWeight: 800,
});

export const MoreStatus = style([CardStatus, { padding: 0 }]);

export const TileImg = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
});

export const PokerArt = style({
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background:
    'radial-gradient(ellipse at 50% 60%, #33a865 0%, #1f8048 40%, #135c33 75%, #0c4426 100%)',
  vars: { '--card-w': '44px' },
});

export const ArtCard = style({ margin: '0 -8px' });

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
