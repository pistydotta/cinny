import { ClassDef, ClassId, SkillDef, SpecDef, SpecId } from './types';

/** The level where a class picks one of its two specializations. */
export const SPEC_LEVEL = 30;

// The roster: six classes, each with two ways to specialize. A class is data only: the combat
// code knows nothing about any of them, so a new one is one more entry here plus its names in
// labels.ts and pt.json. Each one leans on a different mechanic (armor and thorns, rage,
// crits, a companion, execute, poison, burst, control, healing, drain, curses), so they play
// apart and not only with different numbers.
export const CLASSES: ClassDef[] = [
  {
    id: 'warrior',
    role: 'tank',
    icon: '⚔️',
    color: '#e0884f',
    mainStat: 'str',
    base: { str: 13, agi: 6, int: 3, vit: 14 },
    growth: { str: 2.6, agi: 0.8, int: 0.3, vit: 2.8 },
    attackSpeed: 1,
    critChance: 0.05,
    dodge: 0.02,
    passive: { armor: 8, maxHpPct: 0.08 },
    skill: { id: 'cleave', cooldownMs: 8000, effects: [{ kind: 'strike', multiplier: 1.8 }] },
    weapons: ['sword', 'axe', 'mace'],
    specs: [
      {
        id: 'guardian',
        role: 'tank',
        icon: '🛡️',
        color: '#7aa2d6',
        passive: { thorns: 0.2, armorPct: 0.25, maxHpPct: 0.15 },
        skill: {
          id: 'shield_wall',
          cooldownMs: 10000,
          effects: [
            { kind: 'shield', pctMaxHp: 0.3, durationMs: 6000 },
            { kind: 'stun', durationMs: 800 },
          ],
        },
      },
      {
        id: 'berserker',
        role: 'melee',
        icon: '🪓',
        color: '#e05a4f',
        passive: { rage: 0.8, lifesteal: 0.05, damagePct: 0.1 },
        skill: {
          id: 'blood_rage',
          cooldownMs: 12000,
          effects: [
            { kind: 'buff', mods: { attackSpeedPct: 0.5, damagePct: 0.3 }, durationMs: 6000 },
          ],
        },
      },
    ],
  },
  {
    id: 'archer',
    role: 'ranged',
    icon: '🏹',
    color: '#5cb85c',
    mainStat: 'agi',
    base: { str: 6, agi: 14, int: 5, vit: 9 },
    growth: { str: 0.8, agi: 2.9, int: 0.6, vit: 1.9 },
    attackSpeed: 1.25,
    critChance: 0.1,
    dodge: 0.05,
    passive: { critChance: 0.05 },
    skill: {
      id: 'volley',
      cooldownMs: 8000,
      effects: [{ kind: 'strike', multiplier: 0.6, hits: 4 }],
    },
    weapons: ['bow'],
    specs: [
      {
        id: 'sniper',
        role: 'ranged',
        icon: '🎯',
        color: '#9bd36b',
        passive: { critDamage: 0.6, critChance: 0.05 },
        skill: {
          id: 'deadeye',
          cooldownMs: 11000,
          effects: [{ kind: 'strike', multiplier: 3.2, alwaysCrit: true }],
        },
      },
      {
        id: 'beastmaster',
        role: 'ranged',
        icon: '🐺',
        color: '#c9a35b',
        passive: { petPower: 0.45, maxHpPct: 0.08 },
        skill: {
          id: 'pack_hunt',
          cooldownMs: 10000,
          effects: [
            { kind: 'strike', multiplier: 0.5, hits: 5 },
            { kind: 'curse', mods: { armor: -30 }, durationMs: 5000 },
          ],
        },
      },
    ],
  },
  {
    id: 'rogue',
    role: 'melee',
    icon: '🗡️',
    color: '#a66bd3',
    mainStat: 'agi',
    base: { str: 7, agi: 15, int: 4, vit: 8 },
    growth: { str: 1, agi: 3.1, int: 0.5, vit: 1.6 },
    attackSpeed: 1.45,
    critChance: 0.12,
    dodge: 0.08,
    passive: { critDamage: 0.2, dodge: 0.03 },
    skill: {
      id: 'shadowstep',
      cooldownMs: 9000,
      effects: [
        { kind: 'stun', durationMs: 800 },
        { kind: 'strike', multiplier: 1.5 },
      ],
    },
    weapons: ['dagger', 'claws'],
    specs: [
      {
        id: 'assassin',
        role: 'melee',
        icon: '🥷',
        color: '#8e5bd6',
        passive: { execute: 0.7, critDamage: 0.3 },
        skill: {
          id: 'eviscerate',
          cooldownMs: 9000,
          effects: [{ kind: 'strike', multiplier: 2.6 }],
        },
      },
      {
        id: 'venomblade',
        role: 'melee',
        icon: '🐍',
        color: '#6cc04a',
        passive: { dodge: 0.06, attackSpeedPct: 0.1 },
        skill: {
          id: 'toxic_blades',
          cooldownMs: 8000,
          effects: [
            { kind: 'dot', multiplier: 3, durationMs: 6000 },
            { kind: 'curse', mods: { damagePct: -0.15 }, durationMs: 6000 },
          ],
        },
      },
    ],
  },
  {
    id: 'mage',
    role: 'caster',
    icon: '🔮',
    color: '#3fa7f5',
    mainStat: 'int',
    base: { str: 4, agi: 6, int: 16, vit: 8 },
    growth: { str: 0.4, agi: 0.8, int: 3.3, vit: 1.6 },
    attackSpeed: 0.8,
    critChance: 0.06,
    dodge: 0.03,
    passive: { skillPower: 0.15 },
    skill: { id: 'fireball', cooldownMs: 6000, effects: [{ kind: 'strike', multiplier: 2.2 }] },
    weapons: ['staff', 'wand'],
    specs: [
      {
        id: 'pyromancer',
        role: 'caster',
        icon: '🔥',
        color: '#ff7043',
        passive: { skillPower: 0.3 },
        skill: {
          id: 'meteor',
          cooldownMs: 10000,
          effects: [
            { kind: 'strike', multiplier: 3.5 },
            { kind: 'dot', multiplier: 1.5, durationMs: 4000 },
          ],
        },
      },
      {
        id: 'cryomancer',
        role: 'caster',
        icon: '❄️',
        color: '#7fd6ff',
        passive: { maxHpPct: 0.15, cooldownReduction: 0.1 },
        skill: {
          id: 'frost_nova',
          cooldownMs: 10000,
          effects: [
            { kind: 'stun', durationMs: 1500 },
            { kind: 'shield', pctMaxHp: 0.2, durationMs: 5000 },
            { kind: 'curse', mods: { attackSpeedPct: -0.3 }, durationMs: 5000 },
          ],
        },
      },
    ],
  },
  {
    id: 'cleric',
    role: 'support',
    icon: '✨',
    color: '#f0c05a',
    mainStat: 'int',
    base: { str: 10, agi: 5, int: 11, vit: 13 },
    growth: { str: 1.6, agi: 0.6, int: 2.2, vit: 2.6 },
    attackSpeed: 1,
    critChance: 0.05,
    dodge: 0.02,
    passive: { armor: 5, regenPct: 0.004, damagePct: 0.08 },
    skill: {
      id: 'holy_light',
      cooldownMs: 10000,
      effects: [
        { kind: 'heal', pctMaxHp: 0.18 },
        { kind: 'strike', multiplier: 1 },
      ],
    },
    weapons: ['mace', 'staff'],
    specs: [
      {
        id: 'paladin',
        role: 'tank',
        icon: '⚜️',
        color: '#ffd166',
        passive: { armorPct: 0.3, thorns: 0.15, damagePct: 0.2 },
        skill: {
          id: 'judgment',
          cooldownMs: 9000,
          effects: [
            { kind: 'strike', multiplier: 2 },
            { kind: 'stun', durationMs: 1000 },
          ],
        },
      },
      {
        id: 'druid',
        role: 'support',
        icon: '🌿',
        color: '#8bc34a',
        passive: { regenPct: 0.008, maxHpPct: 0.1, petPower: 0.2 },
        skill: {
          id: 'wild_growth',
          cooldownMs: 11000,
          effects: [
            { kind: 'heal', pctMaxHp: 0.12 },
            { kind: 'buff', mods: { damagePct: 0.35 }, durationMs: 7000 },
          ],
        },
      },
    ],
  },
  {
    id: 'occultist',
    role: 'caster',
    icon: '💀',
    color: '#8e9aa8',
    mainStat: 'int',
    base: { str: 5, agi: 5, int: 14, vit: 10 },
    growth: { str: 0.5, agi: 0.6, int: 3, vit: 2 },
    attackSpeed: 0.85,
    critChance: 0.05,
    dodge: 0.03,
    passive: { lifesteal: 0.06 },
    skill: {
      id: 'soul_drain',
      cooldownMs: 8000,
      effects: [{ kind: 'drain', multiplier: 1.4, healPct: 0.5 }],
    },
    weapons: ['wand', 'staff', 'dagger'],
    specs: [
      {
        id: 'necromancer',
        role: 'caster',
        icon: '🦴',
        color: '#b0bec5',
        passive: { petPower: 0.6, lifesteal: 0.03 },
        skill: {
          id: 'bone_spear',
          cooldownMs: 9000,
          effects: [{ kind: 'strike', multiplier: 2.4 }],
        },
      },
      {
        id: 'hexer',
        role: 'caster',
        icon: '🕯️',
        color: '#b388ff',
        passive: { skillPower: 0.2, maxHpPct: 0.05 },
        skill: {
          id: 'doom',
          cooldownMs: 9000,
          effects: [
            { kind: 'curse', mods: { damagePct: -0.25, armor: -40 }, durationMs: 7000 },
            { kind: 'dot', multiplier: 2.5, durationMs: 7000 },
          ],
        },
      },
    ],
  },
];

const BY_ID = new Map(CLASSES.map((c) => [c.id, c]));
const SPECS = new Map<SpecId, SpecDef>(CLASSES.flatMap((c) => c.specs.map((s) => [s.id, s])));

export const getClass = (id: ClassId): ClassDef => BY_ID.get(id) ?? CLASSES[0];

export const getSpec = (id: SpecId | undefined): SpecDef | undefined =>
  id ? SPECS.get(id) : undefined;

export const isClassId = (id: unknown): id is ClassId =>
  typeof id === 'string' && BY_ID.has(id as ClassId);

/** The class's skill, plus the spec's once picked. */
export const skillsOf = (cls: ClassDef, specId?: SpecId): SkillDef[] => {
  const spec = getSpec(specId);
  return spec ? [cls.skill, spec.skill] : [cls.skill];
};

/** The icon and color to show: the spec's once picked. */
export const looksOf = (cls: ClassDef, specId?: SpecId): { icon: string; color: string } => {
  const spec = getSpec(specId);
  return spec ? { icon: spec.icon, color: spec.color } : { icon: cls.icon, color: cls.color };
};
