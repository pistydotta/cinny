export type FodinhaLayout = 'landscape' | 'portrait';
export type Point = { x: number; y: number };

// Seats go round an ellipse inside the rail, in % of the stage, clockwise on screen
// from the bottom (bottom, left, top, right), like the poker table.
const ELLIPSE: Record<FodinhaLayout, { center: Point; rx: number; ry: number }> = {
  landscape: { center: { x: 50, y: 47 }, rx: 41, ry: 36 },
  portrait: { center: { x: 50, y: 47 }, rx: 35, ry: 40 },
};

export const tableCenter = (layout: FodinhaLayout): Point => ELLIPSE[layout].center;

/** Where each seat sits on screen; `bottom` is the seat drawn at the bottom (the viewer's). */
export function seatPoints(count: number, bottom: number, layout: FodinhaLayout): Point[] {
  const { center, rx, ry } = ELLIPSE[layout];
  return Array.from({ length: count }, (_, seat) => {
    const step = (seat - bottom + count) % count;
    const angle = Math.PI / 2 + (step * 2 * Math.PI) / count;
    return {
      x: Math.round((center.x + rx * Math.cos(angle)) * 10) / 10,
      y: Math.round((center.y + ry * Math.sin(angle)) * 10) / 10,
    };
  });
}

/** A point `t` of the way from `from` to `to`: played cards sit in front of their seat. */
export const toward = (from: Point, to: Point, t: number): Point => ({
  x: Math.round((from.x + (to.x - from.x) * t) * 10) / 10,
  y: Math.round((from.y + (to.y - from.y) * t) * 10) / 10,
});

export const pct = (p: Point) => ({ left: `${p.x}%`, top: `${p.y}%` });
