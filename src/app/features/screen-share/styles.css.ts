import { globalStyle, keyframes, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { color, config, toRem } from 'folds';

// Over the call frame, where Element Call keeps an empty grid tile for each share not watched
// yet; clipped to the frame, so a tile scrolled out of the grid is hidden here too.
export const LiveTiles = style({
  position: 'fixed',
  zIndex: 2,
  overflow: 'hidden',
  pointerEvents: 'none',
});

// The whole tile is the watch button, on Element Call's tile and as round as the people's. The
// share's last picture fills it, blurred and darkened so the badge, the Watch button and the
// name read on any screen. Dark in every theme: it is video.
export const LiveTile = style({
  position: 'absolute',
  pointerEvents: 'auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  overflow: 'hidden',
  border: 'none',
  borderRadius: toRem(16),
  backgroundColor: '#1B1E23',
  color: '#F2F4F7',
  cursor: 'pointer',
  selectors: {
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      backgroundColor: 'rgba(10, 12, 16, 0.45)',
      transition: 'background-color 120ms ease-out',
    },
    '&:hover::after': { backgroundColor: 'rgba(10, 12, 16, 0.3)' },
    '&:focus-visible': { outline: `2px solid ${color.Primary.Main}`, outlineOffset: -2 },
  },
});

export const LiveTileShot = style({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  filter: 'blur(10px)',
  // Scaled so the blur's soft edge falls outside the tile.
  transform: 'scale(1.15)',
});

export const LiveTileIcon = style({ position: 'relative', zIndex: 1, opacity: 0.35 });

// A round play button with the word under it, like a paused video: it reads as "press to watch"
// at a glance. Warm cream, like the controls over a watched share; ember under the pointer.
export const LiveTileWatch = style({
  position: 'absolute',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: config.space.S100,
  color: '#F0D9BC',
  textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
});

export const LiveTileDisc = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: toRem(48),
  height: toRem(48),
  borderRadius: '50%',
  backgroundColor: 'rgba(240, 217, 188, 0.92)',
  color: '#14161A',
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.45)',
  transition: 'transform 120ms ease-out, background-color 120ms ease-out',
  selectors: {
    [`${LiveTile}:hover &, ${LiveTile}:focus-visible &`]: {
      transform: 'scale(1.08)',
      backgroundColor: '#FFA45C',
    },
  },
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } },
});
// The play triangle's weight sits left of its box; nudge it to look centred.
globalStyle(`${LiveTileDisc} svg`, { marginLeft: toRem(3) });

export const LiveTileName = style({
  position: 'absolute',
  zIndex: 1,
  left: config.space.S200,
  bottom: config.space.S200,
  maxWidth: `calc(100% - 2 * ${config.space.S200})`,
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S100,
  padding: `2px ${config.space.S200}`,
  borderRadius: config.radii.Pill,
  backgroundColor: 'rgba(10, 12, 16, 0.6)',
});

export const CompactCards = style({ padding: config.space.S200, minWidth: 0 });

export const CompactCard = style({
  minWidth: 0,
  padding: `${config.space.S100} ${config.space.S100} ${config.space.S100} ${config.space.S200}`,
  backgroundColor: color.SurfaceVariant.Container,
  borderRadius: config.radii.R300,
});

export const LiveName = style({ minWidth: 0, maxWidth: '100%' });

export const LiveBadge = style({
  position: 'absolute',
  zIndex: 1,
  top: config.space.S200,
  right: config.space.S200,
});

export const Controls = style({
  padding: `${config.space.S200} ${config.space.S400} 0`,
});

// The owner's capture controls wrap on phones instead of squeezing the preview and name.
export const Row = style({
  minHeight: toRem(36),
  flexWrap: 'wrap',
  rowGap: config.space.S100,
});

export const Slider = style({
  appearance: 'none',
  width: toRem(120),
  height: toRem(4),
  flexShrink: 0,
  borderRadius: config.radii.Pill,
  backgroundColor: color.SurfaceVariant.ContainerLine,
  cursor: 'pointer',
});

const thumb = {
  appearance: 'none',
  width: toRem(14),
  height: toRem(14),
  borderRadius: '50%',
  border: 'none',
  backgroundColor: color.Primary.Main,
} as const;

