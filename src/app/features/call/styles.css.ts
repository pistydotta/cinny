import { style } from '@vanilla-extract/css';
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

// The room before you join: what it is, who's there, your devices and the join button, as one
// card in the middle of the page instead of a strip of buttons in an empty one.
export const PrejoinCard = style({
  width: '100%',
  maxWidth: toRem(420),
  padding: config.space.S600,
  borderRadius: forgeRadius.card,
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  border: `1px solid ${color.SurfaceVariant.ContainerLine}`,
});

export const PrejoinIcon = style({
  display: 'grid',
  placeItems: 'center',
  width: toRem(48),
  height: toRem(48),
  borderRadius: forgeRadius.round,
  backgroundColor: color.Primary.Container,
  color: color.Primary.OnContainer,
});

export const PrejoinTitle = style({ ...forgeType.title, margin: 0, textAlign: 'center' });

export const PrejoinStatus = style({
  ...forgeType.bodySm,
  margin: 0,
  textAlign: 'center',
  color: forgeColor.Text.Secondary,
});

export const PrejoinDevices = style({ flexWrap: 'wrap' });
