import { createVar, globalStyle } from '@vanilla-extract/css';
import { color } from 'folds';

// Forge's switch: a see-through track. Off is an empty ring on the left; on slides a filled
// ember dot to the right and then draws its check, so the state reads by shape, not only colour.
// `body` and the attribute selectors lift these over folds' own Switch classes.
const line = (strength: number) =>
  `color-mix(in srgb, ${color.Surface.OnContainer} ${strength}%, transparent)`;

const track = 'body button[type=button][role=switch][aria-checked]';
const on = 'body button[type=button][role=switch][aria-checked=true]';
// Dark mode's wine primary is too deep to read on the dark card, so the dot takes the divider
// spark's brighter ember there.
const ember = createVar();
globalStyle('body', { vars: { [ember]: color.Primary.Main } });
globalStyle('body.dark-theme', { vars: { [ember]: '#D8613F' } });

const slide = 'cubic-bezier(0.3, 1.3, 0.5, 1)';

globalStyle(track, {
  boxSizing: 'border-box',
  width: '40px',
  height: '22px',
  padding: '0 3px',
  display: 'flex',
  alignItems: 'center',
  borderRadius: '999px',
  border: `1.5px solid ${line(30)}`,
  backgroundColor: 'transparent',
  transition: 'border-color 160ms ease',
});
globalStyle(`${track}:hover`, { borderColor: line(50) });
globalStyle(`${track}:focus-visible`, {
  outline: `2px solid ${color.Primary.Main}`,
  outlineOffset: '2px',
});
globalStyle(`${track}:disabled`, { opacity: 0.45, cursor: 'not-allowed' });
globalStyle(on, { borderColor: ember });
globalStyle(`${on}:hover`, { borderColor: ember });

globalStyle(`${track} > span`, {
  boxSizing: 'border-box',
  display: 'grid',
  placeItems: 'center',
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  border: `1.5px solid ${line(45)}`,
  backgroundColor: 'transparent',
  color: color.Surface.Container,
  transform: 'translateX(1px)',
  transition: `transform 220ms ${slide}, width 160ms ease, height 160ms ease, background-color 160ms ease, border-color 160ms ease`,
});
globalStyle(`${on} > span`, {
  width: '16px',
  height: '16px',
  borderColor: ember,
  backgroundColor: ember,
  transform: 'translateX(15px)',
});

// The check is wiped in from the left once the dot has arrived; turning off hides it at once.
// A transition, not an animation, so switches that are already on don't replay it on open.
globalStyle(`${track} > span > svg`, {
  width: '12px',
  height: '12px',
  clipPath: 'inset(0 100% 0 0)',
  transition: 'clip-path 0ms',
});
globalStyle(`${on} > span > svg`, {
  clipPath: 'inset(0 0 0 0)',
  transition: 'clip-path 240ms ease-out 170ms',
});

globalStyle(`${track}, ${track} > span, ${track} > span > svg`, {
  '@media': {
    '(prefers-reduced-motion: reduce)': { transition: 'none' },
  },
});