globalStyle(`${Slider}::-webkit-slider-thumb`, thumb);
globalStyle(`${Slider}::-moz-range-thumb`, thumb);

export const Preview = style({
  width: toRem(72),
  height: toRem(40),
  flexShrink: 0,
  objectFit: 'contain',
  borderRadius: config.radii.R300,
  backgroundColor: color.Background.Container,
});
// The room card's own palette: gunmetal steel, with a darker band for the room. Fixed
// rather than themed, so the card reads as the same object in every theme.
const STEEL = {
  card: '#262B31',
  band: '#1D2126',
  line: '#38404A',
  plate: '#2F363E',
  plateLine: '#434C57',
  text: '#ECEFF2',
  muted: '#98A2AD',
};

export const FloatingCall = recipe({
  base: {
    position: 'fixed',
    right: 16,
    bottom: 100,
    borderRadius: 12,
    border: `1px solid ${color.SurfaceVariant.ContainerLine}`,
    background: color.Surface.Container,
    color: color.Surface.OnContainer,
    boxShadow: '0 12px 40px #0008',
    zIndex: 50,
    overflow: 'hidden',
  },
  variants: {
    watching: {
      // A small window: its title bar (FloatingBar), then the live.
      true: {
        width: 'min(480px, calc(100vw - 32px), 96dvh)',
        border: '1px solid #2A2E36',
        background: '#090a0c',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.55)',
      },
      false: {
        width: 'min(300px, calc(100vw - 32px))',
        borderRadius: 14,
        borderColor: STEEL.line,
        background: STEEL.card,
        color: STEEL.text,
      },
    },
  },
});
export const FloatingStage = recipe({
  base: { width: '100%' },
  variants: {
    // Nothing to show while no share is watched; the iframe stays mounted, just out of sight.
    watching: { true: { aspectRatio: '16 / 9', background: '#090a0c' }, false: { height: 0 } },
  },
});
// A small window: a title bar with who is live and the buttons, the share under it. The bar is
// the box's own, outside the stage, so the call iframe never covers it; it is the drag handle.
export const FloatingBar = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  height: toRem(40),
  padding: `0 ${config.space.S100} 0 ${config.space.S300}`,
  backgroundColor: '#1C1F25',
  boxShadow: 'inset 0 -1px 0 rgba(240, 217, 188, 0.08)',
  color: '#F0D9BC',
  cursor: 'grab',
  touchAction: 'none',
  userSelect: 'none',
});

export const FloatingWho = style({
  flex: '1 1 auto',
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
});

export const FloatingButtons = style({ display: 'flex', flexShrink: 0, gap: 2 });

// Soft square keys, like the watch screen's title bar.
export const FloatingKey = style({
  width: toRem(28),
  height: toRem(28),
  minWidth: 0,
  padding: 0,
  justifyContent: 'center',
  transition: 'background-color 120ms ease-out, color 120ms ease-out',
  selectors: {
    '&&': { color: '#F0D9BC', backgroundColor: 'transparent' },
    '&&:hover': { color: '#FFE6C8', backgroundColor: 'rgba(255, 164, 92, 0.18)' },
  },
});
export const FloatingKeyOff = style({ selectors: { '&&&': { color: '#F2705E' } } });
// Stop watching closes the window: red, like a window's close.
export const FloatingKeyClose = style({
  selectors: {
    '&&&': { color: '#F2705E' },
    '&&&:hover': { color: '#FFF4EC', backgroundColor: '#D9412B' },
  },
});

// The resize corners, in a layer above the call iframe at the box's place. They show only as
// the pointer's resize arrows, except a small grip in the bottom right, like a window's.
export const FloatingChrome = style({
  position: 'fixed',
  zIndex: 52,
  pointerEvents: 'none',
});

export const FloatingCorner = recipe({
  base: {
    pointerEvents: 'auto',
    position: 'absolute',
    width: toRem(18),
    height: toRem(18),
    touchAction: 'none',
  },
  variants: {
    corner: {
      nw: { top: -3, left: -3, cursor: 'nwse-resize' },
      ne: { top: -3, right: -3, cursor: 'nesw-resize' },
      sw: { bottom: -3, left: -3, cursor: 'nesw-resize' },
      se: { bottom: -3, right: -3, cursor: 'nwse-resize' },
    },
  },
});

