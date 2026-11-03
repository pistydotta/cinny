import { Rng, chance, pick, pickWeighted, rollRange } from './rng';
import { scaleMods } from './stats';
import { ClassDef, Item, ModKey, Mods, Rarity, Slot, WeaponBase } from './types';

type ItemBase = {
  id: string;
  kind: Slot;
  icon: string;
  /** Rolled once per item and grown with the item level. */
  implicit: Mods;
};

// Weapons carry most of a hero's damage, armor most of the life. Values are at item level 1;
// `levelScale` grows them, so gear from deeper stages keeps up with the enemies there.
const WEAPONS: Record<WeaponBase, ItemBase> = {
  sword: { id: 'sword', kind: 'weapon', icon: '⚔️', implicit: { damage: 4.2 } },
  axe: { id: 'axe', kind: 'weapon', icon: '🪓', implicit: { damage: 5.2 } },
  mace: { id: 'mace', kind: 'weapon', icon: '🔨', implicit: { damage: 4.5, armor: 1 } },
  bow: { id: 'bow', kind: 'weapon', icon: '🏹', implicit: { damage: 4 } },
  dagger: { id: 'dagger', kind: 'weapon', icon: '🔪', implicit: { damage: 3.6 } },
  staff: { id: 'staff', kind: 'weapon', icon: '🦯', implicit: { damage: 4, maxHp: 4 } },
  wand: { id: 'wand', kind: 'weapon', icon: '🪄', implicit: { damage: 3.4 } },
  claws: { id: 'claws', kind: 'weapon', icon: '🐾', implicit: { damage: 3.8 } },
};

const ARMOR: ItemBase[] = [
  { id: 'shield', kind: 'offhand', icon: '🛡️', implicit: { armor: 6, maxHp: 8 } },
  { id: 'tome', kind: 'offhand', icon: '📕', implicit: { maxHp: 5, damage: 0.8 } },
  { id: 'quiver', kind: 'offhand', icon: '🎯', implicit: { damage: 1.2 } },
  { id: 'helm', kind: 'head', icon: '⛑️', implicit: { armor: 3, maxHp: 10 } },
  { id: 'hood', kind: 'head', icon: '🎭', implicit: { maxHp: 8, damage: 0.4 } },
  { id: 'plate', kind: 'chest', icon: '🦺', implicit: { armor: 8, maxHp: 20 } },
  { id: 'robe', kind: 'chest', icon: '👘', implicit: { armor: 2, maxHp: 16 } },
  { id: 'gloves', kind: 'hands', icon: '🧤', implicit: { armor: 2, maxHp: 5 } },
  { id: 'boots', kind: 'feet', icon: '🥾', implicit: { armor: 2, maxHp: 6 } },
  { id: 'ring', kind: 'ring', icon: '💍', implicit: { damage: 0.6 } },
  { id: 'amulet', kind: 'amulet', icon: '📿', implicit: { maxHp: 4, damage: 0.4 } },
];

export const ITEM_BASES: ItemBase[] = [...Object.values(WEAPONS), ...ARMOR];
const BASE_BY_ID = new Map(ITEM_BASES.map((b) => [b.id, b]));
export const getItemBase = (id: string): ItemBase | undefined => BASE_BY_ID.get(id);

type Affix = {
  key: ModKey;
  min: number;
  max: number;
  /** Grows with item level (flat stats). Percent stats stay put, or they would explode. */
  scales: boolean;
  /**
   * Grows slowly and in a straight line instead. Attributes multiply damage and life, so if
   * they grew like flat stats the two would compound and blow up the curve.
   */
  linear?: boolean;
  kinds?: Slot[];
};

const AFFIXES: Affix[] = [
  { key: 'damage', min: 1, max: 3, scales: true, kinds: ['weapon', 'ring', 'amulet', 'hands'] },
  { key: 'maxHp', min: 6, max: 14, scales: true },
  {
    key: 'armor',
    min: 2,
    max: 5,
    scales: true,
    kinds: ['offhand', 'head', 'chest', 'hands', 'feet'],
  },
  { key: 'str', min: 1, max: 3, scales: false, linear: true },
  { key: 'agi', min: 1, max: 3, scales: false, linear: true },
  { key: 'int', min: 1, max: 3, scales: false, linear: true },
  { key: 'vit', min: 1, max: 3, scales: false, linear: true },
  { key: 'damagePct', min: 0.03, max: 0.1, scales: false },
  { key: 'maxHpPct', min: 0.03, max: 0.1, scales: false },
  {
    key: 'attackSpeedPct',
    min: 0.02,
    max: 0.08,
    scales: false,
    kinds: ['weapon', 'hands', 'ring'],
  },
  { key: 'critChance', min: 0.01, max: 0.04, scales: false },
  { key: 'critDamage', min: 0.05, max: 0.25, scales: false, kinds: ['weapon', 'ring', 'amulet'] },
  { key: 'dodge', min: 0.01, max: 0.03, scales: false, kinds: ['feet', 'chest', 'offhand'] },
  { key: 'lifesteal', min: 0.01, max: 0.03, scales: false, kinds: ['weapon', 'ring', 'amulet'] },
  { key: 'skillPower', min: 0.03, max: 0.12, scales: false },
  {
    key: 'cooldownReduction',
    min: 0.02,
    max: 0.05,
    scales: false,
    kinds: ['head', 'amulet', 'offhand'],
  },
  { key: 'regenPct', min: 0.001, max: 0.003, scales: false, kinds: ['chest', 'amulet', 'head'] },
  { key: 'thorns', min: 0.02, max: 0.06, scales: false, kinds: ['chest', 'offhand'] },
  { key: 'execute', min: 0.05, max: 0.15, scales: false, kinds: ['weapon', 'hands'] },
  { key: 'goldFind', min: 0.05, max: 0.2, scales: false, kinds: ['ring', 'amulet', 'hands'] },
  { key: 'xpGain', min: 0.05, max: 0.15, scales: false, kinds: ['head', 'amulet'] },
  { key: 'dropRate', min: 0.03, max: 0.1, scales: false, kinds: ['ring', 'feet'] },
];

