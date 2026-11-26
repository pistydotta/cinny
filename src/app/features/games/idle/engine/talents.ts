import { CLASSES } from './classes';
import { ClassId, Hero, SpecId, Mods } from './types';

// Class and specialization combat paths, plus a shared economy path.
export type BranchId = 'fury' | 'bulwark' | 'fortune';
export const BRANCHES: BranchId[] = ['fury', 'bulwark', 'fortune'];

export type TalentDef = {
  id: string;
  classId?: ClassId;
  specId?: SpecId;
  name?: string;
  branch: BranchId;
  icon: string;
  /** 0..4: the row, which opens at ROW_NEEDS[row] points in the branch. */
  row: number;
  maxRank: number;
  /** The bonus at rank 1; ranks add up. */
  perRank: Mods;
};

export const ROW_NEEDS = [0, 5, 10, 15, 20];

export const TALENTS: TalentDef[] = [
  { id: 'greed', branch: 'fortune', icon: '🪙', row: 0, maxRank: 10, perRank: { goldFind: 0.06 } },
  { id: 'scholar', branch: 'fortune', icon: '📜', row: 0, maxRank: 10, perRank: { xpGain: 0.05 } },
  {
    id: 'scavenger',
    branch: 'fortune',
    icon: '🎁',
    row: 1,
    maxRank: 10,
    perRank: { dropRate: 0.04 },
  },
  {
    id: 'salvager',
    branch: 'fortune',
    icon: '⛏️',
    row: 1,
    maxRank: 10,
    perRank: { salvageYield: 0.06 },
  },
  {
    id: 'smith',
    branch: 'fortune',
    icon: '⚒️',
    row: 2,
    maxRank: 5,
    perRank: { forgeChance: 0.01 },
  },
  {
    id: 'veteran',
    branch: 'fortune',
    icon: '🎖️',
    row: 2,
    maxRank: 10,
    perRank: { xpGain: 0.04, goldFind: 0.04 },
  },
  { id: 'hoarder', branch: 'fortune', icon: '💎', row: 3, maxRank: 5, perRank: { dropRate: 0.05 } },
  {
    id: 'prosperity',
    branch: 'fortune',
    icon: '👑',
    row: 4,
    maxRank: 100,
    perRank: { goldFind: 0.01, xpGain: 0.01, damagePct: 0.005 },
  },
];

// Class combat paths and specialization passives replace the shared combat branches.
const CLASS_NODES: Record<ClassId, [string, Mods][]> = {
  warrior: [
    ['Weapon discipline', { str: 2 }],
    ['Tempered steel', { armorPct: 0.05 }],
    ['Cleave mastery', { skillPower: 0.05 }],
    ['Battle fury', { rage: 0.04 }],
    ['Veteran of steel', { damagePct: 0.02 }],
  ],
  archer: [
    ['Steady aim', { agi: 2 }],
    ['Quick draw', { attackSpeedPct: 0.025 }],
    ['Vital shot', { critDamage: 0.08 }],
    ['Piercing volley', { skillPower: 0.05 }],
    ['Eagle eye', { critChance: 0.004 }],
  ],
  rogue: [
    ['Dagger training', { agi: 2 }],
    ['Shadow dance', { dodge: 0.008 }],
    ['Backstab', { critDamage: 0.08 }],
    ['Finishing blow', { execute: 0.07 }],
    ['Lethal rhythm', { attackSpeedPct: 0.015 }],
  ],
  mage: [
    ['Arcane study', { int: 2 }],
    ['Spell weaving', { skillPower: 0.06 }],
    ['Spell cadence', { cooldownReduction: 0.012 }],
    ['Arcane surge', { damagePct: 0.04 }],
    ['Archmage', { skillPower: 0.025 }],
  ],
  cleric: [
    ['Sacred teachings', { int: 2 }],
    ['Restoration', { regenPct: 0.001 }],
    ['Consecrated armor', { armorPct: 0.05 }],
    ['Divine light', { skillPower: 0.05 }],
    ['Unbroken faith', { maxHpPct: 0.025 }],
  ],
  occultist: [
    ['Forbidden knowledge', { int: 2 }],
    ['Soul hunger', { lifesteal: 0.008 }],
    ['Dark rites', { skillPower: 0.06 }],
    ['Stolen vitality', { maxHpPct: 0.04 }],
    ['Endless drain', { damagePct: 0.025 }],
  ],
};
CLASSES.forEach((cls) => {
  CLASS_NODES[cls.id].forEach(([name, perRank], row) =>
    TALENTS.push({
      id: `${cls.id}_${row}`,
      classId: cls.id,
      branch: 'fury',
      icon: cls.icon,
      name,
      row,
      maxRank: row === 4 ? 100 : 5,
      perRank,
    })
  );
  cls.specs.forEach((spec) => {
    Object.entries(spec.passive).forEach(([key, value], row) =>
      TALENTS.push({
        id: `${spec.id}_${row}`,
        classId: cls.id,
        specId: spec.id,
        branch: 'bulwark',
        icon: spec.icon,
        row,
        maxRank: row === Object.keys(spec.passive).length - 1 ? 100 : 5,
        perRank: { [key]: value * 0.12 },
      })
    );
  });
});
export const talentAllowed = (hero: Hero, def: TalentDef): boolean =>
  def.classId
    ? def.classId === hero.classId && (!def.specId || def.specId === hero.specId)
    : def.branch === 'fortune';
export const talentsFor = (hero: Hero): TalentDef[] =>
  TALENTS.filter((t) => talentAllowed(hero, t));

const BY_ID = new Map(TALENTS.map((t) => [t.id, t]));
export const getTalent = (id: string): TalentDef | undefined => BY_ID.get(id);

export const spentIn = (talents: Record<string, number>, branch: BranchId): number =>
  TALENTS.filter((t) => t.branch === branch).reduce((sum, t) => sum + (talents[t.id] ?? 0), 0);

export const spentTotal = (talents: Record<string, number>): number =>
  Object.values(talents).reduce((sum, n) => sum + n, 0);

export const rowOpen = (talents: Record<string, number>, def: TalentDef): boolean =>
  spentIn(talents, def.branch) >= ROW_NEEDS[def.row];

export const talentMods = (talents: Record<string, number>): Mods[] =>
  TALENTS.filter((t) => (talents[t.id] ?? 0) > 0).map((t) => {
    const rank = talents[t.id] ?? 0;
    const out: Mods = {};
    Object.entries(t.perRank).forEach(([k, v]) => {
      out[k as keyof Mods] = (v ?? 0) * rank;
    });
    return out;
  });

/** Points from levels plus what the altar adds. */
export const talentPoints = (level: number, bonus: number): number => level - 1 + bonus;
