import { MAX_PLUS, RARITY_INFO, levelScale } from './items';
import { Item, Materials, Rarity } from './types';

// The forge: ember stones and gold take an item from +0 up to +12.
// - Up to +3 almost always works and is cheap, so any decent piece gets there.
// - +4..+10 can fail; a failure drops the item one level, and each failure in a row adds
//   PITY to the next try, so a bad streak always ends. That keeps it a cost, not a lottery.
// - +11 and +12 are a gamble: tiny odds, and a failure destroys the item. Only epic and better
//   can go that high, and only the rarest are worth the risk.

/** Chance to succeed going TO each level (index = target). */
export const FORGE_CHANCE = [1, 1, 1, 0.95, 0.85, 0.75, 0.65, 0.55, 0.45, 0.38, 0.3, 0.03, 0.01];
/** Added per failure in a row, for targets up to +10. */
export const PITY = 0.05;
/** From this level up a failure breaks the item instead of dropping a level. */
export const BREAK_FROM = 11;

const RARITY_COST: Record<Rarity, number> = {
  common: 0.5,
  uncommon: 0.75,
  rare: 1,
  epic: 1.5,
  legendary: 2,
  mythic: 3,
};

export const maxPlusOf = (item: Item): number =>
  Math.min(MAX_PLUS, RARITY_INFO[item.rarity].maxPlus);

export type ForgeCost = { stones: number; cores: number; gold: number };

/** What one try costs to take `item` to its next level. */
export const forgeCost = (item: Item): ForgeCost => {
  const target = item.plus + 1;
  const rm = RARITY_COST[item.rarity];
  let cores = 0;
  if (target >= 8) cores = Math.ceil((target - 7) * 2 * rm);
  if (target >= BREAK_FROM) cores = Math.ceil((target - 9) * 10 * rm);
  return {
    stones: Math.ceil(rm * (2 + target * target * 1.5)),
    cores,
    gold: Math.round(20 * levelScale(item.level) * target ** 1.6 * rm),
  };
};

/** The chance of the next try, failures and talents counted. */
export const forgeChance = (item: Item, bonus: number): number => {
  const target = item.plus + 1;
  const base = FORGE_CHANCE[target] ?? 0;
  if (target >= BREAK_FROM) return base;
  return Math.min(1, base + item.fails * PITY + bonus);
};

export type ForgeOutcome = 'success' | 'downgrade' | 'broken';

/** Applies a roll in [0,1) to the item. Undefined `item` in the result means it broke. */
export const applyForge = (
  item: Item,
  roll: number,
  bonus: number
): { item?: Item; outcome: ForgeOutcome } => {
  const p = forgeChance(item, bonus);
  if (roll < p) return { item: { ...item, plus: item.plus + 1, fails: 0 }, outcome: 'success' };
  if (item.plus + 1 >= BREAK_FROM) return { outcome: 'broken' };
  return {
    item: { ...item, plus: Math.max(0, item.plus - 1), fails: item.fails + 1 },
    outcome: 'downgrade',
  };
};

const SALVAGE_STONES: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 5,
  epic: 12,
  legendary: 30,
  mythic: 80,
};
const SALVAGE_CORES: Record<Rarity, number> = {
  common: 0,
  uncommon: 0,
  rare: 0,
  epic: 1,
  legendary: 3,
  mythic: 10,
};

/** What breaking an item down gives. Forged items give back part of what went into them. */
export const salvageValue = (item: Item, yieldBonus: number): Materials => {
  const levelBonus = 1 + item.level / 40;
  let forged = 0;
  for (let p = 1; p <= item.plus; p += 1)
    forged += Math.ceil(RARITY_COST[item.rarity] * (2 + p * p * 1.5));
  return {
    stones: Math.floor(SALVAGE_STONES[item.rarity] * levelBonus * (1 + yieldBonus) + forged * 0.4),
    cores: SALVAGE_CORES[item.rarity],
  };
};

export const canAfford = (have: Materials, gold: number, cost: ForgeCost): boolean =>
  have.stones >= cost.stones && have.cores >= cost.cores && gold >= cost.gold;
