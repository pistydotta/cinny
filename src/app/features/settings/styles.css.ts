import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const SequenceCardStyle = style({
  padding: config.space.S300,
});

// A section's heading: its name, and a line on what the section is for.
export const SectionHeading = style({
  display: 'flex',
  flexDirection: 'column',
  gap: toRem(4),
});
export const SectionName = style({
  fontSize: toRem(14),
  fontWeight: config.fontWeight.W500,
});
export const SectionDescription = style({
  fontSize: toRem(12.5),
  lineHeight: 1.45,
  color: color.Surface.OnContainer,
  opacity: 0.6,
});
