import { AltarId, Mods, Prestige } from './types';

// Rebirth: start over at level 1 and stage 1 for eternal ashes, spent at the altar on bonuses
// that never go away. Gear, materials and the specialization stay, so the first stages after
// a rebirth fly by. Each rebirth asks for a deeper stage than the last, so they get rarer as
// you go: fast early ones teach the loop, later ones are a real goal.

export const FIRST_REBIRTH_STAGE = 70;
export const REBIRTH_STEP = 10;

export const rebirthStage = (rebirths: number): number =>
  FIRST_REBIRTH_STAGE + REBIRTH_STEP * rebirths;

/** Ashes for a run that reached `maxStage`. */
export const ashesFor = (maxStage: number): number =>
  maxStage < 50 ? 0 : Math.floor(((maxStage - 50) / 5) ** 1.5);

export type AltarDef = {
  id: AltarId;
  icon: string;
  baseCost: number;
  growth: number;
  max?: number;
};

export const ALTAR: AltarDef[] = [
  { id: 'ember_might', icon: '🔥', baseCost: 1, growth: 1.3 },
  { id: 'ember_vigor', icon: '❤️‍🔥', baseCost: 1, growth: 1.3 },
  { id: 'ember_greed', icon: '🪙', baseCost: 1, growth: 1.35 },
  { id: 'ember_wisdom', icon: '📖', baseCost: 1, growth: 1.35 },
  { id: 'ember_forge', icon: '⚒️', baseCost: 2, growth: 1.45, max: 10 },
  { id: 'talent_well', icon: '🌟', baseCost: 3, growth: 1.5, max: 30 },
  { id: 'head_start', icon: '🚀', baseCost: 5, growth: 1.7, max: 10 },
  { id: 'long_rest', icon: '🌙', baseCost: 2, growth: 1.6, max: 8 },
];

export const altarCost = (def: AltarDef, level: number): number =>
  Math.ceil(def.baseCost * def.growth ** level);

const lv = (p: Prestige, id: AltarId): number => p.altar[id] ?? 0;

/** Altar bonuses that are plain mods. Damage and life multiply apart (altarMore). */
export const altarMods = (p: Prestige): Mods => ({
  goldFind: 0.2 * lv(p, 'ember_greed'),
  xpGain: 0.2 * lv(p, 'ember_wisdom'),
  salvageYield: 0.15 * lv(p, 'ember_forge'),
  forgeChance: 0.005 * lv(p, 'ember_forge'),
});

export const altarMore = (p: Prestige): { damage: number; maxHp: number } => ({
  damage: 1 + 0.12 * lv(p, 'ember_might'),
  maxHp: 1 + 0.12 * lv(p, 'ember_vigor'),
});

export const bonusTalentPoints = (p: Prestige): number => 3 * lv(p, 'talent_well');

/** Where a run starts, never past the best stage ever reached. */
export const startStage = (p: Prestige, bestStage: number): number =>
  Math.max(1, Math.min(1 + 10 * lv(p, 'head_start'), bestStage));

export const offlineHours = (p: Prestige): number => 8 + lv(p, 'long_rest');
