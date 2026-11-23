import { globalStyle, style } from '@vanilla-extract/css';
import { game, LobbyScope, StageScope } from '../ui/gameTheme.css';
import { gameButton, TopBar } from '../ui/gameUi.css';
import { forgeInset, forgeRadius, forgeType, forgeZ } from '../../forge-theme/tokens';

// Chess and Fodinha's screen on the games kit: chess (lobby and board) follows the theme,
// Fodinha's table is the stage.

const page = {
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  backgroundColor: game.Bg,
} as const;
export const Page = style([LobbyScope, page]);
export const StagePage = style([StageScope, page]);
// The kit's top bar stays put while the page scrolls under it.
globalStyle(`${Page} > ${TopBar}, ${StagePage} > ${TopBar}`, {
  position: 'sticky',
  top: 0,
  zIndex: forgeZ.sticky,
});
export const Inner = style({
  maxWidth: 1100,
  margin: '0 auto',
  padding: '24px 16px 48px',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
});
export const Row = style({ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' });
export const Panel = style({
  padding: 20,
  borderRadius: forgeRadius.card,
  backgroundColor: game.Raised,
  boxShadow: forgeInset(game.Line),
  minWidth: 0,
});
export const Grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
  gap: 16,
});
export const Button = gameButton({ variant: 'secondary', size: 'md' });
export const PrimaryButton = gameButton({ variant: 'primary', size: 'md' });
export const Input = style({
  height: 40,
  padding: '0 12px',
  border: 0,
  borderRadius: forgeRadius.control,
  backgroundColor: game.Bg,
  boxShadow: forgeInset(game.Line),
  color: game.Ink,
  font: 'inherit',
  width: '100%',
  maxWidth: 400,
  boxSizing: 'border-box',
  outline: 'none',
  selectors: { '&:focus': { boxShadow: forgeInset(game.Accent, 2) } },
});
export const Label = style({ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 });
export const Muted = style({ color: game.Muted, lineHeight: 1.6, whiteSpace: 'pre-wrap' });
export const Error = style({ color: game.Critical });
export const Players = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
  gap: 10,
});
export const Seat = style({
  padding: 12,
  borderRadius: forgeRadius.card,
  boxShadow: forgeInset(game.Line),
  overflowWrap: 'anywhere',
  selectors: {
    '&[data-turn="true"]': {
      boxShadow: forgeInset(game.Accent),
      background: `color-mix(in srgb, ${game.Accent} 12%, transparent)`,
    },
    '&[data-out="true"]': { opacity: 0.5 },
  },
});
export const Table = style({
  borderRadius: 24,
  background: 'radial-gradient(ellipse, #185246, #11352e)',
  border: '6px solid #66442f',
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 16,
  minHeight: 160,
});
export const Card = style({
  padding: '14px 10px',
  minWidth: 54,
  borderRadius: 8,
  background: '#fff7e8',
  color: '#142033',
  fontSize: 23,
  fontWeight: 800,
  border: '2px solid transparent',
  cursor: 'pointer',
  selectors: {
    '&[data-red="true"]': { color: '#ae2338' },
    '&:disabled': { cursor: 'default', opacity: 0.65 },
    '&:focus-visible': { outline: `3px solid ${game.Accent}`, outlineOffset: 4 },
  },
});
export const ChessLayout = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.6fr) minmax(220px, 1fr)',
  gap: 20,
  '@media': { 'screen and (max-width: 760px)': { gridTemplateColumns: '1fr' } },
});
export const Board = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(8, 1fr)',
  width: '100%',
  maxWidth: 560,
  aspectRatio: '1',
  border: '4px solid #6f533c',
  borderRadius: 4,
  overflow: 'hidden',
});
export const Square = style({
  position: 'relative',
  minWidth: 0,
  padding: 0,
  aspectRatio: '1',
  border: 0,
  background: '#ebd8b4',
  fontSize: 'clamp(20px, 5vw, 44px)',
  lineHeight: 1,
  cursor: 'pointer',
  selectors: {
    '&[data-dark="true"]': { background: '#799681' },
    '&[data-color="w"]': { color: '#fff', textShadow: '0 1px 2px #000, 1px 0 1px #000' },
    '&[data-color="b"]': { color: '#142031', textShadow: '0 1px 1px #ffffff88' },
    '&[data-selected="true"]': { boxShadow: `inset 0 0 0 4px ${game.Accent}` },
    '&[data-legal="true"]': { boxShadow: 'inset 0 0 0 4px #196cba' },
    '&:focus-visible': { outline: `4px solid ${game.Accent}`, outlineOffset: -4, zIndex: 1 },
  },
});
export const Coordinate = style({
  position: 'absolute',
  left: 3,
  bottom: 2,
  fontSize: 10,
  color: '#17231a',
  textShadow: 'none',
});
export const Comments = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  maxHeight: 360,
  overflowY: 'auto',
  overflowWrap: 'anywhere',
  padding: '12px 0',
});
globalStyle(`${Inner} h1, ${Inner} h2, ${Inner} h3, ${Inner} p`, { margin: 0 });
globalStyle(`${Inner} h2`, forgeType.heading);
globalStyle(`${Panel} summary`, { cursor: 'pointer', marginBottom: 12 });
