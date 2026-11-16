export type FloatingPos = { x: number; y: number };
type Size = { width: number; height: number };

const KEY = 'blazeroom.floating_call_pos';
// Keeps a strip of the box inside the window, so it can always be grabbed back.
const MARGIN = 8;

export function clampPos(pos: FloatingPos, box: Size, view: Size): FloatingPos {
  const maxX = Math.max(MARGIN, view.width - box.width - MARGIN);
  const maxY = Math.max(MARGIN, view.height - box.height - MARGIN);
  return {
    x: Math.round(Math.min(Math.max(pos.x, MARGIN), maxX)),
    y: Math.round(Math.min(Math.max(pos.y, MARGIN), maxY)),
  };
}

export function parsePos(raw: string | null): FloatingPos | undefined {
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw);
    if (Number.isFinite(value?.x) && Number.isFinite(value?.y)) return { x: value.x, y: value.y };
  } catch {
    // A broken value just means the default corner.
  }
  return undefined;
}

export function loadPos(): FloatingPos | undefined {
  try {
    return parsePos(localStorage.getItem(KEY));
  } catch {
    return undefined;
  }
}

export function savePos(pos: FloatingPos | undefined): void {
  try {
    if (pos) localStorage.setItem(KEY, JSON.stringify(pos));
    else localStorage.removeItem(KEY);
  } catch {
    // Private windows may refuse storage; the box still moves for this visit.
  }
}

const WIDTH_KEY = 'blazeroom.floating_call_width';
export const MIN_WIDTH = 280;
const MAX_WIDTH = 1280;

// A width the window can hold, never so small that the share is unreadable.
export function clampWidth(width: number, viewWidth: number): number {
  const max = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, viewWidth - MARGIN * 2));
  return Math.round(Math.min(Math.max(width, MIN_WIDTH), max));
}

export function loadWidth(): number | undefined {
  try {
    const value = Number(localStorage.getItem(WIDTH_KEY));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

export function saveWidth(width: number | undefined): void {
  try {
    if (width) localStorage.setItem(WIDTH_KEY, String(width));
    else localStorage.removeItem(WIDTH_KEY);
  } catch {
    // Private windows may refuse storage; the size still holds for this visit.
  }
}
