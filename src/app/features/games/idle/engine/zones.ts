import { makeFighter } from './combat';
import { Rng, pick } from './rng';
import { Fighter, SkillDef, Stats } from './types';

type EnemyDef = {
  id: string;
  icon: string;
  /** Multipliers on the stage's baseline. */
  hp: number;
  damage: number;
  attackSpeed: number;
  armor: number;
  dodge?: number;
  crit?: number;
  skill?: SkillDef;
};

export type ZoneDef = {
  id: string;
  icon: string;
  /** Two colors for the battle background. */
  sky: [string, string];
  enemies: EnemyDef[];
  boss: EnemyDef;
};

// Ten stages per zone, the tenth a boss. After the last zone the map starts over, harder, so
// the climb never ends. A new zone is one more entry plus its names in pt.json.
export const ZONES: ZoneDef[] = [
  {
    id: 'whispering_woods',
    icon: '🌲',
    sky: ['#1d3b2a', '#0b1a12'],
    enemies: [
      { id: 'wolf', icon: '🐺', hp: 0.9, damage: 1, attackSpeed: 1.2, armor: 0.5, dodge: 0.05 },
      { id: 'goblin', icon: '👺', hp: 0.8, damage: 1.1, attackSpeed: 1, armor: 0.6 },
      { id: 'spider', icon: '🕷️', hp: 0.7, damage: 0.9, attackSpeed: 1.4, armor: 0.4 },
    ],
    boss: {
      id: 'treant',
      icon: '🌳',
      hp: 6,
      damage: 1.4,
      attackSpeed: 0.7,
      armor: 2,
      skill: { id: 'root_slam', cooldownMs: 8000, effects: [{ kind: 'stun', durationMs: 1200 }] },
    },
  },
  {
    id: 'ash_mines',
    icon: '⛏️',
    sky: ['#3b2a1d', '#140c06'],
    enemies: [
      { id: 'kobold', icon: '🦎', hp: 0.8, damage: 1, attackSpeed: 1.3, armor: 0.8 },
      { id: 'golem', icon: '🗿', hp: 1.6, damage: 1.2, attackSpeed: 0.6, armor: 2.5 },
      { id: 'bat', icon: '🦇', hp: 0.6, damage: 0.8, attackSpeed: 1.6, armor: 0.3, dodge: 0.12 },
    ],
    boss: {
      id: 'magma_lord',
      icon: '🌋',
      hp: 6.5,
      damage: 1.5,
      attackSpeed: 0.8,
      armor: 2.5,
      skill: { id: 'eruption', cooldownMs: 7000, effects: [{ kind: 'strike', multiplier: 2.5 }] },
    },
  },
  {
    id: 'rot_marsh',
    icon: '🍄',
    sky: ['#2b3320', '#0e120a'],
    enemies: [
      { id: 'slime', icon: '🟢', hp: 1.3, damage: 0.8, attackSpeed: 0.9, armor: 0.5 },
      { id: 'lizardman', icon: '🐊', hp: 1, damage: 1.2, attackSpeed: 1, armor: 1 },
      { id: 'wisp', icon: '👻', hp: 0.6, damage: 1.1, attackSpeed: 1.2, armor: 0.2, dodge: 0.2 },
    ],
    boss: {
      id: 'hydra',
      icon: '🐍',
      hp: 7,
      damage: 1.3,
      attackSpeed: 1.2,
      armor: 2,
      skill: {
        id: 'venom',
        cooldownMs: 6000,
        effects: [{ kind: 'dot', multiplier: 2, durationMs: 5000 }],
      },
    },
  },
  {
    id: 'frost_peaks',
    icon: '🏔️',
    sky: ['#1d2e3b', '#070d14'],
    enemies: [
      { id: 'yeti', icon: '🦍', hp: 1.4, damage: 1.2, attackSpeed: 0.8, armor: 1.2 },
      { id: 'ice_elemental', icon: '🧊', hp: 1, damage: 1, attackSpeed: 1, armor: 2 },
      { id: 'harpy', icon: '🦅', hp: 0.8, damage: 1.1, attackSpeed: 1.4, armor: 0.5, dodge: 0.1 },
    ],
    boss: {
      id: 'frost_wyrm',
      icon: '🐉',
      hp: 8,
      damage: 1.6,
      attackSpeed: 0.9,
      armor: 3,
      skill: {
        id: 'frost_breath',
        cooldownMs: 8000,
        effects: [
          { kind: 'strike', multiplier: 1.8 },
          { kind: 'stun', durationMs: 800 },
        ],
      },
    },
  },
  {
    id: 'infernal_citadel',
    icon: '🏰',
    sky: ['#3b1d1d', '#140606'],
    enemies: [
      { id: 'imp', icon: '😈', hp: 0.7, damage: 1.1, attackSpeed: 1.5, armor: 0.5, crit: 0.1 },
      { id: 'hellhound', icon: '🐕', hp: 1, damage: 1.2, attackSpeed: 1.2, armor: 1 },
      { id: 'death_knight', icon: '💀', hp: 1.5, damage: 1.3, attackSpeed: 0.8, armor: 2.5 },
    ],
    boss: {
      id: 'archdemon',
      icon: '👹',
      hp: 9,
      damage: 1.7,
      attackSpeed: 1,
      armor: 3,
      skill: {
        id: 'hellfire',
        cooldownMs: 7000,
        effects: [
          { kind: 'drain', multiplier: 2, healPct: 0.5 },
          { kind: 'buff', mods: { damagePct: 0.3 }, durationMs: 4000 },
        ],
      },
    },
  },
];

export const STAGES_PER_ZONE = 10;
export const KILLS_PER_STAGE = 10;
export const BOSS_TIME_MS = 30000;

export const isBossStage = (stage: number): boolean => stage % STAGES_PER_ZONE === 0;

export const zoneOf = (stage: number): ZoneDef =>
  ZONES[Math.floor((stage - 1) / STAGES_PER_ZONE) % ZONES.length];

/** How many times the player went around the whole map; shown as a "+1" after the zone. */
export const loopOf = (stage: number): number =>
  Math.floor((stage - 1) / (STAGES_PER_ZONE * ZONES.length));

/** The baseline enemy at a stage. Grows faster than gear, so new gear keeps mattering. */
export const stageBaseline = (stage: number) => {
  const g = 1.085 ** (stage - 1);
  return { hp: 38 * g + stage * 6, damage: 4.2 * g + stage * 0.6, armor: 2 + stage * 1.5 };
};

export const makeEnemy = (stage: number, rng: Rng): Fighter => {
  const zone = zoneOf(stage);
  const boss = isBossStage(stage);
  const def = boss ? zone.boss : pick(rng, zone.enemies);
  const b = stageBaseline(stage);
  const stats: Stats = {
    maxHp: Math.round(b.hp * def.hp),
    damage: b.damage * def.damage,
    attackSpeed: def.attackSpeed,
    critChance: def.crit ?? 0.05,
    critDamage: 1.5,
    armor: b.armor * def.armor,
    dodge: def.dodge ?? 0,
    lifesteal: 0,
    regen: 0,
    skillPower: 1,
    cooldownReduction: 0,
  };
  return makeFighter(def.id, def.icon, stage, stats, def.skill);
};

export const rewardsFor = (stage: number, boss: boolean) => {
  const g = 1.07 ** (stage - 1);
  const mult = boss ? 8 : 1;
  return {
    gold: Math.round((4 + stage) * g * mult),
    xp: Math.round((6 + stage * 1.5 + stage ** 1.4 * 0.5) * mult),
    dropChance: boss ? 1 : 0.12,
  };
};
