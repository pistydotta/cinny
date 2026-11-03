import { itemMods, rarityRank } from './engine/items';
import { heroStats } from './engine/progress';
import { powerOf } from './engine/stats';
import { GameState, Item, ModKey, Slot, StatKey } from './engine/types';

// What the inventory and item screens show, worked out apart from React so it can be tested.

export type Category = 'all' | 'weapons' | 'armor' | 'jewelry' | 'upgrades' | 'new';
export const CATEGORIES: Category[] = ['all', 'upgrades', 'new', 'weapons', 'armor', 'jewelry'];

const ARMOR: Slot[] = ['offhand', 'head', 'chest', 'hands', 'feet'];

export type SortBy = 'power' | 'rarity' | 'level' | 'recent';
export const SORTS: SortBy[] = ['power', 'rarity', 'level', 'recent'];

export type ItemRow = { item: Item; delta: number };

/** Every inventory item with how much it would change the hero's power. */
export const withDeltas = (s: GameState): ItemRow[] => {
  const now = powerOf(heroStats(s));
  return s.inventory.map((item) => ({
    item,
    delta: powerOf(heroStats(s, { ...s.equipment, [item.kind]: item })) - now,
  }));
};

export const inCategory = (row: ItemRow, c: Category): boolean => {
  switch (c) {
    case 'weapons':
      return row.item.kind === 'weapon';
    case 'armor':
      return ARMOR.includes(row.item.kind);
    case 'jewelry':
      return row.item.kind === 'ring' || row.item.kind === 'amulet';
    case 'upgrades':
      return row.delta > 0;
    case 'new':
      return !!row.item.isNew;
    default:
      return true;
  }
};

const idNum = (id: string) => Number(id.replace(/\D/g, '')) || 0;

export const sortRows = (rows: ItemRow[], by: SortBy): ItemRow[] => {
  const out = [...rows];
  switch (by) {
    case 'rarity':
      out.sort(
        (a, b) =>
          rarityRank(b.item.rarity) - rarityRank(a.item.rarity) ||
          b.item.plus - a.item.plus ||
          b.item.level - a.item.level
      );
      break;
    case 'level':
      out.sort((a, b) => b.item.level - a.item.level || b.delta - a.delta);
      break;
    case 'recent':
      out.sort((a, b) => idNum(b.item.id) - idNum(a.item.id));
      break;
    default:
      out.sort((a, b) => b.delta - a.delta);
  }
  return out;
};

export type ModRow = { key: ModKey; value: number; diff: number };

/** The item's bonuses next to the equipped piece's: each line with its number and change. */
export const compareMods = (item: Item, other?: Item): ModRow[] => {
  const mine = itemMods(item);
  const theirs = other ? itemMods(other) : {};
  const keys = Array.from(new Set([...Object.keys(mine), ...Object.keys(theirs)])) as ModKey[];
  return keys.map((key) => ({
    key,
    value: mine[key] ?? 0,
    diff: (mine[key] ?? 0) - (theirs[key] ?? 0),
  }));
};

export const HERO_DELTA_KEYS: StatKey[] = [
  'damage',
  'maxHp',
  'attackSpeed',
  'critChance',
  'armor',
  'dodge',
  'lifesteal',
  'skillPower',
];

export type HeroDelta = {
  power: number;
  powerPct: number;
  stats: { key: StatKey; diff: number }[];
};

/** What the whole hero gains or loses by equipping `item`, after every bonus is counted. */
export const heroDelta = (s: GameState, item: Item): HeroDelta => {
  const before = heroStats(s);
  const after = heroStats(s, { ...s.equipment, [item.kind]: item });
  const p0 = powerOf(before);
  const p1 = powerOf(after);
  return {
    power: p1 - p0,
    powerPct: p0 > 0 ? (p1 - p0) / p0 : 0,
    stats: HERO_DELTA_KEYS.map((key) => ({ key, diff: after[key] - before[key] })).filter(
      (d) => Math.abs(d.diff) > 1e-6
    ),
  };
};

export const newCount = (s: GameState): number => s.inventory.filter((i) => i.isNew).length;
