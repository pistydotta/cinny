import { globalStyle, style } from '@vanilla-extract/css';

export const Page = style({
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  color: '#f4f6fa',
  background: 'radial-gradient(ellipse at top, #20364a, #0c1420 65%)',
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
  border: '1px solid #ffffff24',
  borderRadius: 16,
  background: '#ffffff08',
  minWidth: 0,
});
export const Grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
  gap: 16,
});
export const Button = style({
  border: '1px solid #f5c84b88',
  borderRadius: 8,
  color: '#f5c84b',
  background: '#f5c84b12',
  padding: '10px 16px',
  cursor: 'pointer',
  selectors: {
    '&:disabled': { opacity: 0.4, cursor: 'default' },
    '&:focus-visible': { outline: '3px solid #9bc6ff', outlineOffset: 3 },
  },
});
export const Input = style({
  background: '#0c1420',
  color: '#fff',
  border: '1px solid #ffffff55',
  borderRadius: 8,
  padding: 10,
  width: '100%',
  maxWidth: 400,
  boxSizing: 'border-box',
});
export const Label = style({ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 });
export const Muted = style({ color: '#bec9d8', lineHeight: 1.6, whiteSpace: 'pre-wrap' });
export const Error = style({ color: '#ffb4ab' });
export const Players = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
  gap: 10,
});
export const Seat = style({
  padding: 12,
  border: '1px solid #ffffff22',
  borderRadius: 10,
  overflowWrap: 'anywhere',
  selectors: {
    '&[data-turn="true"]': { borderColor: '#f5c84b', background: '#f5c84b12' },
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
    '&:focus-visible': { outline: '3px solid #f5c84b', outlineOffset: 4 },
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
    '&[data-selected="true"]': { boxShadow: 'inset 0 0 0 4px #b76a05' },
    '&[data-legal="true"]': { boxShadow: 'inset 0 0 0 4px #196cba' },
    '&:focus-visible': { outline: '4px solid #9744d2', outlineOffset: -4, zIndex: 1 },
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
globalStyle(`${Panel} summary`, { cursor: 'pointer', marginBottom: 12 });
