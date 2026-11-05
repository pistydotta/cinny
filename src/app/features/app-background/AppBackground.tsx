import React, { CSSProperties } from 'react';
import { useAppBackgroundEnabled } from './backgroundSetting';

const wallpaperUrl = new URL('./wallpaper.webp', import.meta.url).href;

// Every panel of the app paints its own solid background, so the wallpaper goes on top of
// them, faint and click-through, instead of behind them. The image is already darkened in the
// file; the mask fades it out towards the top, where headers and names are.
const style: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  pointerEvents: 'none',
  backgroundImage: `url(${wallpaperUrl})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  opacity: 0.11,
  maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 1) 80%)',
  WebkitMaskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 1) 80%)',
};

export function AppBackground() {
  const enabled = useAppBackgroundEnabled();
  if (!enabled) return null;
  return <div aria-hidden style={style} />;
}
