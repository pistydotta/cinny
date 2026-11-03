import { SPEC_LEVEL, getClass } from './classes';
import { applyForge, canAfford, forgeCost, ForgeOutcome, maxPlusOf, salvageValue } from './forge';
import { rarityRank } from './items';
import { ALTAR, altarCost, ashesFor, rebirthStage, startStage } from './prestige';
import {
  UPGRADES,
  availableTalentPoints,
  capacityOf,
  powerDelta,
  totalMods,
  upgradeCost,
} from './progress';
import { createRng } from './rng';
import { getTalent, rowOpen } from './talents';
import { GameState, Item, Rarity, SLOTS, Slot, SpecId } from './types';

// What the player does. Each action takes a state and returns a new one, or says why it
// can't. The same functions could run on a server later and answer the same way.
export type ActionError =
  | 'not_found'
  | 'bag_full'
  | 'not_enough_gold'
  | 'not_enough_materials'
  | 'maxed'
  | 'no_points'
  | 'locked'
  | 'too_early'
  | 'nothing';
export type ActionResult = { ok: true; state: GameState } | { ok: false; error: ActionError };

const ok = (state: GameState): ActionResult => ({ ok: true, state });
const fail = (error: ActionError): { ok: false; error: ActionError } => ({ ok: false, error });
const clone = (s: GameState): GameState => structuredClone(s);

const findIndex = (s: GameState, itemId: string) => s.inventory.findIndex((i) => i.id === itemId);

export const equip = (s: GameState, itemId: string): ActionResult => {
  const idx = findIndex(s, itemId);
  if (idx < 0) return fail('not_found');
  const next = clone(s);
  const [item] = next.inventory.splice(idx, 1);
  const previous = next.equipment[item.kind];
  if (previous) next.inventory.push(previous);
  next.equipment[item.kind] = { ...item, isNew: false };
  return ok(next);
};

export const unequip = (s: GameState, slot: Slot): ActionResult => {
  const item = s.equipment[slot];
  if (!item) return fail('not_found');
  if (s.inventory.length >= capacityOf(s)) return fail('bag_full');
  const next = clone(s);
  next.inventory.push(item);
  delete next.equipment[slot];
  return ok(next);
};

/** Puts the strongest piece the hero has in every slot. */
export const equipBest = (s: GameState): ActionResult => {
  let next = clone(s);
  let changed = false;
  SLOTS.forEach((slot) => {
    const options = next.inventory.filter((i) => i.kind === slot);
    let best: Item | undefined;
    let bestDelta = 0;
    options.forEach((item) => {
      const d = powerDelta(next, item);
      if (d > bestDelta) {
        bestDelta = d;
        best = item;
      }
    });
    if (best) {
      const r = equip(next, best.id);
      if (r.ok) {
        next = r.state;
        changed = true;
      }
    }
  });
  return changed ? ok(next) : fail('nothing');
};

export const toggleLock = (s: GameState, itemId: string): ActionResult => {
  const next = clone(s);
  const item =
    next.inventory.find((i) => i.id === itemId) ??
    Object.values(next.equipment).find((i) => i?.id === itemId);
  if (!item) return fail('not_found');
  item.locked = !item.locked;
  return ok(next);
};

export const markSeen = (s: GameState): ActionResult => {
  if (!s.inventory.some((i) => i.isNew)) return fail('nothing');
  const next = clone(s);
  next.inventory = next.inventory.map((i) => (i.isNew ? { ...i, isNew: false } : i));
  return ok(next);
};

export const sell = (s: GameState, itemId: string): ActionResult => {
  const idx = findIndex(s, itemId);
  if (idx < 0) return fail('not_found');
  if (s.inventory[idx].locked) return fail('locked');
  const next = clone(s);
  const [item] = next.inventory.splice(idx, 1);
  next.gold += item.value;
  next.lifetime.goldEarned += item.value;
  return ok(next);
};

export const salvage = (s: GameState, itemId: string): ActionResult => {
  const idx = findIndex(s, itemId);
  if (idx < 0) return fail('not_found');
  if (s.inventory[idx].locked) return fail('locked');
  const next = clone(s);
  const [item] = next.inventory.splice(idx, 1);
  const got = salvageValue(item, totalMods(s).salvageYield ?? 0);
  next.materials.stones += got.stones;
  next.materials.cores += got.cores;
  return ok(next);
};

/**
 * Bulk clean-up: every unlocked, unforged item at or below a rarity that isn't an upgrade.
 * `how` picks gold or ember stones.
 */
export const bulkClear = (s: GameState, rarity: Rarity, how: 'sell' | 'salvage'): ActionResult => {
  const limit = rarityRank(rarity);
  const gone = s.inventory.filter(
    (i) => !i.locked && i.plus === 0 && rarityRank(i.rarity) <= limit && powerDelta(s, i) <= 0
  );
  if (gone.length === 0) return fail('nothing');
  const next = clone(s);
  const ids = new Set(gone.map((i) => i.id));
  next.inventory = next.inventory.filter((i) => !ids.has(i.id));
  if (how === 'sell') {
    const gold = gone.reduce((sum, i) => sum + i.value, 0);
    next.gold += gold;
    next.lifetime.goldEarned += gold;
  } else {
    const bonus = totalMods(s).salvageYield ?? 0;
    gone.forEach((i) => {
      const got = salvageValue(i, bonus);
      next.materials.stones += got.stones;
      next.materials.cores += got.cores;
    });
  }
  return ok(next);
};

