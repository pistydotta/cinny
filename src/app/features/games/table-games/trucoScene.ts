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
// Where each seat's card lands on the table top (y 75% is its back edge). Each card stays by
// its own player's side of the table — near the viewer at the bottom, the others toward their
// chairs — so the four spread to the edges.
const PLAYED: Record<number, Point[]> = {
  2: [
    { x: 50, y: 89 },
    { x: 50, y: 76 },
  ],
  4: [
    { x: 50, y: 89 },
    { x: 31, y: 84 },
    { x: 50, y: 79 },
    { x: 69, y: 84 },
  ],
};
// The viewer sits at the camera; their avatar goes on the near edge of the table, in the
// middle, no lower than NEAR_GAP px above the stage's bottom so their name still shows.
const NEAR: Point = { x: 50, y: 96 };
const NEAR_GAP = 42;
// The dark doorway behind the far chair: the score of the hand reads well there.
const DOOR: Point = { x: 50, y: 46 };
// px between the center panel's middle and the far seat's avatar, and the panel's highest point.
const DOOR_CLEARANCE = 110;
const DOOR_MIN = 90;

// On a wide screen the camera sits a step back from the table: the photo is drawn at this
// share of the size that would cover the stage, so the far player's card and the vira sit on
// the tabletop near the viewer's hand, and the hand drops into the foreground below it.
const FAR = 0.84;

const EDGE = 52;
const TABLE_BACK = 0.75;

export const hasScene = (seats: number) => seats === 2 || seats === 4;

export type Scene = {
  /**
   * The photo's box in the stage, in px. A tall stage is covered, anchored at the table; a wide
   * one sees it from further back, at the top, with the stage's edges left to the backdrop.
   */
  left: number;
  top: number;
  width: number;
  height: number;
  /** The photo leaves part of the stage uncovered. */
  framed: boolean;
  /** Seat avatars, played cards, the vira and the center panel, in px of the stage. */
  seats: Point[];
  played: Point[];
  vira: Point;
  viraCard: number;
  door: Point;
  /** Width of a card on the table, in px: it grows with the photo. */
  card: number;
  handCard: number;
};

// A tall screen sees the middle of the photo and cuts the ceiling, so the table gets bigger;
// the side chairs fall off the edges, and those seats and their cards are pulled in by x as a
// share of the stage instead.
const TALL_SHOWN = 0.74;
const TALL: Record<number, { seats: number[]; played: number[] }> = {
  2: { seats: [50], played: [50, 50] },
  4: { seats: [14, 50, 86], played: [50, 22, 50, 78] },
};

/**
 * Places the photo in a `width`×`height` stage and the table's points on it. `bottom` is the
 * viewer's seat (at the camera); the others go clockwise onto the chairs.
 */
export function trucoScene(width: number, height: number, seats: number, bottom: number): Scene {
  const tall = width < height * 1.2;
  const coverScale = Math.max(
    width / SCENE_WIDTH,
    height / (SCENE_HEIGHT * (tall ? TALL_SHOWN : 1))
  );
  const card = Math.round(
    Math.min(64, width * 0.13, Math.max(46, SCENE_WIDTH * coverScale * 0.03))
  );
  const playedWidth = card + 13;
  const projectedHalfHeight = 0.53;
  const playHalfHeight = Math.ceil(playedWidth * projectedHalfHeight);
  const handCard = Math.round(Math.min(80, Math.max(50, width * 0.092)));
  const viraCard = Math.round(Math.min(60, Math.max(44, width * 0.072)));
  const pileHalfHeight = Math.ceil(viraCard * 0.68);
  const handTop = height - Math.ceil(handCard * 1.54) - 12;
  const vira = { x: Math.round(width / 2), y: handTop - pileHalfHeight - 10 };
  const farPlayLimit = vira.y - pileHalfHeight - playHalfHeight - 11;
  // Never zoom past covering the stage: fitting the far card on the tabletop that way cut most
  // of the bar (its signs and walls) out of the photo.
  const scale = tall ? coverScale : coverScale * FAR;
  const w = SCENE_WIDTH * scale;
  const h = SCENE_HEIGHT * scale;
  const left = (width - w) / 2;
  // The ceiling stays in view; what is left below the photo is the near side of the table.
  const top = Math.min(0, height - h);
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
  const near = at(NEAR);
  near.y = Math.round(height - Math.max(NEAR_GAP, ((100 - NEAR.y) / 100) * h));
  // Reserve the fan's height, the played card's label, and room for a focused hand card.
  const spots = played.map((p, step) => at(p, tall ? TALL[count].played[step] : undefined));
  const farStep = count / 2;
  const tabletop = Math.round(top + TABLE_BACK * h);
  spots[farStep].y = Math.min(
    farPlayLimit,
    Math.max(spots[farStep].y, tabletop + playHalfHeight + 15)
  );
  // Leave space beside the fan for the viewer's play and its index.
  const fanGap = Math.round(handCard + playedWidth / 2 + 18);
  const compact = width < 480;
  // On phones the viewer's avatar is on the left of the fan.
  spots[0].x += compact ? fanGap : -fanGap;
  spots[0].y = Math.min(spots[0].y, near.y - playHalfHeight - (compact ? 40 : 56));
  const adjacent = compact ? 3 : 1;
  if (count === 4 && Math.abs(spots[0].x - spots[adjacent].x) < playedWidth + 12) {
    const sideY = spots[0].y - Math.ceil(playedWidth * 2 * projectedHalfHeight) - 16;
    spots[1].y = Math.min(spots[1].y, sideY);
    spots[3].y = Math.min(spots[3].y, sideY);
  }
  const seatPoints = Array.from({ length: count }, (_, seat) => {
    const step = order(seat);
    if (step === 0) return near;
    const chair = at(chairs[step - 1], tall ? TALL[count].seats[step - 1] : undefined);
    if (step === farStep)
      chair.y = Math.min(
        chair.y,
        spots[step].y - Math.ceil((card + 13) * projectedHalfHeight) - 60
      );
    return chair;
  });
  // The far seat can rise into the doorway to clear its card; keep the center panel above it.
  const farSeat = seatPoints[(bottom + farStep) % count];
  const door = at(DOOR);
  door.y = Math.max(DOOR_MIN, Math.min(door.y, farSeat.y - DOOR_CLEARANCE));
  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(w),
    height: Math.round(h),
    framed: left > 0.5 || top + h < height - 0.5,
    seats: seatPoints,
    played: Array.from({ length: count }, (_, seat) => spots[order(seat)]),
    vira,
    viraCard,
    door,
    card,
    handCard,
  };
}
