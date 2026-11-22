import { globalStyle, style } from '@vanilla-extract/css';
import { config } from 'folds';
import { forgeColor } from '../forge-theme/forgeColor.css';

export const LiveRow = style({ minWidth: 0 });

export const LiveIcon = style({ color: forgeColor.Ember.Main, flexShrink: 0 });

// The room name is the button: the whole text block opens the room.
export const LiveName = style({
  minWidth: 0,
  padding: 0,
  border: 0,
  background: 'none',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
});
globalStyle(`${LiveName}:hover > :first-child`, { textDecoration: 'underline' });

export const LiveEmpty = style({ padding: `${config.space.S200} 0` });

// One line of each entry until the list is opened.
export const NewsLine = style({
  display: '-webkit-box',
  WebkitLineClamp: 1,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

export const NewsMore = style({
  alignSelf: 'flex-start',
  padding: `${config.space.S100} 0`,
  border: 0,
  background: 'none',
  color: forgeColor.Ember.Main,
  font: 'inherit',
  cursor: 'pointer',
  selectors: { '&:hover': { textDecoration: 'underline' } },
});
