import { BASE_ROWS, addItem, moveItem, removeItem, resize, rotateItem } from './backpack';
import { UPGRADES, upgradeCost } from './progress';
import { Attribute, GameState, Item, Rarity, RARITIES, Slot } from './types';

// What the player does. Each action takes a state and returns a new one, or says why it
// can't. The same functions could run on a server later and answer the same way.
export type ActionError = 'not_found' | 'bag_full' | 'not_enough_gold' | 'maxed' | 'no_points';
export type ActionResult = { ok: true; state: GameState } | { ok: false; error: ActionError };

const ok = (state: GameState): ActionResult => ({ ok: true, state });
const fail = (error: ActionError): ActionResult => ({ ok: false, error });
const clone = (s: GameState): GameState => structuredClone(s);

export const equip = (s: GameState, itemId: string): ActionResult => {
  const placed = s.backpack.items.find((p) => p.item.id === itemId);
  if (!placed || placed.item.kind === 'charm') return fail('not_found');
  const slot = placed.item.kind as Slot;
  const next = clone(s);
  let bp = removeItem(next.backpack, itemId);
  const previous = next.equipment[slot];
  if (previous) {
    const withPrevious = addItem(bp, previous);
    if (!withPrevious) return fail('bag_full');
    bp = withPrevious;
  }
  next.backpack = bp;
  next.equipment[slot] = placed.item;
  return ok(next);
};

export const unequip = (s: GameState, slot: Slot): ActionResult => {
  const item = s.equipment[slot];
  if (!item) return fail('not_found');
  const bp = addItem(s.backpack, item);
  if (!bp) return fail('bag_full');
  const next = clone(s);
  next.backpack = bp;
  delete next.equipment[slot];
  return ok(next);
};

export const sell = (s: GameState, itemId: string): ActionResult => {
  const placed = s.backpack.items.find((p) => p.item.id === itemId);
  if (!placed) return fail('not_found');
  const next = clone(s);
  next.backpack = removeItem(next.backpack, itemId);
  next.gold += placed.item.value;
  next.lifetime.goldEarned += placed.item.value;
  return ok(next);
};

/** Sells every bag item at or below a rarity. Charms stay: they're placed on purpose. */
export const sellUpTo = (s: GameState, rarity: Rarity): ActionResult => {
  const limit = RARITIES.indexOf(rarity);
  const sold: Item[] = s.backpack.items
    .map((p) => p.item)
    .filter((item) => item.kind !== 'charm' && RARITIES.indexOf(item.rarity) <= limit);
  if (sold.length === 0) return fail('not_found');
  const next = clone(s);
  const ids = new Set(sold.map((i) => i.id));
  next.backpack.items = next.backpack.items.filter((p) => !ids.has(p.item.id));
  const gold = sold.reduce((sum, i) => sum + i.value, 0);
  next.gold += gold;
  next.lifetime.goldEarned += gold;
  return ok(next);
};

export const move = (
  s: GameState,
  itemId: string,
  x: number,
  y: number,
  rotated: boolean
): ActionResult => {
  const bp = moveItem(s.backpack, itemId, x, y, rotated);
  if (!bp) return fail('bag_full');
  return ok({ ...clone(s), backpack: bp });
};

export const rotate = (s: GameState, itemId: string): ActionResult => {
  const bp = rotateItem(s.backpack, itemId);
  if (!bp) return fail('bag_full');
  return ok({ ...clone(s), backpack: bp });
};

export const allocate = (s: GameState, attr: Attribute): ActionResult => {
  if (s.hero.freePoints <= 0) return fail('no_points');
  const next = clone(s);
  next.hero.freePoints -= 1;
  next.hero.allocated[attr] += 1;
  return ok(next);
};

export const buyUpgrade = (s: GameState, id: string): ActionResult => {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) return fail('not_found');
  const level = s.upgrades[def.id] ?? 0;
  if (def.max !== undefined && level >= def.max) return fail('maxed');
  const cost = upgradeCost(def, level);
  if (s.gold < cost) return fail('not_enough_gold');
  const next = clone(s);
  next.gold -= cost;
  next.upgrades[def.id] = level + 1;
  if (def.id === 'satchel') {
    next.backpack = resize(next.backpack, next.backpack.cols, BASE_ROWS + level + 1).bp;
  }
  return ok(next);
};

export const setAutoAdvance = (s: GameState, on: boolean): ActionResult => {
  const next = clone(s);
  next.autoAdvance = on;
  return ok(next);
};

/** Back to the highest stage reached, e.g. to try the boss again. */
export const goToStage = (s: GameState, stage: number): ActionResult => {
  if (stage < 1 || stage > s.maxStage) return fail('not_found');
  const next = clone(s);
  next.stage = stage;
  next.kills = 0;
  next.battle = null;
  return ok(next);
};
