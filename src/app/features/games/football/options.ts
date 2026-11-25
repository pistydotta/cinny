// Graphics options, kept per browser. `auto` starts at high and steps down while frames run
// under 40 a second (the runner watches; the scene applies).

export type Quality = 'low' | 'medium' | 'high';

export type Graphics = {
  quality: Quality | 'auto';
  camera: 'near' | 'normal' | 'far';
};

export const DEFAULT_GRAPHICS: Graphics = { quality: 'auto', camera: 'normal' };

const KEY = 'blazeroom.football.graphics';

export const parseGraphics = (text: string | null): Graphics => {
  try {
    const raw = text ? (JSON.parse(text) as Partial<Graphics>) : {};
    return {
      quality: ['auto', 'low', 'medium', 'high'].includes(raw.quality as string)
        ? (raw.quality as Graphics['quality'])
        : DEFAULT_GRAPHICS.quality,
      camera: ['near', 'normal', 'far'].includes(raw.camera as string)
        ? (raw.camera as Graphics['camera'])
        : DEFAULT_GRAPHICS.camera,
    };
  } catch {
    return DEFAULT_GRAPHICS;
  }
};

export const loadGraphics = (): Graphics => {
  try {
    return parseGraphics(localStorage.getItem(KEY));
  } catch {
    return DEFAULT_GRAPHICS;
  }
};

export const saveGraphics = (g: Graphics): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
  } catch {
    // Private windows may refuse; the choice holds for this visit.
  }
};

// What each level costs the graphics card: resolution, shadows and their detail, smoothing.
export const QUALITY: Record<
  Quality,
  { pixelRatio: number; shadows: boolean; shadowSize: number; antialias: boolean }
> = {
  low: { pixelRatio: 0.75, shadows: false, shadowSize: 512, antialias: false },
  medium: { pixelRatio: 1, shadows: true, shadowSize: 1024, antialias: true },
  high: { pixelRatio: 2, shadows: true, shadowSize: 2048, antialias: true },
};

// Camera height and distance from the near touchline, in meters.
export const CAMERA: Record<Graphics['camera'], { height: number; back: number }> = {
  near: { height: 11, back: 21 },
  normal: { height: 15, back: 27 },
  far: { height: 21, back: 37 },
};

// Auto quality: one step down after this many seconds under the frame rate.
export const AUTO_FPS = 40;
export const AUTO_SECONDS = 3;

export const lower = (q: Quality): Quality => (q === 'high' ? 'medium' : 'low');
