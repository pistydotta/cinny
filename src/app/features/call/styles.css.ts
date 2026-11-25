import { assignVars, style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';
import { forgeColor } from '../forge-theme/forgeColor.css';
import { forgeRadius, forgeType } from '../forge-theme/tokens';

export const CallViewContent = style({
  padding: config.space.S400,
  paddingRight: 0,
  minHeight: '100%',
});

export const ControlCard = style({
  padding: config.space.S300,
  maxWidth: '100%',
  flexWrap: 'wrap',
  justifyContent: 'center',
  rowGap: config.space.S300,
});

export const ControlDivider = style({
  height: toRem(24),
});

export const CallMemberCard = style({
  padding: config.space.S300,
});

export const CallControlContainer = style({
  padding: config.space.S300,
  flexShrink: 0,
});

export const PrescreenMessage = style({
  padding: config.space.S200,
});
export const CallStage = style({
  display: 'flex',
  minHeight: 0,
  position: 'relative',
  '@media': { 'screen and (max-width: 700px)': { flexDirection: 'column' } },
});

// The room before you join: the room as an ember with its people around it, your devices and
// the join button, on one lifted card with no outlines: fills, not borders, set things apart.
export const PrejoinCard = style({
  width: '100%',
  maxWidth: toRem(400),
  padding: `${config.space.S700} ${config.space.S600} ${config.space.S500}`,
  borderRadius: config.radii.R500,
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  boxShadow: config.shadow.E300,
});

// A faint green glow behind the card, the colour of a call you can join.
export const PrejoinBackdrop = style({
  backgroundImage: `radial-gradient(circle at 50% 40%, color-mix(in srgb, ${color.Success.Main} 8%, transparent), transparent 55%)`,
});

export const PrejoinTitle = style({
  ...forgeType.title,
  margin: 0,
  textAlign: 'center',
  overflowWrap: 'anywhere',
});

export const PrejoinStatus = style({
  ...forgeType.bodySm,
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: config.space.S200,
  color: forgeColor.Text.Secondary,
});

export const PrejoinLiveDot = style({
  width: toRem(7),
  height: toRem(7),
  borderRadius: forgeRadius.round,
  backgroundColor: color.Success.Main,
});

export const PrejoinIdleDot = style([PrejoinLiveDot, { backgroundColor: forgeColor.Text.Faint }]);

// The room's mark: two rings around its icon, green like the join button, its people on the
// outer one. The top person's face and the lower ones' names reach past the ring, hence the
// margins.
const ring = (share: number) =>
  `1px solid color-mix(in srgb, ${color.Success.Main} ${share}%, transparent)`;

// Dark mode's green is bright, for dots and badges; filled things here take it deeper, close to
// light mode's green, with white on top.
const deepGreen = (share: number) => `color-mix(in srgb, ${color.Success.Main} ${share}%, black)`;
const DARK = 'body.dark-theme &';

const OrbitBase = style({
  position: 'relative',
  width: toRem(176),
  height: toRem(176),
  margin: `${config.space.S500} 0 ${config.space.S600}`,
  flexShrink: 0,
});
export const Orbit = style([OrbitBase]);
export const OrbitEmpty = style([OrbitBase, { margin: `0 0 ${config.space.S200}` }]);

export const OrbitRingOuter = style({
  position: 'absolute',
  inset: 0,
  borderRadius: forgeRadius.round,
  border: ring(45),
  selectors: {
    [`${OrbitEmpty} &`]: { border: `1px dashed ${color.SurfaceVariant.ContainerLine}` },
  },
});

export const OrbitRingInner = style({
  position: 'absolute',
  inset: '17%',
  borderRadius: forgeRadius.round,
  border: ring(75),
  backgroundImage: `radial-gradient(circle, color-mix(in srgb, ${color.Success.Main} 22%, transparent), transparent 70%)`,
  selectors: {
    [`${OrbitEmpty} &`]: {
      border: `1px solid ${color.SurfaceVariant.ContainerLine}`,
      backgroundImage: 'none',
    },
  },
});

export const OrbitEmber = style({
  position: 'absolute',
  inset: '30%',
  display: 'grid',
  placeItems: 'center',
  borderRadius: forgeRadius.round,
  color: 'white',
  backgroundImage: `radial-gradient(circle at 35% 30%, ${color.Success.Main}, ${deepGreen(50)})`,
  selectors: {
    [DARK]: {
      backgroundImage: `radial-gradient(circle at 35% 30%, ${deepGreen(70)}, ${deepGreen(35)})`,
    },
    // As specific as the dark rule above, so an empty room stays grey in both modes.
    [`${OrbitEmpty} &, body.dark-theme ${OrbitEmpty} &`]: {
      backgroundImage: 'none',
      backgroundColor: color.SurfaceVariant.ContainerActive,
      color: forgeColor.Text.Secondary,
    },
  },
});

export const OrbitPeople = style({ listStyle: 'none', margin: 0, padding: 0 });

// A point on the ring; what sits there is centred on it by its face, not by face and name.
export const OrbitPlace = style({
  position: 'absolute',
  width: 0,
  height: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
});

const FACE = toRem(38);

export const OrbitPerson = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: config.space.S100,
  flexShrink: 0,
  marginTop: `calc(${FACE} / -2)`,
  padding: 0,
  border: 'none',
  background: 'none',
  color: 'inherit',
  cursor: 'pointer',
  selectors: {
    '&:focus-visible': { outline: 'none' },
  },
});

