// Everything here is plain data, so a game can be saved as JSON today and sent to a server
// later. Nothing in the engine reads the clock or Math.random: time comes in as `dtMs` and
// randomness from the seeded Rng whose state is part of the save.

export type Attribute = 'str' | 'agi' | 'int' | 'vit';
export type Attributes = Record<Attribute, number>;
export const ATTRIBUTES: Attribute[] = ['str', 'agi', 'int', 'vit'];

export type Stats = {
  maxHp: number;
  /** Average hit before armor. */
  damage: number;
  /** Attacks per second. */
  attackSpeed: number;
  /** 0..1 */
  critChance: number;
  /** Multiplier on a critical hit: 1.5 is +50%. */
  critDamage: number;
  armor: number;
  /** 0..1, chance to avoid a basic attack. Skills always land. */
  dodge: number;
  /** 0..1 of the damage dealt that comes back as life. */
  lifesteal: number;
  /** Life per second. */
  regen: number;
  /** Multiplier on what skills do. */
  skillPower: number;
  /** 0..0.5 */
  cooldownReduction: number;
};
export type StatKey = keyof Stats;

// A sparse bag of bonuses. Items, passives, upgrades and buffs all speak this one language, so
// adding a new kind of bonus is one key here and one line in computeStats.
export type ModKey =
  | Attribute
  | StatKey
  | 'damagePct'
  | 'maxHpPct'
  | 'attackSpeedPct'
  | 'goldFind'
  | 'xpGain';
export type Mods = Partial<Record<ModKey, number>>;

export type Role = 'tank' | 'melee' | 'ranged' | 'caster' | 'support';

export type SkillEffect =
  | { kind: 'strike'; multiplier: number; hits?: number }
  | { kind: 'heal'; pctMaxHp: number }
  | { kind: 'shield'; pctMaxHp: number; durationMs: number }
  | { kind: 'dot'; multiplier: number; durationMs: number }
  | { kind: 'buff'; mods: Mods; durationMs: number }
  | { kind: 'stun'; durationMs: number }
  | { kind: 'drain'; multiplier: number; healPct: number };

export type SkillDef = {
  id: string;
  cooldownMs: number;
  effects: SkillEffect[];
};

export type ClassId =
  | 'guardian'
  | 'berserker'
  | 'paladin'
  | 'ranger'
  | 'assassin'
  | 'mage'
  | 'necromancer'
  | 'druid'
  | 'shaman'
  | 'monk';

export type WeaponBase = 'sword' | 'axe' | 'mace' | 'bow' | 'dagger' | 'staff' | 'wand' | 'claws';

export type ClassDef = {
  id: ClassId;
  role: Role;
  icon: string;
  color: string;
  mainStat: 'str' | 'agi' | 'int';
  base: Attributes;
  /** Added to `base` on every level after the first. */
  growth: Attributes;
  attackSpeed: number;
  critChance: number;
  dodge: number;
  passive: Mods;
  skill: SkillDef;
  /** Weapons this class finds more often. */
  weapons: WeaponBase[];
};

export type Slot = 'weapon' | 'offhand' | 'head' | 'chest' | 'hands' | 'feet' | 'ring' | 'amulet';
export const SLOTS: Slot[] = [
  'weapon',
  'offhand',
  'head',
  'chest',
  'hands',
  'feet',
  'ring',
  'amulet',
];

/** Charms only work while they sit in the backpack, and grow next to charms of their element. */
export type ItemKind = Slot | 'charm';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export type Element = 'fire' | 'frost' | 'nature' | 'shadow' | 'holy';

export type Item = {
  id: string;
  baseId: string;
  kind: ItemKind;
  rarity: Rarity;
  level: number;
  icon: string;
  /** Footprint in the backpack before rotation. */
  w: number;
  h: number;
  mods: Mods;
  element?: Element;
  /** Gold when sold. */
  value: number;
};

export type PlacedItem = {
  item: Item;
  x: number;
  y: number;
  rotated: boolean;
};

export type Backpack = {
  cols: number;
  rows: number;
  items: PlacedItem[];
};

export type Equipment = Partial<Record<Slot, Item>>;

export type Hero = {
  name: string;
  classId: ClassId;
  level: number;
  xp: number;
  /** Points the player put in by hand, on top of the class's growth. */
  allocated: Attributes;
  freePoints: number;
};

export type Buff = { mods: Mods; ms: number };
export type Dot = { dps: number; ms: number };

export type Fighter = {
  name: string;
  icon: string;
  level: number;
  stats: Stats;
  skill?: SkillDef;
  hp: number;
  shield: number;
  shieldMs: number;
  /** Time until the next basic attack. */
  attackMs: number;
  /** Time until the skill is ready. */
  skillMs: number;
  stunMs: number;
  buffs: Buff[];
  dots: Dot[];
};

export type Battle = {
  hero: Fighter;
  foe: Fighter;
  elapsedMs: number;
  boss: boolean;
  /** A boss not beaten in time counts as a loss. */
  timeLimitMs?: number;
};

export type Side = 'hero' | 'foe';

export type CombatEvent =
  | { t: 'hit'; from: Side; amount: number; crit: boolean }
  | { t: 'dodge'; from: Side }
  | { t: 'skill'; from: Side; skillId: string; amount: number }
  | { t: 'heal'; from: Side; amount: number };

export type GameEvent =
  | CombatEvent
  | { t: 'fight'; foe: string; boss: boolean }
  | { t: 'kill'; foe: string; gold: number; xp: number }
  | { t: 'death' }
  | { t: 'timeout' }
  | { t: 'level'; level: number }
  | { t: 'stage'; stage: number }
  | { t: 'loot'; item: Item }
  | { t: 'sold'; item: Item };

export type UpgradeId = 'might' | 'vigor' | 'swiftness' | 'fortune' | 'wisdom' | 'satchel';

export type ArenaRecord = {
  rating: number;
  wins: number;
  losses: number;
};

export type Lifetime = {
  kills: number;
  deaths: number;
  goldEarned: number;
  itemsFound: number;
  playMs: number;
};

export const SAVE_VERSION = 1;

export type GameState = {
  version: typeof SAVE_VERSION;
  rngState: number;
  hero: Hero;
  gold: number;
  equipment: Equipment;
  backpack: Backpack;
  stage: number;
  maxStage: number;
  /** Kills in the current stage. */
  kills: number;
  /** Move to the next stage after enough kills. Turns off on a death. */
  autoAdvance: boolean;
  upgrades: Partial<Record<UpgradeId, number>>;
  battle: Battle | null;
  /** More than 0 while the hero waits to get back up. */
  respawnMs: number;
  arena: ArenaRecord;
  lifetime: Lifetime;
  nextItemId: number;
  /** Epoch ms of the last advance, for the time away. */
  lastSeen: number;
};
