import { Rng, chance, pick, pickWeighted, rollRange } from './rng';
import { ClassDef, Element, Item, ItemKind, ModKey, Mods, Rarity, WeaponBase } from './types';

type ItemBase = {
  id: string;
  kind: ItemKind;
  icon: string;
  w: number;
  h: number;
  /** Rolled once per item and grown with the item level. */
  implicit: Mods;
  element?: Element;
};

// Weapons carry most of a hero's damage, armor most of the life. Values are at item level 1;
// `levelScale` grows them, so gear from deeper stages keeps up with the enemies there.
const WEAPONS: Record<WeaponBase, ItemBase> = {
  sword: { id: 'sword', kind: 'weapon', icon: '⚔️', w: 1, h: 3, implicit: { damage: 4 } },
  axe: { id: 'axe', kind: 'weapon', icon: '🪓', w: 2, h: 3, implicit: { damage: 5.5 } },
  mace: { id: 'mace', kind: 'weapon', icon: '🔨', w: 1, h: 3, implicit: { damage: 4.5, armor: 1 } },
  bow: { id: 'bow', kind: 'weapon', icon: '🏹', w: 1, h: 3, implicit: { damage: 3.6 } },
  dagger: { id: 'dagger', kind: 'weapon', icon: '🔪', w: 1, h: 2, implicit: { damage: 3 } },
  staff: { id: 'staff', kind: 'weapon', icon: '🪄', w: 1, h: 3, implicit: { damage: 3.5 } },
  wand: { id: 'wand', kind: 'weapon', icon: '✨', w: 1, h: 2, implicit: { damage: 2.8 } },
  claws: { id: 'claws', kind: 'weapon', icon: '🐾', w: 2, h: 1, implicit: { damage: 3.2 } },
};

const ARMOR: ItemBase[] = [
  { id: 'shield', kind: 'offhand', icon: '🛡️', w: 2, h: 2, implicit: { armor: 6, maxHp: 8 } },
  { id: 'tome', kind: 'offhand', icon: '📕', w: 1, h: 2, implicit: { maxHp: 5 } },
  { id: 'quiver', kind: 'offhand', icon: '🎯', w: 1, h: 2, implicit: { damage: 1 } },
  { id: 'helm', kind: 'head', icon: '⛑️', w: 2, h: 2, implicit: { armor: 3, maxHp: 10 } },
  { id: 'hood', kind: 'head', icon: '🎭', w: 2, h: 1, implicit: { maxHp: 8 } },
  { id: 'plate', kind: 'chest', icon: '🦺', w: 2, h: 3, implicit: { armor: 8, maxHp: 20 } },
  { id: 'robe', kind: 'chest', icon: '👘', w: 2, h: 2, implicit: { armor: 2, maxHp: 16 } },
  { id: 'gloves', kind: 'hands', icon: '🧤', w: 1, h: 2, implicit: { armor: 2, maxHp: 5 } },
  { id: 'boots', kind: 'feet', icon: '🥾', w: 2, h: 2, implicit: { armor: 2, maxHp: 6 } },
  { id: 'ring', kind: 'ring', icon: '💍', w: 1, h: 1, implicit: {} },
  { id: 'amulet', kind: 'amulet', icon: '📿', w: 1, h: 1, implicit: { maxHp: 4 } },
];

const CHARMS: ItemBase[] = [
  {
    id: 'ember_rune',
    kind: 'charm',
    icon: '🔥',
    w: 1,
    h: 1,
    element: 'fire',
    implicit: { damage: 1.2 },
  },
  {
    id: 'frost_shard',
    kind: 'charm',
    icon: '❄️',
    w: 1,
    h: 2,
    element: 'frost',
    implicit: { armor: 3 },
  },
  {
    id: 'living_seed',
    kind: 'charm',
    icon: '🌱',
    w: 1,
    h: 1,
    element: 'nature',
    implicit: { regen: 0.6 },
  },
  {
    id: 'void_sigil',
    kind: 'charm',
    icon: '🌑',
    w: 2,
    h: 1,
    element: 'shadow',
    implicit: { damage: 1.5 },
  },
  {
    id: 'saint_relic',
    kind: 'charm',
    icon: '🕯️',
    w: 1,
    h: 1,
    element: 'holy',
    implicit: { maxHp: 8 },
  },
];

export const ITEM_BASES: ItemBase[] = [...Object.values(WEAPONS), ...ARMOR, ...CHARMS];
const BASE_BY_ID = new Map(ITEM_BASES.map((b) => [b.id, b]));
export const getItemBase = (id: string): ItemBase | undefined => BASE_BY_ID.get(id);

type Affix = {
  key: ModKey;
  min: number;
  max: number;
  /** Grows with item level (flat stats). Percent stats stay put, or they would explode. */
  scales: boolean;
  kinds?: ItemKind[];
};

