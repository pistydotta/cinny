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
  /** 0..1 of the damage a basic hit does to you that goes back to the attacker. */
  thorns: number;
  /** Extra damage against a foe under 30% life: 0.5 is +50%. */
  execute: number;
  /** Extra damage the lower your own life: at 0 life it would be +rage. */
  rage: number;
  /** A companion that hits once a second for this much of your damage. 0 is none. */
  petPower: number;
};
export type StatKey = keyof Stats;

// A sparse bag of bonuses. Items, talents, upgrades and buffs all speak this one language, so
// adding a new kind of bonus is one key here and one line in computeStats.
export type ModKey =
  | Attribute
  | StatKey
  | 'damagePct'
  | 'maxHpPct'
  | 'attackSpeedPct'
  | 'armorPct'
  /** Life per second as a share of max life. */
  | 'regenPct'
  | 'goldFind'
  | 'xpGain'
  /** More items from kills. */
  | 'dropRate'
  /** Flat chance added to forge upgrades up to +10. */
  | 'forgeChance'
  /** More stones from salvage. */
  | 'salvageYield';
export type Mods = Partial<Record<ModKey, number>>;

export type Role = 'tank' | 'melee' | 'ranged' | 'caster' | 'support';

export type SkillEffect =
  | { kind: 'strike'; multiplier: number; hits?: number; alwaysCrit?: boolean }
  | { kind: 'heal'; pctMaxHp: number }
  | { kind: 'shield'; pctMaxHp: number; durationMs: number }
  | { kind: 'dot'; multiplier: number; durationMs: number }
  | { kind: 'buff'; mods: Mods; durationMs: number }
  /** A debuff on the other side: mods are usually negative. */
  | { kind: 'curse'; mods: Mods; durationMs: number }
  | { kind: 'stun'; durationMs: number }
  | { kind: 'drain'; multiplier: number; healPct: number };

export type SkillDef = {
  id: string;
  cooldownMs: number;
  effects: SkillEffect[];
};

export type BaseClassId = 'warrior' | 'archer' | 'rogue' | 'mage' | 'cleric' | 'occultist';
export type SpecId =
  | 'guardian'
  | 'berserker'
  | 'sniper'
  | 'beastmaster'
  | 'assassin'
  | 'venomblade'
  | 'pyromancer'
  | 'cryomancer'
  | 'paladin'
  | 'druid'
  | 'necromancer'
  | 'hexer';
export type ClassId = BaseClassId;

export type WeaponBase = 'sword' | 'axe' | 'mace' | 'bow' | 'dagger' | 'staff' | 'wand' | 'claws';

export type SpecDef = {
  id: SpecId;
  role: Role;
  icon: string;
  color: string;
  passive: Mods;
  /** A second skill, on top of the class's. */
  skill: SkillDef;
};

export type ClassDef = {
  id: BaseClassId;
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
  /** The two ways to grow at SPEC_LEVEL. */
  specs: [SpecDef, SpecDef];
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

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

export type Item = {
  id: string;
  baseId: string;
  kind: Slot;
  rarity: Rarity;
  level: number;
  icon: string;
  /** What the item gives at +0. The forge multiplies it (see itemMods). */
  mods: Mods;
  /** The affix that names the item ("of Ruin"), if it rolled any. */
  title?: ModKey;
  /** Forge level, 0..12. */
  plus: number;
  /** Failed forge tries since the last success; each one makes the next more likely. */
  fails: number;
  /** Kept out of bulk selling and salvage. */
  locked?: boolean;
  /** Found and not looked at yet. */
  isNew?: boolean;
  /** Gold when sold. */
  value: number;
};

export type Equipment = Partial<Record<Slot, Item>>;

export type Hero = {
  name: string;
  classId: ClassId;
  /** Picked once at SPEC_LEVEL and kept through rebirths. */
  specId?: SpecId;
  level: number;
  xp: number;
  /** Ranks bought in each talent. */
  talents: Record<string, number>;
};

export type Buff = { mods: Mods; ms: number };
export type Dot = { dps: number; ms: number };

export type FighterSkill = { def: SkillDef; ms: number };

export type Fighter = {
  name: string;
  icon: string;
  level: number;
  stats: Stats;
  skills: FighterSkill[];
  hp: number;
  shield: number;
  shieldMs: number;
  /** Time until the next basic attack. */
  attackMs: number;
  /** Time until the companion's next hit. */
  petMs: number;
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
  | { t: 'pet'; from: Side; amount: number }
  | { t: 'thorns'; from: Side; amount: number }
  | { t: 'heal'; from: Side; amount: number };

export type Materials = {
  /** Ember stones: every forge step. */
  stones: number;
  /** Fire cores: forge steps from +8 up. */
  cores: number;
};

export type LootFate = 'kept' | 'salvaged' | 'sold';

export type LootEntry = {
  item: Item;
  /** lifetime.playMs when it dropped. */
  at: number;
  fate: LootFate;
  /** Better than what was equipped when it dropped. */
  better: boolean;
};

export type GameEvent =
  | CombatEvent
  | { t: 'fight'; foe: string; boss: boolean }
  | { t: 'kill'; foe: string; gold: number; xp: number; boss: boolean }
  | { t: 'death' }
  | { t: 'timeout' }
  | { t: 'level'; level: number }
  | { t: 'stage'; stage: number }
  | { t: 'loot'; entry: LootEntry }
  | { t: 'materials'; stones: number; cores: number };

export type UpgradeId = 'might' | 'vigor' | 'swiftness' | 'fortune' | 'wisdom' | 'satchel';

export type AltarId =
  | 'ember_might'
  | 'ember_vigor'
  | 'ember_greed'
  | 'ember_wisdom'
  | 'ember_forge'
  | 'talent_well'
  | 'head_start'
  | 'long_rest';

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
  bossKills: number;
  /** Highest stage ever, across rebirths. */
  bestStage: number;
  bestPlus: number;
};

export type Prestige = {
  rebirths: number;
  /** Eternal ashes to spend at the altar. */
  ashes: number;
  ashesEarned: number;
  altar: Partial<Record<AltarId, number>>;
};

export type Settings = {
  /** Drops at or below this rarity are salvaged on the spot, unless they're an upgrade. */
  autoSalvage: Rarity | null;
};

export const SAVE_VERSION = 2;

export type GameState = {
  version: typeof SAVE_VERSION;
  rngState: number;
  hero: Hero;
  gold: number;
  equipment: Equipment;
  inventory: Item[];
  materials: Materials;
  stage: number;
  /** Best stage in this run (since the last rebirth). */
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
  prestige: Prestige;
  settings: Settings;
  /** The newest drops, newest last. */
  loot: LootEntry[];
  nextItemId: number;
  /** Epoch ms of the last advance, for the time away. */
  lastSeen: number;
};