// Two short diagonal strokes, faint until the pointer is over the live or the grip itself.
export const FloatingGrip = style({
  position: 'absolute',
  right: toRem(7),
  bottom: toRem(7),
  width: toRem(10),
  height: toRem(10),
  pointerEvents: 'none',
  opacity: 0,
  backgroundImage:
    'linear-gradient(135deg, transparent 45%, rgba(240, 217, 188, 0.9) 45%, rgba(240, 217, 188, 0.9) 55%, transparent 55%), ' +
    'linear-gradient(135deg, transparent 75%, rgba(240, 217, 188, 0.9) 75%, rgba(240, 217, 188, 0.9) 85%, transparent 85%)',
  filter: 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))',
  transition: 'opacity 250ms ease-out',
  selectors: { [`${FloatingChrome}:hover &`]: { opacity: 1 } },
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } },
});
export const FloatingGripAwake = style({ opacity: 0.6 });

export const OwnerVolume = style({ display: 'flex', flexDirection: 'column', gap: 4 });

// The floating box while nothing is watched: a small room card instead of an empty stage.
// The whole card is the drag handle.
export const RoomPill = style({
  display: 'flex',
  flexDirection: 'column',
  cursor: 'grab',
  touchAction: 'none',
  userSelect: 'none',
});
// The room sits on a band of its own, so the title is anchored rather than floating.
export const RoomCardHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: toRem(10),
  padding: `${toRem(10)} ${toRem(8)} ${toRem(10)} ${toRem(10)}`,
  background: STEEL.band,
  borderBottom: `1px solid ${STEEL.line}`,
});
globalStyle(`${RoomCardHeader} button`, { color: STEEL.muted });
export const RoomCardPlate = style({
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  width: toRem(34),
  height: toRem(34),
  borderRadius: toRem(8),
  background: STEEL.plate,
  border: `1px solid ${STEEL.plateLine}`,
});
export const RoomCardTitle = style({
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  minWidth: 0,
  lineHeight: 1.25,
});
export const RoomCardName = style({ fontWeight: 600, color: STEEL.text });
export const RoomCardSpace = style({ color: STEEL.muted });
export const RoomCardPeople = style({
  display: 'flex',
  alignItems: 'center',
  gap: toRem(8),
  padding: `${toRem(10)} ${toRem(10)} ${toRem(11)} ${toRem(12)}`,
});
export const RoomCardStatus = style({ flexGrow: 1, minWidth: 0, color: STEEL.muted });

// Green means someone is talking, here and in the faces' rings, so at rest the speaker is grey.
export const Speaker = recipe({
  base: { flexShrink: 0, transition: 'color 200ms' },
  variants: {
    talking: {
      true: { color: color.Success.Main },
      false: { color: color.Surface.OnContainer, opacity: 0.7 },
    },
  },
});
const ripple = keyframes({
  '0%, 100%': { opacity: 0.15 },
  '35%': { opacity: 1 },
});
export const SpeakerWave = recipe({
  base: { transition: 'opacity 200ms' },
  variants: {
    talking: {
      true: {
        animation: `${ripple} 1.1s ease-in-out infinite`,
        '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
      },
      false: {},
    },
  },
});

// Overlapping faces, each still mostly visible.
export const Faces = style({ display: 'flex', alignItems: 'center', flexShrink: 0 });
export const Face = recipe({
  base: {
    boxShadow: `0 0 0 2px ${STEEL.card}`,
    transition: 'box-shadow 120ms, transform 120ms',
    selectors: { '& + &': { marginLeft: toRem(-8) } },
  },
  variants: {
    speaking: {
      true: {
        boxShadow: `0 0 0 2px ${STEEL.card}, 0 0 0 4px ${color.Success.Main}`,
        transform: 'translateY(-2px)',
        zIndex: 1,
      },
      false: {},
    },
    small: {
      true: { selectors: { '& + &': { marginLeft: toRem(-6) } } },
      false: {},
    },
  },
});
export const FaceMore = style({
  display: 'grid',
  placeItems: 'center',
  width: toRem(32),
  height: toRem(32),
  marginLeft: toRem(-8),
  borderRadius: '50%',
  fontSize: toRem(11),
  fontWeight: 600,
  background: STEEL.plate,
  color: STEEL.text,
  boxShadow: `0 0 0 2px ${STEEL.card}`,
});
export const GoToRoom = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: toRem(4),
  flexShrink: 0,
  padding: `${toRem(5)} ${toRem(10)} ${toRem(5)} ${toRem(12)}`,
  border: 'none',
  borderRadius: config.radii.Pill,
  background: color.Primary.Container,
  color: color.Primary.OnContainer,
  fontSize: toRem(12),
  fontWeight: 600,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: color.Primary.ContainerHover },
    '&:focus-visible': { outline: `2px solid ${color.Primary.Main}`, outlineOffset: 2 },
  },
});

