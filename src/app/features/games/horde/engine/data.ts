import { CharacterId, EnemyKind, MetaUpgradeId, PassiveId, WeaponId } from './types';

export const TICK = 1 / 60;
export const ARENA_RADIUS = 70;
export const RUN_SECONDS = 600;
export const MID_BOSS_AT = 300;
export const MAX_ENEMIES = 320;
export const MAX_PICKUPS = 350;
export const MAX_WEAPONS = 4;
export const MAX_PASSIVES = 4;
export const WEAPON_MAX_LEVEL = 6;
export const SHRINE_RADIUS = 2.6;
export const SHRINE_SECONDS = 3;

export const WEAPON_IDS: WeaponId[] = [
  'missile',
  'card',
  'aura',
  'urns',
  'nova',
  'bolt',
  'axe',
  'trail',
];

export const PASSIVE_MAX: Record<PassiveId, number> = {
  might: 5,
  haste: 5,
  reach: 5,
  swift: 5,
  vigor: 5,
  magnet: 5,
  multi: 2,
};
export const PASSIVE_IDS = Object.keys(PASSIVE_MAX) as PassiveId[];

export type EnemyDef = {
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  xp: number;
};

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  husk: { hp: 12, speed: 3.2, damage: 8, radius: 0.6, xp: 1 },
  runner: { hp: 7, speed: 5.4, damage: 6, radius: 0.45, xp: 1 },
  brute: { hp: 70, speed: 2.3, damage: 18, radius: 1.05, xp: 6 },
  spitter: { hp: 20, speed: 2.7, damage: 6, radius: 0.6, xp: 3 },
  boss: { hp: 1400, speed: 3.5, damage: 28, radius: 2.3, xp: 60 },
};

export type CharacterDef = {
  weapon: WeaponId;
  hp: number;
  speed: number;
  damage: number;
};

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  eneas: { weapon: 'missile', hp: 100, speed: 7.2, damage: 1 },
  lula: { weapon: 'card', hp: 100, speed: 7, damage: 1.12 },
  janja: { weapon: 'aura', hp: 130, speed: 6.6, damage: 1 },
  bolsonaro: { weapon: 'urns', hp: 85, speed: 7.9, damage: 1 },
};
export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];

export type MetaUpgradeDef = { max: number; baseCost: number };

// Bought with the gold of past runs, kept between runs.
export const META_UPGRADES: Record<MetaUpgradeId, MetaUpgradeDef> = {
  vigor: { max: 5, baseCost: 30 },
  might: { max: 5, baseCost: 40 },
  swift: { max: 5, baseCost: 30 },
  wisdom: { max: 5, baseCost: 40 },
  greed: { max: 5, baseCost: 30 },
  reroll: { max: 3, baseCost: 80 },
};
export const META_IDS = Object.keys(META_UPGRADES) as MetaUpgradeId[];

export const metaCost = (id: MetaUpgradeId, level: number): number =>
  Math.round(META_UPGRADES[id].baseCost * (level + 1) ** 1.5);

export const xpToNext = (level: number): number => Math.floor(4 + level * 4 + level ** 2 * 0.5);

// How much tougher enemies are `time` seconds into the run.
export const enemyScale = (time: number): number => 1 + (time / 60) ** 1.4 * 0.42;

// Enemies per second.
export const spawnRate = (time: number): number => 1.4 + (time / 60) * 1.25;
