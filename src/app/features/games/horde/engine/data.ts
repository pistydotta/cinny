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
  // How tall the body is: a hero whose feet are higher than this jumps over it.
  height: number;
  xp: number;
};

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  husk: { hp: 12, speed: 3.2, damage: 8, radius: 0.6, height: 1.5, xp: 1 },
  runner: { hp: 7, speed: 5.4, damage: 6, radius: 0.45, height: 1.1, xp: 1 },
  brute: { hp: 70, speed: 2.3, damage: 18, radius: 1.05, height: 2.4, xp: 6 },
  spitter: { hp: 20, speed: 2.7, damage: 6, radius: 0.6, height: 1.6, xp: 3 },
  boss: { hp: 1400, speed: 3.5, damage: 28, radius: 2.3, height: 5, xp: 60 },
};

// How the hero moves, in units and seconds. Kept together so they can be tuned by playing.
// On the ground the hero speeds up to its Movement Speed fast and stops fast. In the air there is no
// friction, and the push only works while the speed along the direction asked for is under
// `airCap`: strafing while turning the camera the same way, in an arc, adds speed (the bunny hop of
// the old shooters). Landing keeps all of it for `hopWindow` seconds, so a jump in time loses none.
export const MOVE = {
  gravity: 30,
  jumpSpeed: 11.5,
  // Gravity is this many times stronger while rising with the jump key let go: a tap jumps low.
  jumpCut: 2.6,
  // A press this early before landing still jumps on landing.
  jumpBuffer: 0.1,
  // Leaving an edge, a jump still works for this long.
  coyote: 0.1,
  groundAccel: 14,
  friction: 10,
  // Below this speed friction stops the hero as if it were going this fast, so it stops for good.
  stopSpeed: 2,
  airAccel: 70,
  airCap: 0.7,
  hopWindow: 4 / 60,
  // The horizontal speed can't pass this many times the Movement Speed.
  maxSpeed: 2.4,
  dashSeconds: 0.18,
  dashSpeed: 26,
  dashCooldown: 2.2,
};

// Hostile shots fly this high over the ground; a hero whose feet are higher is not hit.
export const SHOT_HEIGHT = 1;

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
