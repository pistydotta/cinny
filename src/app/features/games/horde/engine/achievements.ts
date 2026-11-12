import { CharacterId } from './types';

// Feats that unlock content. Everything here is read from totals the server keeps over a
// player's runs (MetaSave), so old runs count and nobody loses what they could already play.

export type Progress = {
  runs: number;
  wins: number;
  bestTime: number;
  bestKills: number;
  bestLevel: number;
  totalKills: number;
  heroes: Record<CharacterId, { wins: number; kills: number }>;
  // Highest difficulty tier won; -1 when none.
  bestTier: number;
};

export type AchievementId =
  | 'survive5'
  | 'kills1000'
  | 'firstWin'
  | 'runs10'
  | 'level25'
  | 'runs20'
  | 'total10000'
  | 'winEneas'
  | 'winLula'
  | 'winJanja'
  | 'winBolsonaro'
  | 'tier3'
  | 'total50000';

export type Achievement = {
  id: AchievementId;
  goal: number;
  value: (p: Progress) => number;
  // What it unlocks, as "weapon:axe" or "passive:luck". Some only give the medal.
  unlocks?: string;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'survive5', goal: 300, value: (p) => p.bestTime, unlocks: 'weapon:axe' },
  { id: 'kills1000', goal: 1000, value: (p) => p.bestKills, unlocks: 'weapon:trail' },
  { id: 'firstWin', goal: 1, value: (p) => p.wins, unlocks: 'passive:extrajump' },
  { id: 'runs10', goal: 10, value: (p) => p.runs, unlocks: 'passive:ricochet' },
  { id: 'level25', goal: 25, value: (p) => p.bestLevel, unlocks: 'passive:luck' },
  { id: 'runs20', goal: 20, value: (p) => p.runs, unlocks: 'passive:curse' },
  { id: 'total10000', goal: 10000, value: (p) => p.totalKills, unlocks: 'weapon:bolt' },
  { id: 'winEneas', goal: 1, value: (p) => p.heroes.eneas.wins },
  { id: 'winLula', goal: 1, value: (p) => p.heroes.lula.wins },
  { id: 'winJanja', goal: 1, value: (p) => p.heroes.janja.wins },
  { id: 'winBolsonaro', goal: 1, value: (p) => p.heroes.bolsonaro.wins },
  { id: 'tier3', goal: 3, value: (p) => p.bestTier },
  { id: 'total50000', goal: 50000, value: (p) => p.totalKills },
];

export const isDone = (a: Achievement, p: Progress): boolean => a.value(p) >= a.goal;

// What is still locked for this player, to keep out of a run's offers.
export const lockedContent = (p: Progress): string[] =>
  ACHIEVEMENTS.filter((a) => a.unlocks && !isDone(a, p)).map((a) => a.unlocks as string);

// The unfinished achievement closest to done, for the end of a run.
export const nearestAchievement = (p: Progress): Achievement | undefined =>
  ACHIEVEMENTS.filter((a) => !isDone(a, p) && a.value(p) > 0).sort(
    (a, b) => b.value(p) / b.goal - a.value(p) / a.goal
  )[0];

// A hero's mastery grows with the enemies killed with it: 400 for level 1, 1,600 for 2, 3,600
// for 3... up to 10. Each level is +1% damage and +2 max health with that hero.
export const MAX_MASTERY = 10;
export const masteryLevel = (kills: number): number =>
  Math.min(MAX_MASTERY, Math.floor(Math.sqrt(Math.max(0, kills) / 400)));
export const masteryKills = (level: number): number => level * level * 400;
