import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const ReorderableNavRoom = style({
  position: 'relative',
  selectors: {
    '&[data-dragging=true]': {
      opacity: 0.5,
    },
    '&[data-drop-edge]::after': {
      content: '',
      display: 'block',
      position: 'absolute',
      left: 0,
      width: '100%',
      height: config.borderWidth.B700,
      backgroundColor: color.Success.Main,
      pointerEvents: 'none',
    },
    '&[data-drop-edge=top]::after': {
      top: toRem(-1),
    },
    '&[data-drop-edge=bottom]::after': {
      bottom: toRem(-1),
    },
  },
});
