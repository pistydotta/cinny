import { Mods } from './types';

// The talent tree: three branches every class shares, one point per level. Kept simple on
// purpose: each talent is one bonus with ranks, and deeper rows open as you put points in
// that branch. The last row of each branch has many ranks, so there is always somewhere to put
// a point, and a full tree takes several rebirths.

export type BranchId = 'fury' | 'bulwark' | 'fortune';
export const BRANCHES: BranchId[] = ['fury', 'bulwark', 'fortune'];

export type TalentDef = {
  id: string;
  branch: BranchId;
  icon: string;
  /** 0..4: the row, which opens at ROW_NEEDS[row] points in the branch. */
  row: number;
  maxRank: number;
  /** The bonus at rank 1; ranks add up. */
  perRank: Mods;
};

export const ROW_NEEDS = [0, 10, 25, 45, 70];

export const TALENTS: TalentDef[] = [
  {
    id: 'sharpness',
    branch: 'fury',
    icon: '🗡️',
    row: 0,
    maxRank: 10,
    perRank: { damagePct: 0.03 },
  },
  {
    id: 'precision',
    branch: 'fury',
    icon: '🎯',
    row: 0,
    maxRank: 10,
    perRank: { critChance: 0.006 },
  },
  {
    id: 'frenzy',
    branch: 'fury',
    icon: '💨',
    row: 1,
    maxRank: 10,
    perRank: { attackSpeedPct: 0.015 },
  },
  {
    id: 'brutality',
    branch: 'fury',
    icon: '💥',
    row: 1,
    maxRank: 10,
    perRank: { critDamage: 0.05 },
  },
  { id: 'arcana', branch: 'fury', icon: '🔮', row: 2, maxRank: 10, perRank: { skillPower: 0.04 } },
  { id: 'reaper', branch: 'fury', icon: '☠️', row: 2, maxRank: 10, perRank: { execute: 0.04 } },
  { id: 'bloodlust', branch: 'fury', icon: '🩸', row: 3, maxRank: 5, perRank: { lifesteal: 0.01 } },
  {
    id: 'carnage',
    branch: 'fury',
    icon: '🔥',
    row: 4,
    maxRank: 100,
    perRank: { damagePct: 0.015 },
  },

  {
    id: 'toughness',
    branch: 'bulwark',
    icon: '❤️',
    row: 0,
    maxRank: 10,
    perRank: { maxHpPct: 0.03 },
  },
  {
    id: 'plating',
    branch: 'bulwark',
    icon: '🛡️',
    row: 0,
    maxRank: 10,
    perRank: { armorPct: 0.04 },
  },
  { id: 'evasion', branch: 'bulwark', icon: '🌀', row: 1, maxRank: 10, perRank: { dodge: 0.005 } },
  {
    id: 'recovery',
    branch: 'bulwark',
    icon: '💚',
    row: 1,
    maxRank: 10,
    perRank: { regenPct: 0.0005 },
  },
  { id: 'spikes', branch: 'bulwark', icon: '🌵', row: 2, maxRank: 10, perRank: { thorns: 0.02 } },
  {
    id: 'focus',
    branch: 'bulwark',
    icon: '⏳',
    row: 2,
    maxRank: 10,
    perRank: { cooldownReduction: 0.01 },
  },
  {
    id: 'companion',
    branch: 'bulwark',
    icon: '🐾',
    row: 3,
    maxRank: 5,
    perRank: { petPower: 0.04 },
  },
  {
    id: 'endurance',
    branch: 'bulwark',
    icon: '🏔️',
    row: 4,
    maxRank: 100,
    perRank: { maxHpPct: 0.015 },
  },

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
