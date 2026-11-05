import { style } from '@vanilla-extract/css';
import { color } from 'folds';

export const Volume = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 6,
  fontSize: 12,
});
export const Kick = style({
  background: color.Critical.Container,
  color: color.Critical.OnContainer,
  border: 0,
  borderRadius: 6,
  padding: 8,
  font: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
});

export const Slider = style({ minWidth: 0, flex: 1, width: 70, accentColor: color.Primary.Main });
