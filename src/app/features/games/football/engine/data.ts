import { Difficulty, Role } from './types';

export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

export const HALF_LENGTH = 52.5;
export const HALF_WIDTH = 34;
export const GOAL_HALF_WIDTH = 3.66;
export const GOAL_HEIGHT = 2.44;
export const GOAL_DEPTH = 2;
export const BOX_DEPTH = 16.5;
export const BOX_HALF_WIDTH = 20.16;
export const CIRCLE_RADIUS = 9.15;
export const POST_RADIUS = 0.06;

export const BALL_RADIUS = 0.11;
export const GRAVITY = 9.81;
// Air drag: the ball loses this share of its speed per second, per m/s of speed.
export const AIR_DRAG = 0.013;
// Rolling on grass: a fixed slowing plus a part that grows with speed (m/s²).
export const ROLL_FIXED = 1.8;
export const ROLL_PER_SPEED = 0.1;

// Players. Speeds in m/s; pace (0 to 1) adds the second number.
export const JOG = [5.4, 0.9] as const;
export const SPRINT = [7.0, 1.6] as const;
export const WITH_BALL = 0.88;
export const ACCEL = 20;
export const TURN_RATE = 11;
export const TURN_RATE_BALL = 7;

// How far in front of the feet a dribbled ball sits, and how near a loose ball must be to take.
export const DRIBBLE_GAP = 0.55;
export const REACH = 0.8;
export const KEEPER_REACH = 1.15;
export const DIVE_REACH = 1.6;
export const HEAD_MIN = 1.1;
export const HEAD_MAX = 2.3;

// Ticks the body is busy after each move.
export const KICK_TICKS = 14;
export const SLIDE_TICKS = 40;
export const DIVE_TICKS = 55;
export const FALL_TICKS = 50;
export const CELEBRATE_TICKS = 170;
export const THROW_TICKS = 30;
export const STUMBLE_TICKS = 18;

// Holding shoot charges for this many ticks to full power; a held button lets go by itself.
export const CHARGE_FULL = 42;
export const CHARGE_MAX = 60;

export const SLIDE_SPEED = 8.5;

// Pauses, in ticks.
export const GOAL_WAIT = 200;
export const HALFTIME_WAIT = 150;
export const RESTART_WAIT = { kickoff: 70, throw: 45, corner: 80, goalkick: 60 } as const;
// A person taking a restart has this long before the game takes it for them.
export const RESTART_PATIENCE = 360;
export const KEEPER_HOLD = 70;
// A person's keeper lets go by itself after this long.
export const KEEPER_MAX_HOLD = 360;
// How long a first-time pass waits for the ball, and how near the ball counts as arriving.
export const QUEUE_TICKS = 60;
export const INCOMING = 3;
// A person's standing tackle reaches a bit further than the CPU's.
export const TACKLE_RANGE = 1.8;

// Real minutes per half a match may last.
export const HALF_OPTIONS = [2, 4, 6] as const;

export const MATCH_SECONDS = 90 * 60;
export const HALF_SECONDS = 45 * 60;

// 4-4-2 in a frame where the team's own goal is at -x and +z is its right.
export const FORMATION: { num: number; role: Role; x: number; z: number }[] = [
  { num: 1, role: 'gk', x: -50, z: 0 },
  { num: 2, role: 'def', x: -35, z: 22 },
  { num: 3, role: 'def', x: -38, z: 8 },
  { num: 4, role: 'def', x: -38, z: -8 },
  { num: 6, role: 'def', x: -35, z: -22 },
  { num: 7, role: 'mid', x: -18, z: 22 },
  { num: 5, role: 'mid', x: -22, z: 7 },
  { num: 8, role: 'mid', x: -22, z: -7 },
  { num: 11, role: 'mid', x: -18, z: -22 },
  { num: 9, role: 'fwd', x: -5, z: 6 },
  { num: 10, role: 'fwd', x: -8, z: -7 },
];

// How the CPU plays at each level: ticks between its decisions, a nudge to every skill check it
// makes, and how keen it is to tackle and to shoot from range.
export const CPU: Record<
  Difficulty,
  { think: number; skill: number; tackle: number; shootRange: number }
> = {
  easy: { think: 16, skill: -0.15, tackle: 0.12, shootRange: 18 },
  normal: { think: 9, skill: 0, tackle: 0.22, shootRange: 22 },
  hard: { think: 5, skill: 0.1, tackle: 0.32, shootRange: 25 },
};
