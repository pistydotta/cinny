import { style } from '@vanilla-extract/css';
import { config } from 'folds';

const PHONE = 'screen and (max-width: 600px)';

// The owners want this banner on every screen until the key exists. On a phone it is one line
// (short text, button at the end) instead of 130px; Visão geral keeps the full explanation.
export const Banner = style({
  padding: `${config.space.S200} ${config.space.S400}`,
  '@media': {
    [PHONE]: {
      flexWrap: 'nowrap',
      justifyContent: 'space-between',
      gap: config.space.S200,
      padding: `${config.space.S100} ${config.space.S300}`,
    },
  },
});

export const Long = style({ '@media': { [PHONE]: { display: 'none' } } });

export const Short = style({
  display: 'none',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  '@media': { [PHONE]: { display: 'block', flex: 1 } },
});

export const Shield = style({ '@media': { [PHONE]: { flexShrink: 0 } } });
