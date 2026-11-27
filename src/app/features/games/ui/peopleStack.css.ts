import { globalStyle, style } from '@vanilla-extract/css';
import { color, toRem } from 'folds';

export const Stack = style({ display: 'inline-flex', alignItems: 'center', flexShrink: 0 });

export const Face = style({
  selectors: {
    '&&': { borderRadius: '50%', overflow: 'hidden', marginLeft: 0 },
    '&& + &&': { marginLeft: toRem(-8) },
  },
});
globalStyle(`${Face} > *`, { borderRadius: '50%' });

export const More = style({
  paddingLeft: toRem(6),
  fontSize: 12,
  fontWeight: 700,
  color: color.SurfaceVariant.OnContainer,
});
