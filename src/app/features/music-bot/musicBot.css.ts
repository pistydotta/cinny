import { style } from '@vanilla-extract/css';
import { color } from 'folds';

export const Bar = style({
  flexShrink: 0,
  minWidth: 0,
  margin: '4px 8px 8px',
  borderRadius: 10,
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
    padding: '8px 10px',
    background: 'transparent',
  },
]);
export const BrandIcon = style({
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  width: 28,
  height: 28,
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
  gap: 8,
  padding: '4px 12px 12px',
  maxHeight: 'min(320px, 38vh)',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
});
export const NowPlaying = style({ display: 'flex', gap: 12, alignItems: 'center', paddingTop: 8 });
export const Cover = style({
  width: 36,
  height: 36,
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
  width: '100%',
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
export const Empty = style({ display: 'flex', flexDirection: 'column', gap: 5, padding: '8px 0' });
export const Toolbar = style({
  padding: '0 8px 8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'nowrap',
  gap: 6,
});
export const VolumeLabel = style({
  display: 'flex',
  alignItems: 'center',
  flex: 1,
  minWidth: 0,
  maxWidth: 100,
  gap: 4,
  fontSize: 10,
  color: color.Surface.OnContainer,
});
export const Volume = style({
  appearance: 'none',
  WebkitAppearance: 'none',
  width: 0,
  minWidth: 16,
  flex: 1,
  height: 24,
  padding: 0,
  margin: 0,
  border: 0,
  background: 'transparent',
  cursor: 'pointer',
  selectors: {
    '&:focus-visible': { outline: `2px solid ${color.Primary.Main}`, outlineOffset: 3 },
    '&::-webkit-slider-runnable-track': {
      height: 4,
      borderRadius: 4,
      background: `linear-gradient(to right, ${color.Primary.Main} var(--music-volume), ${color.Surface.ContainerActive} var(--music-volume))`,
    },
    '&::-webkit-slider-thumb': {
      appearance: 'none',
      WebkitAppearance: 'none',
      width: 12,
      height: 12,
      marginTop: -4,
      border: 0,
      borderRadius: '50%',
      background: color.Primary.Main,
    },
    '&::-moz-range-track': {
      height: 4,
      borderRadius: 4,
      background: color.Surface.ContainerActive,
    },
    '&::-moz-range-progress': {
      height: 4,
      borderRadius: 4,
      background: color.Primary.Main,
    },
    '&::-moz-range-thumb': {
      width: 12,
      height: 12,
      border: 0,
      borderRadius: '50%',
      background: color.Primary.Main,
    },
  },
});
export const VolumeValue = style({
  flexShrink: 0,
  minWidth: 28,
  fontVariantNumeric: 'tabular-nums',
});
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
export const AddForm = style({ display: 'flex', flexDirection: 'column', gap: 6 });
export const InputLabel = style({ fontSize: 11, fontWeight: 600 });
export const InputRow = style({ display: 'flex', gap: 6, minWidth: 0 });
export const Search = style({
  width: '100%',
  minWidth: 0,
  flex: 1,
  padding: '8px 10px',
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
export const QueueToggle = style([
  button,
  {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 0',
    fontSize: 12,
    background: 'transparent',
    borderTop: `1px solid ${color.Surface.ContainerLine}`,
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
export const QueueItem = style({ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' });
export const QueueNumber = style({
  width: 18,
  fontSize: 11,
  color: color.Surface.OnContainer,
});
export const QueueTitle = style({
  fontSize: 12,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const Scope = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '10px',
  background: color.Primary.Container,
  borderBottom: `1px solid ${color.Surface.ContainerLine}`,
});
export const ScopeShared = style({
  background: color.Success.Container,
  color: color.Success.OnContainer,
});
export const ScopeStatus = style({ display: 'flex', alignItems: 'center', gap: 8 });
export const ScopeInfo = style({ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 });
export const ScopeTitle = style({ fontSize: 12, lineHeight: 1.4, overflowWrap: 'anywhere' });
export const ScopeHint = style({ fontSize: 10, lineHeight: 1.5, opacity: 0.8 });
export const ScopeButton = style([
  button,
  {
    background: color.Surface.Container,
    color: color.Surface.OnContainer,
    fontSize: 11,
    fontWeight: 600,
    padding: '7px 10px',
    borderRadius: 6,
    textAlign: 'center',
  },
]);
