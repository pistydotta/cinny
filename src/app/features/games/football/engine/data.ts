import { Difficulty, ReplayKind, Role } from './types';

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
export const THROW_TICKS = 30;
export const STUMBLE_TICKS = 18;

// Holding shoot charges for this many ticks to full power; a held button lets go by itself.
export const CHARGE_FULL = 42;
export const CHARGE_MAX = 60;

export const SLIDE_SPEED = 8.5;

// Pauses, in ticks.
// Long enough for the scorer's run and the team piling on (the goal scene, scenes.ts).
export const GOAL_WAIT = 330;
export const HALFTIME_WAIT = 150;
export const RESTART_WAIT = {
  kickoff: 70,
  throw: 45,
  corner: 80,
  goalkick: 60,
  freekick: 110,
  penalty: 160,
} as const;
// After a scene lets the restart go, a decision still waits this long, so people read it.
export const CALL_WAIT = 40;
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

// Fouls (referee.ts): a slide that misses the ball but meets the carrier is a foul, more so
// from behind; a failed standing tackle sometimes is. The chances of each card follow.
export const FOUL = {
  slideMiss: 0.85,
  slideBehind: 0.55,
  stand: 0.25,
  yellowSlide: 0.4,
  yellowBehind: 0.6,
  redBehind: 0.08,
  yellowStand: 0.08,
  // Stopping a clear run at goal: last defender, carrier heading in, near enough.
  redChance: 0.5,
};
export const WALL_DISTANCE = 9.15;
export const PENALTY_SPOT = 11;
// Free kicks within this of the goal are shot at by the CPU, and get a wall.
export const FREEKICK_RANGE = 28;

// Officials run at these speeds; linesmen keep to their touchline, a step off the pitch.
export const OFFICIAL_SPEED = 6.5;
export const LINESMAN_OFFSET = 1.5;

// Receiving a pass: the player it's meant for reaches a little further, keeps harder balls more
// often and goes to meet it; the stick picks a step to the side (meters), lets the ball run on
// or comes to meet it sooner (meters along its path). Pointed clearly across the path (its
// across part over RECEIVE_FREE) or away from a stopped ball, the player goes where the stick
// says instead. See receiveMove in match.ts.
export const RECEIVE_REACH = 1.3;
export const RECEIVE_HARD = 22;
export const RECEIVE_SIDE = 1.2;
export const RECEIVE_RUN = 4;
export const RECEIVE_COME = 6;
export const RECEIVE_FREE = 0.8;
export const RECEIVE_WINDOW = 0.45;
// The first touch turns the body this far (radians) toward where the person points.
export const FIRST_TOUCH_TURN = 1.2;

// The bench: seven substitutes in the frame of FORMATION, and how many may come on.
export const BENCH: { num: number; role: Role }[] = [
  { num: 12, role: 'gk' },
  { num: 13, role: 'def' },
  { num: 14, role: 'mid' },
  { num: 15, role: 'mid' },
  { num: 16, role: 'fwd' },
  { num: 17, role: 'def' },
  { num: 18, role: 'fwd' },
];
export const MAX_SUBS = 5;
// The CPU coach makes a change at the first stoppage after each of these minutes.
export const COACH_MINUTES = [58, 67, 76] as const;

// Off the pitch, past the far touchline (-z, which the TV camera faces): each team's bench by
// the halfway line (side 0 toward -x), the fourth official between them and the tunnel
// behind. Seats are SEAT_GAP apart from BENCH_X out.
export const BENCH_Z = -(HALF_WIDTH + 5);
export const BENCH_X = 5;
export const SEAT_GAP = 0.9;
export const FOURTH_Z = -(HALF_WIDTH + 2.2);
export const TUNNEL_Z = -(HALF_WIDTH + 7);

// Walking: scenes, the bench, a player going off.
export const WALK = 1.7;
// Officials run this much faster to a decision.
export const OFFICIAL_HURRY = 1.3;

// Scenes (scenes.ts), in ticks.
export const SCENE = {
  // A fouled player lies this long.
  down: 120,
  // The offender's arms-out protest.
  protest: 80,
  // The referee holds a card up this long, or points the way.
  card: 100,
  point: 60,
  // A foul scene holds the restart at least this long, and at most this long while the
  // referee runs over.
  foulMin: 90,
  foulMax: 360,
  // Offside: the flag and the referee's raised arm.
  offside: 90,
  // A substitution: the slap of hands, then the restart waits a little more. A player going
  // off who hasn't reached the line by `subWalk` is put there.
  highfive: 36,
  subAfter: 30,
  subWalk: 420,
  // After a goal, the beaten side stands with hands on heads this long.
  dejected: 140,
} as const;

// Replays (replay.ts). Each kind is shown in takes: a stretch of the match from `before` ticks
// before the moment to `after` ticks past it, played at 1/`slow` speed (a whole number, so a
// replay's length in ticks is the same everywhere), from one of the renderer's cameras: the TV
// camera closer in, behind the goal, low on the touchline, or level with the offside line.
export type ReplayCam = 'tv' | 'goal' | 'low' | 'line';
export type ReplayTake = { before: number; after: number; slow: number; cam: ReplayCam };
export const REPLAY_TAKES: Record<ReplayKind, ReplayTake[]> = {
  goal: [
    { before: 240, after: 45, slow: 1, cam: 'tv' },
    { before: 60, after: 30, slow: 2, cam: 'goal' },
  ],
  penalty: [
    { before: 120, after: 30, slow: 1, cam: 'tv' },
    { before: 40, after: 25, slow: 3, cam: 'low' },
  ],
  foul: [
    { before: 120, after: 30, slow: 1, cam: 'tv' },
    { before: 40, after: 25, slow: 3, cam: 'low' },
  ],
  offside: [{ before: 150, after: 20, slow: 1, cam: 'line' }],
  save: [{ before: 90, after: 35, slow: 2, cam: 'goal' }],
  chance: [{ before: 90, after: 30, slow: 2, cam: 'goal' }],
};
// A replay starts this long into a stoppage (after any scene lets the restart go), or as the
// goal celebration ends. No take's `after` may be longer, so the whole stretch has happened.
export const REPLAY_AFTER = 45;
// A moment that play ran on from for this long without a stoppage is forgotten.
export const REPLAY_STALE = 150;

// The video referee (var.ts), in ticks: the longest a vote stays open, and how long the verdict
// shows before play goes on. Votes are counted from at most MAX_VOTERS people.
export const VAR = { review: 1200, verdict: 180, maxVoters: 1000 } as const;