// The watched share's controls, as small chips in its corners instead of a bar: who is live at
// the top left, people/fullscreen/stop at the top right, the sound at the bottom right. The box
// matches the share; only the chips take clicks. Above the call iframe.
export const LiveOverlay = style({
  position: 'fixed',
  zIndex: 2,
  pointerEvents: 'none',
});

export const LiveCorners = style({
  position: 'absolute',
  inset: 0,
});
// Each group fades on its own: only the ones over the picture sleep (LiveOverlay).
globalStyle(`${LiveCorners} > *`, {
  transition: 'opacity 250ms ease-out',
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } },
});

// Asleep after the pointer rests; pointing at a chip or tabbing into one brings them back.
export const LiveAsleep = style({
  opacity: 0,
  selectors: { '&:hover, &:focus-within': { opacity: 1 } },
});

// Warm ash and ember: the call's controls over a share, tied to the Forge palette.
const ASH = {
  icon: '#F0D9BC',
  muted: '#B39A7C',
  line: 'rgba(240, 217, 188, 0.35)',
  off: '#F2705E',
  on: '#FFA45C',
  leave: '#D9412B',
  leaveHover: '#E85238',
  onLeave: '#FFF4EC',
};

// Keeps the controls readable on any picture.
const shadow = 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9)) drop-shadow(0 0 6px rgba(0, 0, 0, 0.5))';

// Always dark, whatever the theme: they sit on video, like the call's own name tags.
const chip = {
  pointerEvents: 'auto',
  display: 'flex',
  alignItems: 'center',
  color: ASH.icon,
  backgroundColor: 'rgba(16, 18, 22, 0.75)',
  borderRadius: config.radii.R300,
} as const;

export const LiveChip = style(chip);

export const LiveWho = style({
  backgroundColor: 'transparent',
  minWidth: 0,
  gap: config.space.S200,
  padding: `${config.space.S100} ${config.space.S300}`,
});

const pulse = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.35 },
});

export const LiveDot = style({
  width: toRem(8),
  height: toRem(8),
  flexShrink: 0,
  borderRadius: '50%',
  backgroundColor: '#FF5A4F',
  animation: `${pulse} 2s ease-in-out infinite`,
  '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
});

export const LiveTag = style({
  flexShrink: 0,
  color: ASH.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
});

export const LiveButtons = style({
  display: 'flex',
  flexShrink: 0,
  gap: config.space.S200,
});

// Who is live and the share's own buttons, in one row. Over the picture's top edge when there's
// no room above it: bare, with a shadow, fading while the pointer rests.
export const LiveTop = style({
  position: 'absolute',
  top: config.space.S100,
  left: config.space.S100,
  right: config.space.S100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: config.space.S300,
  pointerEvents: 'none',
});
globalStyle(`${LiveTop} > ${LiveWho}`, { filter: shadow, maxWidth: '60%' });

// With room above the picture it is a bar of its own, joined to the picture's top edge like a
// window's title bar, with the buttons as soft square keys. It never fades: it covers nothing.
export const LiveTopBar = style({
  top: 'auto',
  left: 0,
  right: 0,
  bottom: '100%',
  height: toRem(44),
  padding: `0 ${config.space.S200} 0 ${config.space.S100}`,
  backgroundColor: '#1C1F25',
  borderRadius: `${toRem(12)} ${toRem(12)} 0 0`,
  boxShadow: 'inset 0 -1px 0 rgba(240, 217, 188, 0.08)',
});
globalStyle(`${LiveTopBar} > ${LiveWho}`, { filter: 'none' });
globalStyle(`${LiveTopBar} ${LiveButtons}`, { gap: config.space.S100 });