// The card's own colour around each face keeps it off the ring's hairline.
// Round, where Forge squares avatars off, like the faces in the channel list.
export const OrbitAvatar = style({
  width: FACE,
  height: FACE,
  flexShrink: 0,
  borderRadius: forgeRadius.round,
  overflow: 'hidden',
  outline: `${toRem(3)} solid ${color.SurfaceVariant.Container}`,
  selectors: {
    [`${OrbitPerson}:hover &`]: { outlineColor: color.SurfaceVariant.ContainerActive },
    [`${OrbitPerson}:focus-visible &`]: { outline: `2px solid ${color.Primary.MainActive}` },
  },
});

export const OrbitMuted = style({
  position: 'absolute',
  top: 0,
  right: `calc(50% - ${FACE} / 2 - ${toRem(4)})`,
  display: 'grid',
  placeItems: 'center',
  width: toRem(16),
  height: toRem(16),
  borderRadius: forgeRadius.round,
  backgroundColor: color.Critical.Main,
  color: color.Critical.OnMain,
  outline: `2px solid ${color.SurfaceVariant.Container}`,
});

// On the card's colour, so the ring's line passes behind the name instead of through it.
export const OrbitName = style({
  ...forgeType.caption,
  maxWidth: toRem(84),
  padding: `0 ${config.space.S100}`,
  borderRadius: config.radii.R300,
  backgroundColor: color.SurfaceVariant.Container,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: forgeColor.Text.Secondary,
});

export const OrbitMore = style([
  OrbitAvatar,
  {
    ...forgeType.caption,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    marginTop: `calc(${FACE} / -2)`,
    borderRadius: forgeRadius.round,
    backgroundColor: color.SurfaceVariant.ContainerActive,
    color: forgeColor.Text.Secondary,
  },
]);

export const PrejoinControls = style({ width: '100%' });

export const DeviceTiles = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: config.space.S200,
});

export const DeviceTile = style({
  position: 'relative',
  borderRadius: config.radii.R400,
  backgroundColor: `color-mix(in srgb, ${color.SurfaceVariant.OnContainer} 6%, transparent)`,
  color: color.SurfaceVariant.OnContainer,
});

export const DeviceTileOff = style([
  DeviceTile,
  {
    backgroundColor: `color-mix(in srgb, ${color.Critical.Main} 14%, transparent)`,
    color: color.Critical.Main,
  },
]);

export const DeviceToggle = style({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: config.space.S100,
  padding: `${config.space.S300} ${config.space.S100} ${config.space.S200}`,
  border: 'none',
  borderRadius: 'inherit',
  background: 'none',
  color: 'inherit',
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      backgroundColor: `color-mix(in srgb, ${color.SurfaceVariant.OnContainer} 5%, transparent)`,
    },
    '&:focus-visible': { outline: `2px solid ${color.Primary.MainActive}`, outlineOffset: 2 },
    '&:disabled': { cursor: 'progress' },
  },
});

export const DeviceLabel = style({
  ...forgeType.caption,
  textAlign: 'center',
  color: forgeColor.Text.Secondary,
  selectors: { [`${DeviceTileOff} &`]: { color: 'inherit' } },
});

export const DeviceMenu = style({
  position: 'absolute',
  top: config.space.S100,
  right: config.space.S100,
});

// AudioMenuArrow pulls itself towards the button before it elsewhere; here it stands alone.
export const DeviceArrow = style({ marginLeft: 0 });

export const PrejoinChat = style({
  ...forgeType.caption,
  alignSelf: 'center',
  display: 'inline-flex',
  alignItems: 'center',
  gap: config.space.S100,
  padding: `${config.space.S100} ${config.space.S200}`,
  border: 'none',
  borderRadius: config.radii.R300,
  background: 'none',
  color: forgeColor.Text.Faint,
  cursor: 'pointer',
  selectors: {
    '&:hover, &[aria-pressed="true"]': { color: forgeColor.Text.Secondary },
    '&:focus-visible': { outline: `2px solid ${color.Primary.MainActive}` },
  },
});

// Joining is green, like a call that's on. Forge paints folds' green buttons oxblood
// (forge-theme/shell.css.ts), so this is a Primary button whose Primary is the theme's green,
// deeper in dark mode.
export const JoinButton = style({
  vars: assignVars(color.Primary, color.Success),
  selectors: {
    [DARK]: {
      vars: {
        [color.Primary.Main]: deepGreen(58),
        [color.Primary.MainHover]: deepGreen(64),
        [color.Primary.MainActive]: deepGreen(70),
        [color.Primary.OnMain]: 'white',
      },
    },
  },
});
