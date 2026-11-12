import React, { CSSProperties } from 'react';

const wallpaperUrl = new URL('./wallpaper.webp', import.meta.url).href;

// The wallpaper is a backdrop for the logged-out pages only: inside the app nothing may show
// through a panel. The image is already darkened in the file.
const style: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
  backgroundImage: `url(${wallpaperUrl})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  opacity: 0.35,
};

export function AppBackground() {
  return <div aria-hidden style={style} />;
}
