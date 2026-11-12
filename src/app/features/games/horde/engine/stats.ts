import { CharacterId, MetaBonuses, MetaUpgradeId, PassiveId } from './types';

// Every number that describes the hero lives here, as one of these stats, and every weapon and
// system reads it from the run's `Stats`. Nothing else in the engine keeps a bonus of its own.
//
// How a stat is added up, the same for all of them:
//   value = (base + flat) * (1 + pct) * mult
// `flat` and `pct` are sums: bonuses of the same kind add up (two Boletos of +15% damage are +30%).
// `mult` is a product: hero traits, permanent upgrades and temporary effects multiply on top.
// Then the stat's cap applies. Chances never reach 100%: armor and evasion turn their points into
// a share with diminishing returns (see `armorShare`, `evasionChance`, `luckShare`), and the
// other chances have a cap below 1.

export type StatGroup = 'defense' | 'attack' | 'weapons' | 'movement' | 'economy';

export type StatId =
  // Defense
  | 'maxHp'
  | 'regen'
  | 'overheal'
  | 'shield'
  | 'armor'
  | 'evasion'
  | 'lifesteal'
  | 'thorns'
  // Attack
  | 'damage'
  | 'critChance'
  | 'critDamage'
  | 'attackSpeed'
  | 'projectiles'
  | 'ricochet'
  // Weapons
  | 'size'
  | 'projectileSpeed'
  | 'duration'
  | 'eliteDamage'
  | 'knockback'
  | 'moveSpeed'
  // Movement and luck
  | 'extraJumps'
  | 'jumpHeight'
  | 'luck'
  | 'difficulty'
  // Economy
  | 'pickupRange'
  | 'xpGain'
  | 'goldGain'
  | 'eliteRate'
  | 'powerupPower'
  | 'powerupChance';

// `unit` says how the value reads: a plain number, a share shown in % (0.25 is 25%), a
// multiplier shown as a % over 1 (1.25 is +25%), or points.
export type StatUnit = 'number' | 'share' | 'multiplier' | 'points' | 'perMinute';

export type StatDef = {
  group: StatGroup;
  base: number;
  unit: StatUnit;
  max?: number;
  // Whole numbers only (projectiles, bounces, jumps).
  whole?: boolean;
};

export const STATS: Record<StatId, StatDef> = {
  maxHp: { group: 'defense', base: 100, unit: 'number', whole: true },
  // Health back per minute.
  regen: { group: 'defense', base: 0, unit: 'perMinute', max: 240 },
  // How far over max health healing can go, as a share of max health.
  overheal: { group: 'defense', base: 0, unit: 'share', max: 1 },
  shield: { group: 'defense', base: 0, unit: 'number', max: 400 },
  armor: { group: 'defense', base: 0, unit: 'points', max: 400 },
  evasion: { group: 'defense', base: 0, unit: 'points', max: 400 },
  // Chance per hit to heal 1.
  lifesteal: { group: 'defense', base: 0, unit: 'share', max: 0.2 },
  // Damage back to whatever touches the hero.
  thorns: { group: 'defense', base: 0, unit: 'number', max: 2000 },

  damage: { group: 'attack', base: 1, unit: 'multiplier' },
  critChance: { group: 'attack', base: 0.1, unit: 'share', max: 0.9 },
  critDamage: { group: 'attack', base: 2, unit: 'multiplier', max: 10 },
  // Fires this much more often: 0.5 is half again as often.
  attackSpeed: { group: 'attack', base: 0, unit: 'share', max: 3 },
  projectiles: { group: 'attack', base: 0, unit: 'number', max: 6, whole: true },
  ricochet: { group: 'attack', base: 0, unit: 'number', max: 6, whole: true },

  size: { group: 'weapons', base: 1, unit: 'multiplier', max: 4 },
  projectileSpeed: { group: 'weapons', base: 1, unit: 'multiplier', max: 3 },
  duration: { group: 'weapons', base: 1, unit: 'multiplier', max: 3 },
  eliteDamage: { group: 'weapons', base: 1, unit: 'multiplier' },
  knockback: { group: 'weapons', base: 1, unit: 'multiplier', max: 4 },
  moveSpeed: { group: 'weapons', base: 7, unit: 'number', max: 20 },

  extraJumps: { group: 'movement', base: 0, unit: 'number', max: 3, whole: true },
  jumpHeight: { group: 'movement', base: 1, unit: 'multiplier', max: 2 },
  luck: { group: 'movement', base: 0, unit: 'points', max: 400 },
  // Tougher and more enemies for more experience and gold. 0.3 is 30% more.
  difficulty: { group: 'movement', base: 0, unit: 'share', max: 3 },

  pickupRange: { group: 'economy', base: 3, unit: 'number', max: 30 },
  xpGain: { group: 'economy', base: 1, unit: 'multiplier' },
  goldGain: { group: 'economy', base: 1, unit: 'multiplier' },
  eliteRate: { group: 'economy', base: 1, unit: 'multiplier', max: 4 },
  powerupPower: { group: 'economy', base: 1, unit: 'multiplier', max: 4 },
  powerupChance: { group: 'economy', base: 1, unit: 'multiplier', max: 6 },
};