export const RARITY_INFO: Record<
  Rarity,
  { affixes: number; roll: number; value: number; maxPlus: number }
> = {
  common: { affixes: 0, roll: 1, value: 1, maxPlus: 5 },
  uncommon: { affixes: 1, roll: 1.1, value: 2, maxPlus: 7 },
  rare: { affixes: 2, roll: 1.25, value: 5, maxPlus: 10 },
  epic: { affixes: 3, roll: 1.45, value: 12, maxPlus: 12 },
  legendary: { affixes: 4, roll: 1.75, value: 30, maxPlus: 12 },
  mythic: { affixes: 5, roll: 2.2, value: 80, maxPlus: 12 },
};

const DROP_WEIGHTS: readonly (readonly [Rarity, number])[] = [
  ['common', 58],
  ['uncommon', 28],
  ['rare', 10],
  ['epic', 3],
  ['legendary', 0.6],
  ['mythic', 0.04],
];
const BOSS_WEIGHTS: readonly (readonly [Rarity, number])[] = [
  ['common', 10],
  ['uncommon', 38],
  ['rare', 34],
  ['epic', 14],
  ['legendary', 3.5],
  ['mythic', 0.3],
];

/** How much stronger a flat stat is at an item level. Enemies grow a little faster. */
export const levelScale = (level: number): number => 1.065 ** (level - 1) + (level - 1) * 0.15;

/** How much the forge adds at each + level, as a share of the item's own stats. */
export const PLUS_BONUS = [0, 0.06, 0.12, 0.19, 0.26, 0.34, 0.43, 0.53, 0.64, 0.76, 0.9, 1.15, 1.5];
export const MAX_PLUS = PLUS_BONUS.length - 1;

/** What an item really gives: its stats grown by the forge. */
export const itemMods = (item: Item): Mods =>
  item.plus > 0 ? scaleMods(item.mods, 1 + PLUS_BONUS[item.plus]) : item.mods;

export type DropOptions = {
  level: number;
  boss?: boolean;
  rarity?: Rarity;
  kind?: Slot;
};

const pickBase = (rng: Rng, cls: ClassDef, kind?: Slot): ItemBase => {
  if (kind === 'weapon') return WEAPONS[pick(rng, cls.weapons)];
  if (kind)
    return pick(
      rng,
      ARMOR.filter((b) => b.kind === kind)
    );
  // Weapons favor the class, so a mage mostly finds staves and wands.
  if (rng.next() < 0.22) {
    return chance(rng, 0.85) ? WEAPONS[pick(rng, cls.weapons)] : pick(rng, Object.values(WEAPONS));
  }
  return pick(rng, ARMOR);
};

const round = (key: ModKey, value: number): number =>
  ['str', 'agi', 'int', 'vit', 'maxHp', 'armor'].includes(key)
    ? Math.max(1, Math.round(value))
    : Math.round(value * 10000) / 10000;

export const generateItem = (rng: Rng, cls: ClassDef, id: string, opts: DropOptions): Item => {
  const level = Math.max(1, Math.floor(opts.level));
  const rarity = opts.rarity ?? pickWeighted(rng, opts.boss ? BOSS_WEIGHTS : DROP_WEIGHTS);
  const info = RARITY_INFO[rarity];
  const base = pickBase(rng, cls, opts.kind);
  const scale = levelScale(level);
  const mods: Mods = {};

  (Object.keys(base.implicit) as ModKey[]).forEach((key) => {
    const v = (base.implicit[key] ?? 0) * scale * info.roll * rollRange(rng, 0.9, 1.1);
    mods[key] = round(key, v);
  });

  // The best roll (closest to its max) names the item.
  let title: ModKey | undefined;
  let titleRoll = -1;
  const pool = AFFIXES.filter((a) => !a.kinds || a.kinds.includes(base.kind));
  for (let i = 0; i < info.affixes && pool.length > 0; i += 1) {
    const idx = Math.floor(rng.next() * pool.length);
    const affix = pool.splice(idx, 1)[0];
    const roll = rng.next();
    let grow = 1;
    if (affix.scales) grow = scale;
    else if (affix.linear) grow = 1 + (level - 1) * 0.12;
    const v = (affix.min + roll * (affix.max - affix.min)) * info.roll * grow;
    mods[affix.key] = round(affix.key, (mods[affix.key] ?? 0) + v);
    if (roll > titleRoll) {
      titleRoll = roll;
      title = affix.key;
    }
  }

  return {
    id,
    baseId: base.id,
    kind: base.kind,
    rarity,
    level,
    icon: base.icon,
    mods,
    title,
    plus: 0,
    fails: 0,
    isNew: true,
    value: Math.max(1, Math.round(2 * scale * info.value)),
  };
};

/** The starting weapon: a plain one of the class's first kind. */
export const starterWeapon = (cls: ClassDef, id: string): Item => {
  const base = WEAPONS[cls.weapons[0]];
  return {
    id,
    baseId: base.id,
    kind: 'weapon',
    rarity: 'common',
    level: 1,
    icon: base.icon,
    mods: { ...base.implicit },
    plus: 0,
    fails: 0,
    value: 1,
  };
};

export const rarityRank = (r: Rarity): number =>
  ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].indexOf(r);
