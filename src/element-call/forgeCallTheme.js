// Forge's colours for Element Call's own screen inside the call iframe, so the stage and the
// camera tiles match the app around them instead of Compound's grey and Element's avatar hues.
// This file is copied as is into the iframe, so it can't import palette.ts: forgeCallTheme.test.ts
// checks these values against it.

// The call is always dark, like the video in it and Cinny's call bar around it (CallDark in
// screen-share/styles.css.ts): Element Call stays in its dark theme (keepCallDark), with Forge's
// dark panel as the stage and its raised surface as a camera tile.
export const forgeCall = { stage: '#141619', tile: '#1D2024' };

// Element Call picks an avatar colour 1–6 from the user id; Cinny's user colours (--mx-uc-* in
// index.css) are the six hues it shares with it, on white initials.
export const callAvatarHues = [
  'hsl(208, 100%, 45%)',
  'hsl(302, 100%, 30%)',
  'hsl(163, 100%, 30%)',
  'hsl(343, 100%, 45%)',
  'hsl(24, 100%, 45%)',
  'hsl(181, 100%, 30%)',
];

// Compound declares its colours in a cascade layer; these rules are unlayered, so they win
// whatever the order. The doubled theme class outranks Element Call's own unlayered
// `:root, [class*=cpd-theme-]` rule for the tile background.
export const forgeCallCss = () => {
  const stage =
    '.cpd-theme-dark.cpd-theme-dark, .cpd-theme-dark-hc.cpd-theme-dark-hc {' +
    ` --cpd-color-theme-bg: ${forgeCall.stage}; --cpd-color-bg-canvas-default: ${forgeCall.stage};` +
    ` --video-tile-background: ${forgeCall.tile}; }`;
  const avatars = callAvatarHues
    .map(
      (hue, i) =>
        `[class*=cpd-theme-] { --cpd-color-bg-decorative-${i + 1}: ${hue};` +
        ` --cpd-color-text-decorative-${i + 1}: #FFFFFF; }`
    )
    .join(' ');
  return `${stage} ${avatars}`;
};

// Cinny tells Element Call the app's theme, and Element Call puts it on <body> as a class. In
// light mode its dark text would sit on the dark call, so its light themes become the dark ones.
export const darkThemeClass = (name) =>
  name.startsWith('cpd-theme-light') ? name.replace('cpd-theme-light', 'cpd-theme-dark') : name;

export const keepCallDark = (body) => {
  const flip = () => {
    [...body.classList].forEach((name) => {
      const dark = darkThemeClass(name);
      if (dark !== name) body.classList.replace(name, dark);
    });
  };
  flip();
  new MutationObserver(flip).observe(body, { attributes: true, attributeFilter: ['class'] });
};
