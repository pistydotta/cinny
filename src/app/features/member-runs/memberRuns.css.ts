import { style } from '@vanilla-extract/css';
import { color, toRem } from 'folds';
import { forgeRadius } from '../forge-theme/tokens';

export const Summary = style({ minWidth: 0 });

// "Mostrar" / "Esconder": a quiet text button at the end of the line.
export const Toggle = style({
  marginLeft: toRem(6),
  padding: `0 ${toRem(4)}`,
  border: 0,
  borderRadius: forgeRadius.control,
  background: 'none',
  color: color.Surface.OnContainer,
  font: 'inherit',
  fontWeight: 600,
  cursor: 'pointer',
  selectors: {
    '&:hover': { textDecoration: 'underline' },
  },
});