// Bare icons over the share: warm off-white with a shadow so they read on any picture, no chip behind.
export const LiveChipButton = style({
  justifyContent: 'center',
  flexShrink: 0,
  pointerEvents: 'auto',
  filter: shadow,
  // Doubled to beat folds' own variant colours.
  selectors: {
    '&&': { color: ASH.icon, backgroundColor: 'transparent' },
    '&&:hover, &&[aria-pressed=true]': {
      color: '#FFE6C8',
      backgroundColor: 'rgba(255, 164, 92, 0.18)',
    },
  },
});

// A switched-off control (mic, sound, hidden people): coal red, still readable on video.
export const LiveOff = style({ selectors: { '&&&': { color: ASH.off } } });
// Something of yours that's on and shows to others (your share, the chat): ember.
export const LiveOn = style({ selectors: { '&&&': { color: ASH.on } } });
globalStyle(`${LiveTopBar} ${LiveChipButton}`, {
  filter: 'none',
  width: toRem(32),
  height: toRem(32),
  minWidth: 0,
  padding: 0,
  borderRadius: config.radii.R300,
  transition: 'background-color 120ms ease-out',
});
globalStyle(`${LiveTopBar} ${LiveChipButton}:not(:hover)`, {
  backgroundColor: 'rgba(240, 217, 188, 0.07) !important',
});

// The call's buttons along the share's bottom edge: centred, with the share's sound on the right.
export const LiveCall = style({
  position: 'absolute',
  left: config.space.S300,
  right: config.space.S300,
  bottom: config.space.S300,
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  alignItems: 'center',
  gap: config.space.S300,
  pointerEvents: 'none',
});

// Under the picture, in the letterbox space, so nothing covers what's shared.
export const LiveCallBelow = style({
  top: `calc(100% + ${config.space.S200})`,
  bottom: 'auto',
});
// The same row as the call's own bar when nothing is watched, so entering a live changes
// nothing about the buttons.
export const LiveCallDocked = style({
  position: 'relative',
  left: 'auto',
  right: 'auto',
  bottom: 'auto',
  flexShrink: 0,
  padding: `${config.space.S300} ${config.space.S300} ${config.space.S400}`,
});

// The call is always dark, like the video in it, so its cream buttons read in every theme.
export const CallDark = style({ backgroundColor: '#14161A', color: '#F0D9BC' });

// Each button floats on its own: it rises a little under the pointer.
const floaty = `${LiveCallBelow} button, ${LiveCallDocked} button`;
globalStyle(floaty, {
  transition: 'transform 120ms ease-out, background-color 120ms ease-out',
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } },
});
globalStyle(
  `${LiveCallBelow} button:hover:not(:disabled), ${LiveCallDocked} button:hover:not(:disabled)`,
  {
    transform: 'translateY(-2px)',
  }
);

export const LiveCallCenter = style({
  gridColumn: 2,
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S500,
});

// Buttons that belong together (voice, video, chat) sit close; the groups stand apart.
export const LiveCallGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S100,
});

export const LiveArrow = style({
  pointerEvents: 'auto',
  filter: shadow,
  marginLeft: toRem(-8),
  selectors: {
    '&&': { color: ASH.muted, backgroundColor: 'transparent' },
    '&&:hover, &&[aria-pressed=true]': {
      color: ASH.icon,
      backgroundColor: 'rgba(255, 164, 92, 0.18)',
    },
  },
});

export const LiveCallDivider = style({
  width: 1,
  height: toRem(20),
  backgroundColor: ASH.line,
  filter: shadow,
});

// Leaving is the one solid shape on the share, so it is found at a glance.
export const LiveLeave = style({
  pointerEvents: 'auto',
  marginLeft: config.space.S200,
  filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.6))',
  selectors: {
    '&&': { backgroundColor: ASH.leave, color: ASH.onLeave },
    '&&:hover:not(:disabled)': { backgroundColor: ASH.leaveHover },
  },
});

export const LiveSound = style({
  gridColumn: 3,
  justifySelf: 'end',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: config.space.S100,
});

export const LiveVolume = style({
  pointerEvents: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S100,
  filter: shadow,
});

export const LiveVolumeSlider = style({
  width: toRem(72),
  backgroundColor: 'rgba(240, 217, 188, 0.45)',
});
