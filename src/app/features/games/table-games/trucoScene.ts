import { Point } from './fodinhaLayout';

// Truco at the bar (art/truco-bar.webp): the viewer sits at the camera, the others on the
// three red chairs, and the cards go on the plastic table. Points are % of the photo.
export const SCENE_WIDTH = 1672;
export const SCENE_HEIGHT = 941;

// Clockwise from the viewer, like seatPoints: left chair, the chair across, right chair.
const CHAIRS: Record<number, Point[]> = {
  2: [{ x: 50, y: 66 }],
  4: [
    { x: 6, y: 71 },
    { x: 50, y: 66 },
    { x: 94, y: 71 },
  ],
};
// Where each seat's card lands on the table top (y 75% is its back edge).
const PLAYED: Record<number, Point[]> = {
  2: [
    { x: 50, y: 87 },
    { x: 50, y: 79 },
  ],
  4: [
    { x: 50, y: 87 },
    { x: 34, y: 83 },
    { x: 50, y: 79 },
    { x: 66, y: 83 },
  ],
};
// The viewer sits at the camera; their avatar goes on the near edge of the table, in the
// middle, no lower than NEAR_GAP px above the stage's bottom so their name still shows.
const NEAR: Point = { x: 50, y: 96 };
const NEAR_GAP = 42;
const VIRA: Point = { x: 80, y: 88 };
// The dark doorway behind the far chair: the score of the hand reads well there.
const DOOR: Point = { x: 50, y: 46 };

const EDGE = 52;

export const hasScene = (seats: number) => seats === 2 || seats === 4;

export type Scene = {
  /** The photo's box in the stage, in px; it covers the stage, anchored at the table. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Seat avatars, played cards, the vira and the center text, in px of the stage. */
  seats: Point[];
  played: Point[];
  vira: Point;
  door: Point;
  /** Width of a card on the table, in px: it grows with the photo. */
  card: number;
};

// A tall screen sees the middle of the photo and cuts the ceiling, so the table gets bigger;
// the side chairs fall off the edges, and those seats and their cards are pulled in by x as a
// share of the stage instead.
const TALL_SHOWN = 0.74;
const TALL: Record<number, { seats: number[]; played: number[] }> = {
  2: { seats: [50], played: [50, 50] },
  4: { seats: [14, 50, 86], played: [50, 27, 50, 73] },
};
const TALL_VIRA = { x: 84, y: 96 };

/**
 * Places the photo in a `width`×`height` stage and the table's points on it. `bottom` is the
 * viewer's seat (at the camera); the others go clockwise onto the chairs.
 */
export function trucoScene(width: number, height: number, seats: number, bottom: number): Scene {
  const tall = width < height * 1.2;
  const scale = Math.max(width / SCENE_WIDTH, height / (SCENE_HEIGHT * (tall ? TALL_SHOWN : 1)));
  const w = SCENE_WIDTH * scale;
  const h = SCENE_HEIGHT * scale;
  const left = (width - w) / 2;
  const top = height - h;
  // `share`: on a tall screen, x as a share of the stage instead of the photo.
  const at = (p: Point, share?: number): Point => ({
    x: Math.round(
      share === undefined
        ? Math.min(width - EDGE, Math.max(EDGE, left + (p.x / 100) * w))
        : (share / 100) * width
    ),
    y: Math.round(top + (p.y / 100) * h),
  });
  const count = hasScene(seats) ? seats : 4;
  const chairs = CHAIRS[count];
  const played = PLAYED[count];
  const order = (seat: number) => (seat - bottom + count) % count;
  const card = Math.round(Math.min(64, Math.max(46, w * 0.03)));
  const near = at(NEAR);
  near.y = Math.min(near.y, Math.round(height - NEAR_GAP));
  // Table cards by step from the viewer. When the stage is too short for the viewer's card
  // between the far chair and their avatar, it lies beside the avatar instead (left: the vira
  // is on the right).
  const spots = played.map((p, step) => at(p, tall ? TALL[count].played[step] : undefined));
  if (spots[0].y + card * 0.9 > near.y - 36) {
    spots[0] = { x: Math.round(near.x - card - 36), y: Math.round(near.y - 8) };
  }
  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(w),
    height: Math.round(h),
    seats: Array.from({ length: count }, (_, seat) => {
      const step = order(seat);
      if (step === 0) return near;
      return at(chairs[step - 1], tall ? TALL[count].seats[step - 1] : undefined);
    }),
    played: Array.from({ length: count }, (_, seat) => spots[order(seat)]),
    vira: tall ? at(TALL_VIRA, TALL_VIRA.x) : at(VIRA),
    door: at(DOOR),
    card,
  };
}
