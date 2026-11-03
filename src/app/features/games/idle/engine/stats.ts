import { ATTRIBUTES, Attributes, ClassDef, ModKey, Mods, Stats } from './types';

export const sumMods = (list: Mods[]): Mods => {
  const out: Mods = {};
  list.forEach((mods) => {
    (Object.keys(mods) as ModKey[]).forEach((key) => {
      out[key] = (out[key] ?? 0) + (mods[key] ?? 0);
    });
  });
  return out;
};

export const scaleMods = (mods: Mods, factor: number): Mods => {
  const out: Mods = {};
  (Object.keys(mods) as ModKey[]).forEach((key) => {
    out[key] = (mods[key] ?? 0) * factor;
  });
  return out;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const attributesAt = (cls: ClassDef, level: number, mods: Mods): Attributes => {
  const out = {} as Attributes;
  ATTRIBUTES.forEach((a) => {
    out[a] = Math.floor(cls.base[a] + cls.growth[a] * (level - 1) + (mods[a] ?? 0));
  });
  return out;
};

export type StatInput = {
  cls: ClassDef;
  level: number;
  /** Everything else: gear, talents, upgrades, the spec. The class passive is added here. */
  mods: Mods[];
  /** Multipliers that stack apart from the rest (the altar), so they stay worth buying. */
  more?: { damage?: number; maxHp?: number };
};

// The one place attributes turn into combat numbers. Heroes, PvP snapshots and arena rivals all
// come through here, so they can't drift apart.
export const computeStats = ({ cls, level, mods, more }: StatInput): Stats => {
  const m = sumMods([cls.passive, ...mods]);
  const attrs = attributesAt(cls, level, m);
  const main = attrs[cls.mainStat];
  const get = (key: ModKey) => m[key] ?? 0;
  const maxHp = Math.round(
    (60 + attrs.vit * 10 + level * 6 + get('maxHp')) * (1 + get('maxHpPct')) * (more?.maxHp ?? 1)
  );

  return {
    maxHp,
    damage:
      (4 + level * 1.2 + get('damage')) *
      (1 + main * 0.02 + get('damagePct')) *
      (more?.damage ?? 1),
    attackSpeed: clamp(
      (cls.attackSpeed + get('attackSpeed')) * (1 + attrs.agi * 0.002 + get('attackSpeedPct')),
      0.2,
      5
    ),
    critChance: clamp(cls.critChance + attrs.agi * 0.0008 + get('critChance'), 0, 0.75),
    critDamage: 1.5 + get('critDamage'),
    armor: (attrs.str * 0.6 + get('armor')) * (1 + get('armorPct')),
    dodge: clamp(cls.dodge + attrs.agi * 0.0006 + get('dodge'), 0, 0.6),
    lifesteal: clamp(get('lifesteal'), 0, 0.5),
    regen: attrs.vit * 0.08 + get('regen') + maxHp * clamp(get('regenPct'), 0, 0.05),
    skillPower: 1 + attrs.int * 0.012 + get('skillPower'),
    cooldownReduction: clamp(get('cooldownReduction'), 0, 0.5),
    thorns: clamp(get('thorns'), 0, 1),
    execute: Math.max(0, get('execute')),
    rage: Math.max(0, get('rage')),
    petPower: Math.max(0, get('petPower')),
  };
};

// One number to compare builds and pick arena rivals: roughly damage per second times how long
// you stay up. Only for display and matchmaking, never for who wins.
export const powerOf = (s: Stats): number => {
  const special = 1 + s.execute * 0.15 + s.rage * 0.25 + s.petPower;
  const dps = s.damage * s.attackSpeed * (1 + s.critChance * (s.critDamage - 1)) * special;
  const toughness =
    ((s.maxHp * (1 + s.armor / 200)) / (1 - s.dodge) + s.regen * 10) * (1 + s.thorns * 0.5);
  return Math.round(Math.sqrt(dps * toughness) * (1 + s.lifesteal) * (0.75 + s.skillPower / 4));
};
