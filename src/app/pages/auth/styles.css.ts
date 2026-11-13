import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const AuthLayout = style({
  minHeight: '100%',
  backgroundColor: color.Background.Container,
  color: color.Background.OnContainer,
  padding: config.space.S400,
  paddingRight: config.space.S200,
  paddingBottom: 0,
  position: 'relative',
});

export const AuthCard = style({
  marginTop: 'auto',
  marginBottom: 'auto',
  maxWidth: toRem(460),
  width: '100%',
  backgroundColor: color.Surface.Container,
  color: color.Surface.OnContainer,
  borderRadius: config.radii.R400,
  boxShadow: config.shadow.E100,
  border: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
  overflow: 'hidden',
  // Above the wallpaper backdrop.
  position: 'relative',
  zIndex: 1,
});

export const AuthLogo = style([
  DefaultReset,
  {
    width: toRem(26),
    height: toRem(26),

    borderRadius: '50%',
  },
]);

export const AuthHeader = style({
  padding: `0 ${config.space.S400}`,
  borderBottomWidth: config.borderWidth.B300,
});

export const AuthCardContent = style({
  maxWidth: toRem(402),
  width: '100%',
  margin: 'auto',
  padding: config.space.S500,
  paddingTop: config.space.S700,
  paddingBottom: config.space.S700,
  gap: config.space.S500,
});

export const AuthFooter = style({
  padding: config.space.S200,
  position: 'relative',
  zIndex: 1,
});
