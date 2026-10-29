export type TableLayout = 'landscape' | 'portrait';

export type Point = { x: number; y: number };

type LayoutSpec = {
  /** Where the pot sits; bets slide here and winnings leave from here. */
  pot: Point;
  /** Where the dealer deals from. */
  center: Point;
  seats: Point[];
  bets: Point[];
  dealer: Point[];
};

/** Positions in % of the stage, for seat 0 (the local player, always at the bottom) to 5. */
export const LAYOUTS: Record<TableLayout, LayoutSpec> = {
  landscape: {
    pot: { x: 50, y: 33 },
    center: { x: 50, y: 48 },
    seats: [
      { x: 50, y: 83 },
      { x: 11, y: 66 },
      { x: 15, y: 25 },
      { x: 50, y: 14 },
      { x: 85, y: 25 },
      { x: 89, y: 66 },
    ],
    bets: [
      { x: 50, y: 59 },
      { x: 24, y: 60 },
      { x: 27, y: 33 },
      { x: 50, y: 25 },
      { x: 73, y: 33 },
      { x: 76, y: 60 },
    ],
    dealer: [
      { x: 60, y: 74 },
      { x: 19, y: 54 },
      { x: 21, y: 37 },
      { x: 58, y: 24 },
      { x: 79, y: 37 },
      { x: 81, y: 54 },
    ],
  },
  portrait: {
    pot: { x: 50, y: 34 },
    center: { x: 50, y: 47 },
    seats: [
      { x: 50, y: 87 },
      { x: 14, y: 68 },
      { x: 14, y: 30 },
      { x: 50, y: 8 },
      { x: 86, y: 30 },
      { x: 86, y: 68 },
    ],
    bets: [
      { x: 50, y: 71 },
      { x: 31, y: 61 },
      { x: 31, y: 35 },
      { x: 50, y: 20 },
      { x: 69, y: 35 },
      { x: 69, y: 61 },
    ],
    dealer: [
      { x: 64, y: 79 },
      { x: 25, y: 56 },
      { x: 25, y: 40 },
      { x: 64, y: 15 },
      { x: 75, y: 40 },
      { x: 75, y: 56 },
    ],
  },
};

export const pct = (p: Point) => ({ left: `${p.x}%`, top: `${p.y}%` });

/** Vector from `from` to `to` in container units, for CSS translate. */
export const offset = (from: Point, to: Point) => ({
  x: `${(to.x - from.x).toFixed(2)}cqw`,
  y: `${(to.y - from.y).toFixed(2)}cqh`,
});
