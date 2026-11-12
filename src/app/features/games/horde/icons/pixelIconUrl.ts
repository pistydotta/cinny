import { PALETTE, SIZE, iconPixels } from './pixelArt';

// Each icon drawn once into a canvas and kept as an image address.
const cache = new Map<string, string | null>();

export const pixelIconUrl = (art: string): string | undefined => {
  const known = cache.get(art);
  if (known !== undefined) return known ?? undefined;
  const pixels = iconPixels(art);
  let url: string | null = null;
  if (pixels && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      pixels.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          if (ch === '.') return;
          ctx.fillStyle = PALETTE[ch];
          ctx.fillRect(x, y, 1, 1);
        })
      );
      url = canvas.toDataURL();
    }
  }
  cache.set(art, url);
  return url ?? undefined;
};
