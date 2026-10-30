import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const RoomItemCard = style({
  padding: config.space.S400,
  borderRadius: 0,
  position: 'relative',
  selectors: {
    '&[data-dragging=true]': {
      opacity: config.opacity.Disabled,
    },
    '&[data-openable=true]': {
      cursor: 'pointer',
    },
    '&[data-openable=true]:hover': {
      backgroundColor: color.SurfaceVariant.ContainerHover,
    },
  },
});
export const RoomProfileTopic = style({
  cursor: 'pointer',
  ':hover': {
    textDecoration: 'underline',
  },
});
export const ErrorNameContainer = style({
  gap: toRem(2),
});
