import React from 'react';
import { pixelIconUrl } from './pixelIconUrl';

// An item's pixel-art icon, sized with the text around it; its emoji when it has no drawing.
export function PixelIcon({ art, emoji }: { art?: string; emoji: string }) {
  const url = art ? pixelIconUrl(art) : undefined;
  if (!url) return <span>{emoji}</span>;
  return (
    <img
      src={url}
      alt={emoji}
      draggable={false}
      style={{
        width: '1.3em',
        height: '1.3em',
        imageRendering: 'pixelated',
        verticalAlign: 'middle',
      }}
    />
  );
}
