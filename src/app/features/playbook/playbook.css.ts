import { globalStyle, style } from '@vanilla-extract/css';
import { color } from 'folds';

const muted = `color-mix(in srgb, ${color.Surface.OnContainer} 68%, transparent)`;
const line = color.SurfaceVariant.ContainerLine;
const focus = {
  outline: `2px solid ${color.Primary.Main}`,
  outlineOffset: 2,
};

export const Page = style({
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  color: color.Background.OnContainer,
  background: color.Background.Container,
});

export const Inner = style({
  maxWidth: 1400,
  margin: '0 auto',
  padding: '20px 16px 48px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
});

export const Toolbar = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
});

export const Title = style({ margin: 0, fontSize: 22, fontWeight: 800, marginRight: 8 });
export const Grow = style({ flex: 1 });
export const Muted = style({ color: muted, margin: 0, lineHeight: 1.5 });
export const Small = style({ fontSize: 13 });
export const Error = style({ color: color.Critical.Main, margin: 0, fontSize: 14 });

export const Button = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 34,
  padding: '0 12px',
  borderRadius: 6,
  border: `1px solid ${line}`,
  background: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  font: 'inherit',
  fontSize: 14,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  selectors: {
    '&:hover': { background: color.SurfaceVariant.ContainerHover },
    '&:focus-visible': focus,
    '&:disabled': { opacity: 0.5, cursor: 'default' },
  },
});

export const Primary = style({
  background: color.Primary.Main,
  color: color.Primary.OnMain,
  borderColor: color.Primary.Main,
  selectors: { '&:hover': { background: color.Primary.MainHover } },
});

export const Danger = style({ color: color.Critical.Main });

export const Chip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 30,
  padding: '0 10px',
  borderRadius: 15,
  border: `1px solid ${line}`,
  background: 'transparent',
  color: muted,
  font: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
  selectors: {
    '&[aria-pressed="true"]': {
      background: color.SurfaceVariant.Container,
      color: color.SurfaceVariant.OnContainer,
      borderColor: color.SurfaceVariant.OnContainer,
    },
    '&:focus-visible': focus,
  },
});

export const Dot = style({ width: 10, height: 10, borderRadius: '50%', flex: 'none' });

export const Input = style({
  height: 34,
  padding: '0 10px',
  borderRadius: 6,
  border: `1px solid ${line}`,
  background: color.Background.Container,
  color: color.Background.OnContainer,
  font: 'inherit',
  fontSize: 14,
  minWidth: 0,
  selectors: { '&:focus-visible': focus },
});

export const Search = style([Input, { flex: '1 1 200px', maxWidth: 360 }]);

export const Browse = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(260px, 340px) minmax(0, 1fr)',
  gap: 16,
  alignItems: 'start',
  '@media': { 'screen and (max-width: 900px)': { gridTemplateColumns: 'minmax(0, 1fr)' } },
});

export const RadarColumn = style({
  position: 'sticky',
  top: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  '@media': { 'screen and (max-width: 900px)': { display: 'none' } },
});

export const NarrowOnly = style({
  display: 'none',
  '@media': { 'screen and (max-width: 900px)': { display: 'flex' } },
});

export const Radar = style({
  position: 'relative',
  width: '100%',
  aspectRatio: '1',
  borderRadius: 8,
  overflow: 'hidden',
  border: `1px solid ${line}`,
  background: color.SurfaceVariant.Container,
  userSelect: 'none',
});

export const RadarImage = style({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  pointerEvents: 'none',
});

export const RadarEmpty = style({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  textAlign: 'center',
  color: muted,
  fontSize: 13,
  backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
  backgroundSize: '10% 10%',
});

export const RadarSvg = style({ position: 'absolute', inset: 0, width: '100%', height: '100%' });

export const List = style({
  border: `1px solid ${line}`,
  borderRadius: 8,
  overflow: 'hidden',
});

export const AreaHeading = style({
  margin: 0,
  padding: '8px 12px',
  fontSize: 13,
  fontWeight: 700,
  color: muted,
  background: color.SurfaceVariant.Container,
  borderBottom: `1px solid ${line}`,
});

export const Row = style({
  display: 'grid',
  gridTemplateColumns: '10px minmax(0, 1fr) auto 32px',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  padding: '10px 12px',
  border: 'none',
  borderBottom: `1px solid ${line}`,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontSize: 14,
  textAlign: 'left',
  cursor: 'pointer',
  selectors: {
    '&:hover, &[data-hot="true"]': { background: color.SurfaceVariant.ContainerHover },
    '&:focus-visible': { ...focus, outlineOffset: -2 },
  },
});

