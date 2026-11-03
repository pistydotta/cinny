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

export const attributesAt = (
  cls: ClassDef,
  level: number,
  allocated: Attributes,
  mods: Mods
): Attributes => {
  const out = {} as Attributes;
  ATTRIBUTES.forEach((a) => {
    out[a] = Math.floor(cls.base[a] + cls.growth[a] * (level - 1) + allocated[a] + (mods[a] ?? 0));
  });
  return out;
};

export type StatInput = {
  cls: ClassDef;
  level: number;
  allocated: Attributes;
  /** Everything else: gear, charms, upgrades. The class passive is added here. */
  mods: Mods[];
};

// The one place attributes turn into combat numbers. Heroes, PvP snapshots and arena rivals all
// come through here, so they can't drift apart.
export const computeStats = ({ cls, level, allocated, mods }: StatInput): Stats => {
  const m = sumMods([cls.passive, ...mods]);
  const attrs = attributesAt(cls, level, allocated, m);
  const main = attrs[cls.mainStat];
  const get = (key: ModKey) => m[key] ?? 0;

  return {
    maxHp: Math.round((60 + attrs.vit * 10 + level * 6 + get('maxHp')) * (1 + get('maxHpPct'))),
    damage: (4 + level * 1.2 + get('damage')) * (1 + main * 0.02 + get('damagePct')),
    attackSpeed: clamp(
      (cls.attackSpeed + get('attackSpeed')) * (1 + attrs.agi * 0.002 + get('attackSpeedPct')),
      0.2,
      5
    ),
    critChance: clamp(cls.critChance + attrs.agi * 0.0008 + get('critChance'), 0, 0.75),
    critDamage: 1.5 + get('critDamage'),
    armor: attrs.str * 0.6 + get('armor'),
    dodge: clamp(cls.dodge + attrs.agi * 0.0006 + get('dodge'), 0, 0.6),
    lifesteal: clamp(get('lifesteal'), 0, 0.5),
    regen: attrs.vit * 0.08 + get('regen'),
    skillPower: 1 + attrs.int * 0.012 + get('skillPower'),
    cooldownReduction: clamp(get('cooldownReduction'), 0, 0.5),
  };
};

// One number to compare builds and pick arena rivals: roughly damage per second times how long
// you stay up. Only for display and matchmaking, never for who wins.
export const powerOf = (s: Stats): number => {
  const dps = s.damage * s.attackSpeed * (1 + s.critChance * (s.critDamage - 1));
  const toughness = (s.maxHp * (1 + s.armor / 200)) / (1 - s.dodge) + s.regen * 10;
  return Math.round(Math.sqrt(dps * toughness) * (1 + s.lifesteal) * (0.75 + s.skillPower / 4));
};
