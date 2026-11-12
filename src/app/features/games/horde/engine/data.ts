import { dpow } from './dmath';
import {
  BuffId,
  CharacterId,
  EnemyKind,
  HordeEventKind,
  MetaUpgradeId,
  PickupKind,
  WeaponId,
} from './types';

// Bumped whenever the rules change what a run can reach. Each reported run carries it, so the
// ranking can tell runs of the old rules from the new ones without deleting any.
export const ENGINE_VERSION = 4;

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
// Chests standing on the map: how many, how close to stand and for how long to buy one, and the
// price of the first. Each one bought makes the next dearer.
export const MAP_CHESTS = 9;
export const MAP_CHEST_RADIUS = 1.8;
export const MAP_CHEST_SECONDS = 0.8;
export const MAP_CHEST_PRICE = 15;
export const chestPrice = (bought: number): number => {
  // Multiplied out, not `**`: powers may differ in the last digit between browsers.
  let price = MAP_CHEST_PRICE;
  for (let i = 0; i < bought; i += 1) price *= 1.5;
  return Math.round(price);
};

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
  charger: { hp: 30, speed: 3, damage: 14, radius: 0.7, height: 1.6, xp: 3 },
  bomber: { hp: 10, speed: 5.8, damage: 22, radius: 0.55, height: 1.2, xp: 2 },
  shield: { hp: 45, speed: 2.6, damage: 12, radius: 0.8, height: 1.9, xp: 4 },
  summoner: { hp: 40, speed: 2.4, damage: 6, radius: 0.7, height: 2, xp: 6 },
  swarm: { hp: 2.5, speed: 6.4, damage: 3, radius: 0.3, height: 0.7, xp: 0.4 },
  barrel: { hp: 1, speed: 0, damage: 0, radius: 0.6, height: 1.2, xp: 0 },
  pot: { hp: 1, speed: 0, damage: 0, radius: 0.5, height: 1, xp: 0 },
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

// Health and speed to start with. The rest of what sets a hero apart is HERO_TRAITS in stats.ts.
export type CharacterDef = {
  weapon: WeaponId;
  hp: number;
  speed: number;
};

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  eneas: { weapon: 'missile', hp: 100, speed: 7.2 },
  lula: { weapon: 'card', hp: 100, speed: 7 },
  janja: { weapon: 'aura', hp: 130, speed: 6.6 },
  bolsonaro: { weapon: 'urns', hp: 85, speed: 7.9 },
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
  regen: { max: 5, baseCost: 40 },
  armor: { max: 5, baseCost: 50 },
  crit: { max: 5, baseCost: 50 },
  hunter: { max: 5, baseCost: 40 },
  luck: { max: 5, baseCost: 60 },
  banish: { max: 3, baseCost: 60 },
  skip: { max: 3, baseCost: 40 },
};
export const META_IDS = Object.keys(META_UPGRADES) as MetaUpgradeId[];

export const metaCost = (id: MetaUpgradeId, level: number): number =>
  Math.round(META_UPGRADES[id].baseCost * (level + 1) ** 1.5);

export const xpToNext = (level: number): number => Math.floor(4 + level * 4 + level * level * 0.5);

// How much tougher enemies are `time` seconds into the run.
export const enemyScale = (time: number): number => 1 + dpow(time / 60, 1.4) * 0.42;

// Enemies per second.
export const spawnRate = (time: number): number => 1.4 + (time / 60) * 1.25;

// Seconds between elites, before Elite Rate.
export const ELITE_EVERY = 45;

// Shields fill again this long after the last hit, at this share of the bar per second.
export const SHIELD_WAIT = 3;
export const SHIELD_FILL = 0.5;

// Overheal over max health fades by this share each second.
export const OVERHEAL_FADE = 0.06;

// Bosses ignore this share of the hero's armor and evasion, so nothing makes the hero immortal.
export const BOSS_PIERCE = 0.5;

// Lifesteal heals at most this much health a second.
export const LIFESTEAL_PER_SECOND = 8;

// Chance that a kill drops a powerup, before Powerup Chance and luck.
export const POWERUP_CHANCE = 0.004;

// Seconds each lasting powerup lasts, before Powerup Power.
export const BUFF_SECONDS: Record<BuffId, number> = { rage: 8, freeze: 4, star: 5, sprint: 4 };

// Seconds between uses of each hero's ability.
export const ABILITY_COOLDOWN: Record<CharacterId, number> = {
  eneas: 40,
  lula: 35,
  janja: 45,
  bolsonaro: 40,
};

// Gold for skipping an offer.
export const SKIP_GOLD = 10;

// Powerups a kill can drop, all as likely.
export const POWERUPS: PickupKind[] = ['bomb', 'rage', 'freeze', 'star', 'goldrain'];

// Moments of a run when the horde does something different.
export const HORDE_EVENTS: { at: number; kind: HordeEventKind }[] = [
  { at: 100, kind: 'ring' },
  { at: 200, kind: 'stampede' },
  { at: 260, kind: 'rain' },
  { at: 400, kind: 'ring' },
  { at: 470, kind: 'stampede' },
  { at: 540, kind: 'rain' },
];

// Difficulty tiers unlocked by winning: each adds this much Difficulty.
export const TIER_DIFFICULTY = 0.5;
export const MAX_TIER = 3;

// Seconds a cursed shrine makes the horde tougher, and by how much.
export const CURSE_SECONDS = 60;
export const CURSE_DIFFICULTY = 0.6;

// A challenge shrine: kills needed in this many seconds.
export const CHALLENGE_SECONDS = 30;