const AFFIXES: Affix[] = [
  {
    key: 'damage',
    min: 1,
    max: 3,
    scales: true,
    kinds: ['weapon', 'ring', 'amulet', 'hands', 'charm'],
  },
  { key: 'maxHp', min: 6, max: 14, scales: true },
  {
    key: 'armor',
    min: 2,
    max: 5,
    scales: true,
    kinds: ['offhand', 'head', 'chest', 'hands', 'feet'],
  },
  { key: 'str', min: 1, max: 3, scales: true },
  { key: 'agi', min: 1, max: 3, scales: true },
  { key: 'int', min: 1, max: 3, scales: true },
  { key: 'vit', min: 1, max: 3, scales: true },
  { key: 'regen', min: 0.3, max: 1, scales: true },
  { key: 'damagePct', min: 0.03, max: 0.1, scales: false },
  { key: 'maxHpPct', min: 0.03, max: 0.1, scales: false },
  {
    key: 'attackSpeedPct',
    min: 0.02,
    max: 0.08,
    scales: false,
    kinds: ['weapon', 'hands', 'ring', 'charm'],
  },
  { key: 'critChance', min: 0.01, max: 0.04, scales: false },
  {
    key: 'critDamage',
    min: 0.05,
    max: 0.25,
    scales: false,
    kinds: ['weapon', 'ring', 'amulet', 'charm'],
  },
  { key: 'dodge', min: 0.01, max: 0.03, scales: false, kinds: ['feet', 'chest', 'charm'] },
  { key: 'lifesteal', min: 0.01, max: 0.03, scales: false, kinds: ['weapon', 'ring', 'amulet'] },
  { key: 'skillPower', min: 0.03, max: 0.12, scales: false },
  {
    key: 'cooldownReduction',
    min: 0.02,
    max: 0.05,
    scales: false,
    kinds: ['head', 'amulet', 'offhand'],
  },
  {
    key: 'goldFind',
    min: 0.05,
    max: 0.2,
    scales: false,
    kinds: ['ring', 'amulet', 'charm', 'hands'],
  },
  { key: 'xpGain', min: 0.05, max: 0.15, scales: false, kinds: ['head', 'amulet', 'charm'] },
];

export const RARITY_INFO: Record<Rarity, { affixes: number; roll: number; value: number }> = {
  common: { affixes: 0, roll: 1, value: 1 },
  uncommon: { affixes: 1, roll: 1.1, value: 2 },
  rare: { affixes: 2, roll: 1.2, value: 5 },
  epic: { affixes: 3, roll: 1.35, value: 12 },
  legendary: { affixes: 4, roll: 1.6, value: 30 },
};

const DROP_WEIGHTS: readonly (readonly [Rarity, number])[] = [
  ['common', 60],
  ['uncommon', 28],
  ['rare', 9],
  ['epic', 2.5],
  ['legendary', 0.5],
];
const BOSS_WEIGHTS: readonly (readonly [Rarity, number])[] = [
  ['common', 15],
  ['uncommon', 40],
  ['rare', 30],
  ['epic', 12],
  ['legendary', 3],
];

/** How much stronger a flat stat is at an item level. Enemies grow a little faster. */
export const levelScale = (level: number): number => 1.065 ** (level - 1) + (level - 1) * 0.15;

export type DropOptions = {
  level: number;
  boss?: boolean;
  rarity?: Rarity;
  kind?: ItemKind;
};

const pickBase = (rng: Rng, cls: ClassDef, kind?: ItemKind): ItemBase => {
  if (kind === 'weapon') return WEAPONS[pick(rng, cls.weapons)];
  if (kind)
    return pick(
      rng,
      ITEM_BASES.filter((b) => b.kind === kind)
    );
  const roll = rng.next();
  // Weapons favor the class, so a mage mostly finds staves and wands.
  if (roll < 0.2) {
    return chance(rng, 0.8) ? WEAPONS[pick(rng, cls.weapons)] : pick(rng, Object.values(WEAPONS));
  }
  if (roll < 0.35) return pick(rng, CHARMS);
  return pick(rng, ARMOR);
};

const round = (key: ModKey, value: number): number =>
  ['str', 'agi', 'int', 'vit', 'maxHp', 'armor'].includes(key)
    ? Math.max(1, Math.round(value))
    : Math.round(value * 1000) / 1000;

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

  const pool = AFFIXES.filter((a) => !a.kinds || a.kinds.includes(base.kind));
  for (let i = 0; i < info.affixes && pool.length > 0; i += 1) {
    const idx = Math.floor(rng.next() * pool.length);
    const affix = pool.splice(idx, 1)[0];
    const v = rollRange(rng, affix.min, affix.max) * info.roll * (affix.scales ? scale : 1);
    mods[affix.key] = round(affix.key, (mods[affix.key] ?? 0) + v);
  }

  return {
    id,
    baseId: base.id,
    kind: base.kind,
    rarity,
    level,
    icon: base.icon,
    w: base.w,
    h: base.h,
    mods,
    element: base.element,
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
    w: base.w,
    h: base.h,
    mods: { ...base.implicit },
    value: 1,
  };
};
