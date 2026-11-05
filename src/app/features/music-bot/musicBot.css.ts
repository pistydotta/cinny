import { style } from '@vanilla-extract/css';
import { color } from 'folds';

export const Bar = style({
  flexShrink: 0,
  minWidth: 0,
  margin: '8px 12px',
  maxWidth: 720,
  borderRadius: 14,
  border: `1px solid ${color.Surface.ContainerLine}`,
  background: color.Background.Container,
  overflow: 'hidden',
});
const button = {
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
  border: 0,
  selectors: {
    '&:focus-visible': { outline: `2px solid ${color.Primary.Main}`, outlineOffset: -3 },
    '&:disabled': { opacity: 0.45, cursor: 'default' },
  },
} as const;
export const Toggle = style([
  button,
  {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    textAlign: 'left',
    padding: '10px 12px',
    background: 'transparent',
  },
]);
export const BrandIcon = style({
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  width: 34,
  height: 34,
  borderRadius: 10,
  color: color.Primary.Main,
  background: color.Primary.Container,
});
export const Summary = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  flex: 1,
  minWidth: 0,
});
export const Eyebrow = style({
  fontSize: 11,
  fontWeight: 600,
  color: color.Surface.OnContainer,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
export const SummaryTitle = style({
  fontSize: 13,
  fontWeight: 600,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
export const Count = style({
  fontSize: 11,
  padding: '3px 7px',
  borderRadius: 6,
  color: color.Surface.OnContainer,
  background: color.Surface.Container,
});
export const Panel = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: '4px 12px 12px',
  maxHeight: 'min(440px, 45vh)',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
});
export const NowPlaying = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  alignItems: 'center',
  paddingTop: 4,
});
export const Controls = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 6,
  flexShrink: 0,
});
export const ProgressRow = style({ display: 'flex', alignItems: 'center', gap: 8 });
export const Cover = style({
  width: 60,
  height: 60,
  borderRadius: 10,
  objectFit: 'cover',
  flexShrink: 0,
  background: color.Surface.ContainerActive,
});
export const CoverIcon = style([
  Cover,
  { display: 'grid', placeItems: 'center', color: color.Primary.Main },
]);
export const TrackInfo = style({
  minWidth: 0,
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  overflowWrap: 'anywhere',
});
export const TitleLink = style({
  color: 'inherit',
  fontSize: 14,
  fontWeight: 600,
  textDecoration: 'none',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  selectors: { '&:hover': { textDecoration: 'underline' } },
});
export const Progress = style({
  appearance: 'none',
  display: 'block',
  flex: 1,
  minWidth: 0,
  height: 4,
  border: 0,
  borderRadius: 3,
  overflow: 'hidden',
  accentColor: color.Primary.Main,
  selectors: {
    '&::-webkit-progress-bar': { background: color.Surface.ContainerActive },
    '&::-webkit-progress-value': { background: color.Primary.Main },
    '&::-moz-progress-bar': { background: color.Primary.Main },
  },
});
export const Timing = style({
  fontSize: 10,
  fontVariantNumeric: 'tabular-nums',
  color: color.Surface.OnContainer,
});
export const VolumeLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 10,
  color: color.Surface.OnContainer,
});
export const Volume = style({ width: 72, accentColor: color.Primary.Main });
export const Notice = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 8,
  padding: 10,
  background: color.Primary.Container,
  borderRadius: 8,
});
export const Hint = style({
  fontSize: 11,
  lineHeight: 1.5,
  margin: 0,
  color: color.Surface.OnContainer,
});
export const InputRow = style({ display: 'flex', gap: 6, minWidth: 0 });
export const Search = style({
  width: '100%',
  minWidth: 0,
  flex: 1,
  padding: '10px 12px',
  borderRadius: 8,
  font: 'inherit',
  fontSize: 13,
  border: `1px solid ${color.Surface.ContainerLine}`,
  color: 'inherit',
  background: color.Surface.Container,
  selectors: {
    '&:focus-visible': { outline: `2px solid ${color.Primary.Main}`, outlineOffset: -1 },
  },
});
export const PrimaryButton = style([
  button,
  {
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 600,
    background: color.Primary.Main,
    color: color.Primary.OnMain,
    flexShrink: 0,
  },
]);
export const Error = style({
  fontSize: 12,
  lineHeight: 1.5,
  padding: 10,
  borderRadius: 8,
  background: color.Critical.Container,
  color: color.Critical.OnContainer,
  overflowWrap: 'anywhere',
});
export const QueueBlock = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  paddingTop: 8,
  borderTop: `1px solid ${color.Surface.ContainerLine}`,
});
export const QueueHeading = style({
  fontSize: 11,
  fontWeight: 600,
  color: color.Surface.OnContainer,
});
export const QueueToggle = style([
  button,
  {
    alignSelf: 'flex-start',
    padding: '4px 0',
    fontSize: 12,
    color: color.Primary.Main,
    background: 'transparent',
  },
]);
export const Queue = style({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});
export const QueueItem = style({ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' });
export const QueueNumber = style({
  width: 18,
  fontSize: 11,
  color: color.Surface.OnContainer,
});
export const QueueMeta = style({
  fontSize: 11,
  flexShrink: 0,
  color: color.Surface.OnContainer,
});
export const QueueTitle = style({
  flex: 1,
  minWidth: 0,
  fontSize: 12,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});