export const setAutoSalvage = (s: GameState, rarity: Rarity | null): ActionResult => {
  const next = clone(s);
  next.settings.autoSalvage = rarity;
  return ok(next);
};

export type ForgeResult =
  | { ok: true; state: GameState; outcome: ForgeOutcome; plus: number }
  | { ok: false; error: ActionError };

/** One forge try on an item, in the inventory or equipped. The roll comes from the save's rng. */
export const forge = (s: GameState, itemId: string): ForgeResult => {
  const slot = SLOTS.find((sl) => s.equipment[sl]?.id === itemId);
  const item = slot ? s.equipment[slot] : s.inventory.find((i) => i.id === itemId);
  if (!item) return fail('not_found');
  if (item.plus >= maxPlusOf(item)) return fail('maxed');
  const cost = forgeCost(item);
  if (!canAfford(s.materials, s.gold, cost)) {
    return fail(s.gold < cost.gold ? 'not_enough_gold' : 'not_enough_materials');
  }
  const next = clone(s);
  const rng = createRng(next.rngState);
  const roll = rng.next();
  next.rngState = rng.state();
  next.materials.stones -= cost.stones;
  next.materials.cores -= cost.cores;
  next.gold -= cost.gold;
  const result = applyForge(item, roll, totalMods(s).forgeChance ?? 0);
  if (slot) {
    if (result.item) next.equipment[slot] = result.item;
    else delete next.equipment[slot];
  } else {
    const idx = next.inventory.findIndex((i) => i.id === itemId);
    if (result.item) next.inventory[idx] = result.item;
    else next.inventory.splice(idx, 1);
  }
  const plus = result.item?.plus ?? 0;
  next.lifetime.bestPlus = Math.max(next.lifetime.bestPlus, plus);
  return { ok: true, state: next, outcome: result.outcome, plus };
};

export const learnTalent = (s: GameState, talentId: string): ActionResult => {
  const def = getTalent(talentId);
  if (!def) return fail('not_found');
  if (availableTalentPoints(s) <= 0) return fail('no_points');
  if (!rowOpen(s.hero.talents, def)) return fail('too_early');
  const rank = s.hero.talents[def.id] ?? 0;
  if (rank >= def.maxRank) return fail('maxed');
  const next = clone(s);
  next.hero.talents[def.id] = rank + 1;
  return ok(next);
};

/** Takes back every talent point, for gold that grows with the hero's level. */
export const resetTalentsCost = (s: GameState): number => Math.round(50 * s.hero.level ** 1.8);

export const resetTalents = (s: GameState): ActionResult => {
  if (Object.keys(s.hero.talents).length === 0) return fail('nothing');
  const cost = resetTalentsCost(s);
  if (s.gold < cost) return fail('not_enough_gold');
  const next = clone(s);
  next.gold -= cost;
  next.hero.talents = {};
  return ok(next);
};

export const chooseSpec = (s: GameState, specId: SpecId): ActionResult => {
  if (s.hero.specId) return fail('maxed');
  if (s.hero.level < SPEC_LEVEL) return fail('too_early');
  if (!getClass(s.hero.classId).specs.some((sp) => sp.id === specId)) return fail('not_found');
  const next = clone(s);
  next.hero.specId = specId;
  next.battle = null;
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
  return ok(next);
};

export const buyAltar = (s: GameState, id: string): ActionResult => {
  const def = ALTAR.find((a) => a.id === id);
  if (!def) return fail('not_found');
  const level = s.prestige.altar[def.id] ?? 0;
  if (def.max !== undefined && level >= def.max) return fail('maxed');
  const cost = altarCost(def, level);
  if (s.prestige.ashes < cost) return fail('not_enough_materials');
  const next = clone(s);
  next.prestige.ashes -= cost;
  next.prestige.altar[def.id] = level + 1;
  return ok(next);
};

export const canRebirth = (s: GameState): boolean =>
  s.maxStage >= rebirthStage(s.prestige.rebirths);

/**
 * Starts the run over: level, talents, gold, training and stage go; gear, materials, the spec,
 * the altar and the arena stay. Pays ashes for how deep this run went.
 */
export const rebirth = (s: GameState): ActionResult => {
  if (!canRebirth(s)) return fail('too_early');
  const next = clone(s);
  const ashes = ashesFor(s.maxStage);
  next.prestige.rebirths += 1;
  next.prestige.ashes += ashes;
  next.prestige.ashesEarned += ashes;
  next.hero.level = 1;
  next.hero.xp = 0;
  next.hero.talents = {};
  next.gold = 0;
  next.upgrades = { satchel: s.upgrades.satchel };
  const start = startStage(next.prestige, s.lifetime.bestStage);
  next.stage = start;
  next.maxStage = start;
  next.kills = 0;
  next.autoAdvance = true;
  next.battle = null;
  next.respawnMs = 0;
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