export const RowName = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
export const RowMeta = style({ color: muted, fontSize: 13, whiteSpace: 'nowrap' });

export const Empty = style({
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 12,
});

export const ItemLayout = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 260px',
  gap: 16,
  alignItems: 'start',
  '@media': { 'screen and (max-width: 900px)': { gridTemplateColumns: 'minmax(0, 1fr)' } },
});

export const How = style({ margin: '2px 0 0', fontSize: 26, fontWeight: 800, lineHeight: 1.2 });

export const Tabs = style({
  display: 'flex',
  gap: 2,
  borderBottom: `1px solid ${line}`,
});

export const Tab = style({
  padding: '8px 14px',
  border: 'none',
  borderBottom: '2px solid transparent',
  marginBottom: -1,
  background: 'transparent',
  color: muted,
  font: 'inherit',
  fontSize: 14,
  cursor: 'pointer',
  selectors: {
    '&[aria-selected="true"]': {
      color: color.Background.OnContainer,
      borderBottomColor: color.Background.OnContainer,
    },
    '&:focus-visible': focus,
  },
});

export const Stage = style({
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 9',
  background: '#000',
  borderRadius: 8,
  overflow: 'hidden',
});

export const StageMedia = style({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  transition: 'transform 120ms ease-out',
});

export const Zoomable = style({ cursor: 'zoom-in' });
export const Zoomed = style({ cursor: 'zoom-out', transform: 'scale(2)' });

export const StageNote = style({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#d7dde5',
  fontSize: 14,
});

export const Note = style({ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' });

export const Form = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 300px',
  gap: 24,
  alignItems: 'start',
  '@media': { 'screen and (max-width: 900px)': { gridTemplateColumns: 'minmax(0, 1fr)' } },
});

export const Fields = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
});

export const Field = style({ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 });
export const Wide = style({ gridColumn: '1 / -1' });

export const Section = style({ display: 'flex', flexDirection: 'column', gap: 8 });
export const SectionTitle = style({ margin: 0, fontSize: 14, fontWeight: 700 });

export const Drop = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  minHeight: 110,
  padding: 12,
  borderRadius: 8,
  border: `1px dashed ${color.SurfaceVariant.OnContainer}`,
  background: color.SurfaceVariant.Container,
  color: muted,
  font: 'inherit',
  fontSize: 13,
  textAlign: 'center',
  cursor: 'pointer',
  overflow: 'hidden',
  selectors: {
    '&:focus-visible': focus,
    '&[data-over="true"]': { borderColor: color.Primary.Main },
    '&[data-missing="true"]': { borderColor: color.Critical.Main },
  },
});

export const DropPreview = style({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const DropLabel = style({
  position: 'relative',
  padding: '2px 8px',
  borderRadius: 4,
  background: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
});

export const Slots = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 8,
});

export const Progress = style({
  width: '80%',
  height: 4,
  borderRadius: 2,
  background: line,
  overflow: 'hidden',
});

export const ProgressBar = style({ height: '100%', background: color.Primary.Main });

export const Panel = style({
  padding: 16,
  borderRadius: 8,
  border: `1px solid ${line}`,
  background: color.SurfaceVariant.Container,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
});

globalStyle(`${Panel} h2`, { margin: 0, fontSize: 15 });

export const Cards = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: 12,
});

export const Card = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: 0,
  paddingBottom: 10,
  borderRadius: 8,
  border: `1px solid ${color.SurfaceVariant.ContainerLine}`,
  background: color.SurfaceVariant.Container,
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  overflow: 'hidden',
  selectors: {
    '&:hover, &[data-hot="true"]': { borderColor: color.SurfaceVariant.OnContainer },
    '&:focus-visible': { outline: `2px solid ${color.Primary.Main}`, outlineOffset: 2 },
  },
});

export const Thumb = style({
  position: 'relative',
  display: 'block',
  width: '100%',
  aspectRatio: '16 / 9',
  background: '#000',
});

export const ThumbImage = style({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const CardName = style({
  padding: '0 10px',
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.3,
});

export const CardMeta = style({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '0 10px',
  fontSize: 12,
  color: `color-mix(in srgb, ${color.Surface.OnContainer} 68%, transparent)`,
});

export const Extras = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: 8,
});
