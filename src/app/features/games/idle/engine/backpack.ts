import { scaleMods, sumMods } from './stats';
import { Backpack, Item, Mods, PlacedItem } from './types';

// A grid bag in the style of backpack-battler games: every item takes a rectangle of cells
// and can turn 90°. Gear in the bag is only stored; charms in the bag are active, and each
// charm grows by SYNERGY for every charm of the same element touching it by an edge.
export const SYNERGY = 0.25;

export const BASE_COLS = 6;
export const BASE_ROWS = 4;

export type Rect = { x: number; y: number; w: number; h: number };

export const footprint = (p: { item: Item; rotated: boolean }): { w: number; h: number } =>
  p.rotated ? { w: p.item.h, h: p.item.w } : { w: p.item.w, h: p.item.h };

export const rectOf = (p: PlacedItem): Rect => ({ x: p.x, y: p.y, ...footprint(p) });

const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const touches = (a: Rect, b: Rect): boolean => {
  const sideBySide = (a.x + a.w === b.x || b.x + b.w === a.x) && a.y < b.y + b.h && b.y < a.y + a.h;
  const stacked = (a.y + a.h === b.y || b.y + b.h === a.y) && a.x < b.x + b.w && b.x < a.x + a.w;
  return sideBySide || stacked;
};

export const canPlace = (
  bp: Backpack,
  item: Item,
  x: number,
  y: number,
  rotated: boolean,
  ignoreId?: string
): boolean => {
  const { w, h } = footprint({ item, rotated });
  if (x < 0 || y < 0 || x + w > bp.cols || y + h > bp.rows) return false;
  const rect = { x, y, w, h };
  return bp.items.every((p) => p.item.id === ignoreId || !overlaps(rect, rectOf(p)));
};

/** The first free spot, scanning rows top to bottom and trying both turns. */
export const findSpot = (
  bp: Backpack,
  item: Item
): { x: number; y: number; rotated: boolean } | undefined => {
  for (let y = 0; y < bp.rows; y += 1) {
    for (let x = 0; x < bp.cols; x += 1) {
      if (canPlace(bp, item, x, y, false)) return { x, y, rotated: false };
      if (item.w !== item.h && canPlace(bp, item, x, y, true)) return { x, y, rotated: true };
    }
  }
  return undefined;
};

/** A new bag with the item in it, or undefined when it doesn't fit. */
export const addItem = (bp: Backpack, item: Item): Backpack | undefined => {
  const spot = findSpot(bp, item);
  if (!spot) return undefined;
  return { ...bp, items: [...bp.items, { item, ...spot }] };
};

export const removeItem = (bp: Backpack, id: string): Backpack => ({
  ...bp,
  items: bp.items.filter((p) => p.item.id !== id),
});

export const moveItem = (
  bp: Backpack,
  id: string,
  x: number,
  y: number,
  rotated: boolean
): Backpack | undefined => {
  const placed = bp.items.find((p) => p.item.id === id);
  if (!placed || !canPlace(bp, placed.item, x, y, rotated, id)) return undefined;
  return {
    ...bp,
    items: bp.items.map((p) => (p.item.id === id ? { ...p, x, y, rotated } : p)),
  };
};

/** Turns an item in place, or nudges it to the nearest spot where it fits turned. */
export const rotateItem = (bp: Backpack, id: string): Backpack | undefined => {
  const placed = bp.items.find((p) => p.item.id === id);
  if (!placed) return undefined;
  const rotated = !placed.rotated;
  if (canPlace(bp, placed.item, placed.x, placed.y, rotated, id)) {
    return moveItem(bp, id, placed.x, placed.y, rotated);
  }
  const others = removeItem(bp, id);
  for (let y = 0; y < bp.rows; y += 1) {
    for (let x = 0; x < bp.cols; x += 1) {
      if (canPlace(others, placed.item, x, y, rotated)) return moveItem(bp, id, x, y, rotated);
    }
  }
  return undefined;
};

/** Resizing keeps what still fits where it is and repacks the rest; what can't fit comes back. */
export const resize = (
  bp: Backpack,
  cols: number,
  rows: number
): { bp: Backpack; left: Item[] } => {
  let next: Backpack = { cols, rows, items: [] };
  const left: Item[] = [];
  const kept = bp.items.filter((p) => canPlace(next, p.item, p.x, p.y, p.rotated));
  kept.forEach((p) => {
    if (canPlace(next, p.item, p.x, p.y, p.rotated)) next = { ...next, items: [...next.items, p] };
  });
  bp.items
    .filter((p) => !next.items.includes(p))
    .forEach((p) => {
      const added = addItem(next, p.item);
      if (added) next = added;
      else left.push(p.item);
    });
  return { bp: next, left };
};

/** For each charm, how many charms of its element touch it. */
export const charmLinks = (bp: Backpack): Map<string, number> => {
  const charms = bp.items.filter((p) => p.item.kind === 'charm' && p.item.element);
  const links = new Map<string, number>();
  charms.forEach((p) => {
    const rect = rectOf(p);
    const n = charms.filter(
      (o) => o !== p && o.item.element === p.item.element && touches(rect, rectOf(o))
    ).length;
    links.set(p.item.id, n);
  });
  return links;
};

/** What every charm in the bag adds, synergy included. */
export const charmMods = (bp: Backpack): Mods => {
  const links = charmLinks(bp);
  return sumMods(
    bp.items
      .filter((p) => p.item.kind === 'charm')
      .map((p) => scaleMods(p.item.mods, 1 + SYNERGY * (links.get(p.item.id) ?? 0)))
  );
};