export const STAT_IDS = Object.keys(STATS) as StatId[];

export type Stats = Record<StatId, number>;

// One bonus: how much it adds to a stat, and in which of the three ways.
export type Bonus = { stat: StatId; flat?: number; pct?: number; mult?: number };

// --- Boletos -------------------------------------------------------------------------------
// The run's passives, called Boletos in the game. Each one raises one stat per level. A run holds
// four; shrine blessings give a level of one without taking a slot.

export type BoletoDef = Bonus & { max: number };

export const BOLETOS: Record<PassiveId, BoletoDef> = {
  might: { stat: 'damage', pct: 0.15, max: 5 },
  haste: { stat: 'attackSpeed', flat: 0.12, max: 5 },
  reach: { stat: 'size', pct: 0.12, max: 5 },
  swift: { stat: 'moveSpeed', pct: 0.08, max: 5 },
  vigor: { stat: 'maxHp', flat: 20, max: 5 },
  magnet: { stat: 'pickupRange', pct: 0.35, max: 5 },
  multi: { stat: 'projectiles', flat: 1, max: 2 },
  regen: { stat: 'regen', flat: 15, max: 5 },
  overheal: { stat: 'overheal', flat: 0.15, max: 5 },
  shield: { stat: 'shield', flat: 15, max: 5 },
  armor: { stat: 'armor', flat: 12, max: 5 },
  evasion: { stat: 'evasion', flat: 12, max: 5 },
  lifesteal: { stat: 'lifesteal', flat: 0.02, max: 5 },
  thorns: { stat: 'thorns', flat: 10, max: 5 },
  crit: { stat: 'critChance', flat: 0.06, max: 5 },
  critdmg: { stat: 'critDamage', flat: 0.3, max: 5 },
  ricochet: { stat: 'ricochet', flat: 1, max: 3 },
  velocity: { stat: 'projectileSpeed', pct: 0.12, max: 5 },
  duration: { stat: 'duration', pct: 0.12, max: 5 },
  hunter: { stat: 'eliteDamage', pct: 0.15, max: 5 },
  knockback: { stat: 'knockback', pct: 0.25, max: 5 },
  extrajump: { stat: 'extraJumps', flat: 1, max: 2 },
  jump: { stat: 'jumpHeight', pct: 0.08, max: 5 },
  luck: { stat: 'luck', flat: 12, max: 5 },
  curse: { stat: 'difficulty', flat: 0.15, max: 5 },
  xp: { stat: 'xpGain', pct: 0.1, max: 5 },
  gold: { stat: 'goldGain', pct: 0.15, max: 5 },
  elites: { stat: 'eliteRate', pct: 0.2, max: 5 },
  power: { stat: 'powerupPower', pct: 0.2, max: 5 },
  fortune: { stat: 'powerupChance', pct: 0.3, max: 5 },
};

export const BOLETO_IDS = Object.keys(BOLETOS) as PassiveId[];

// --- Heroes --------------------------------------------------------------------------------
// Each hero starts with its health and speed and two or three stats off the usual.

export const HERO_TRAITS: Record<CharacterId, Bonus[]> = {
  eneas: [
    { stat: 'critChance', flat: 0.05 },
    { stat: 'size', pct: 0.1 },
  ],
  lula: [
    { stat: 'damage', mult: 1.12 },
    { stat: 'goldGain', pct: 0.15 },
  ],
  janja: [
    { stat: 'armor', flat: 10 },
    { stat: 'regen', flat: 12 },
  ],
  bolsonaro: [
    { stat: 'evasion', flat: 15 },
    { stat: 'jumpHeight', pct: 0.1 },
  ],
};

// --- Permanent upgrades --------------------------------------------------------------------
// What each level of an upgrade bought with gold gives. Rerolls, banishes and skips are counts
// for the run, not stats.

export const META_EFFECTS: Record<Exclude<MetaUpgradeId, 'reroll' | 'banish' | 'skip'>, Bonus> = {
  vigor: { stat: 'maxHp', flat: 10 },
  might: { stat: 'damage', mult: 0.05 },
  swift: { stat: 'moveSpeed', mult: 0.03 },
  wisdom: { stat: 'xpGain', mult: 0.05 },
  greed: { stat: 'goldGain', mult: 0.1 },
  regen: { stat: 'regen', flat: 6 },
  armor: { stat: 'armor', flat: 5 },
  crit: { stat: 'critChance', flat: 0.02 },
  hunter: { stat: 'eliteDamage', mult: 0.06 },
  luck: { stat: 'luck', flat: 5 },
};

// --- Adding up -----------------------------------------------------------------------------

export type StatSources = {
  character: CharacterId;
  hp: number;
  speed: number;
  meta: MetaBonuses;
  passives: { id: PassiveId; level: number }[];
  // Levels of Boletos given by shrines and chests, outside the four slots.
  blessings: Partial<Record<PassiveId, number>>;
  // Temporary effects (powerups), already as bonuses.
  temporary?: Bonus[];
};

type Sum = { flat: number; pct: number; mult: number };

export const computeStats = (sources: StatSources): Stats => {
  const sums = {} as Record<StatId, Sum>;
  STAT_IDS.forEach((id) => {
    sums[id] = { flat: 0, pct: 0, mult: 1 };
  });
  const add = (bonus: Bonus, times = 1, levelMult = false) => {
    const sum = sums[bonus.stat];
    sum.flat += (bonus.flat ?? 0) * times;
    sum.pct += (bonus.pct ?? 0) * times;
    // A permanent upgrade's `mult` is per level: 5 levels of 0.05 multiply by 1.25.
    if (bonus.mult !== undefined) sum.mult *= levelMult ? 1 + bonus.mult * times : bonus.mult;
  };
  HERO_TRAITS[sources.character].forEach((bonus) => add(bonus));
  (Object.keys(META_EFFECTS) as (keyof typeof META_EFFECTS)[]).forEach((id) => {
    const level = sources.meta[id] ?? 0;
    if (level > 0) add(META_EFFECTS[id], level, true);
  });
  sources.passives.forEach((p) => add(BOLETOS[p.id], p.level));
  (Object.keys(sources.blessings) as PassiveId[]).forEach((id) =>
    add(BOLETOS[id], sources.blessings[id] ?? 0)
  );
  sources.temporary?.forEach((bonus) => add(bonus));

  const stats = {} as Stats;
  STAT_IDS.forEach((id) => {
    const def = STATS[id];
    let { base } = def;
    if (id === 'maxHp') base = sources.hp;
    if (id === 'moveSpeed') base = sources.speed;
    const sum = sums[id];
    let value = (base + sum.flat) * (1 + sum.pct) * sum.mult;
    if (def.max !== undefined) value = Math.min(def.max, value);
    if (def.whole) value = Math.floor(value + 1e-9);
    stats[id] = Math.max(0, value);
  });
  return stats;
};

// Share of damage armor takes away. 60 points take half; it never passes 75%.
export const armorShare = (armor: number): number => Math.min(0.75, armor / (armor + 60));

// Chance to dodge a hit. 100 points dodge half of them; it never passes 60%.
export const evasionChance = (evasion: number): number => Math.min(0.6, evasion / (evasion + 100));

// How much luck tilts the odds, from 0 to 0.6: 100 points are 0.5.
export const luckShare = (luck: number): number => Math.min(0.6, luck / (luck + 100));
