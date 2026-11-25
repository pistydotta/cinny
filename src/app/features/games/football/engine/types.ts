// A match is plain data, stepped 60 times a second by `step` in match.ts. Nothing here holds a
// function or a class, so a state can be copied with structuredClone: online play will keep a
// few past states and step again from one when a late input arrives (rollback).
//
// Lengths are in meters and speeds in meters per second. The pitch's long axis is x, from
// -52.5 to 52.5; z runs across it, from -34 to 34; y is height. The renderer's camera looks
// from the +z touchline, so +x is the right of the screen and -z is up.

export type Side = 0 | 1;

export type Role = 'gk' | 'def' | 'mid' | 'fwd';

// What a player's body is busy with. While `busy` counts down the player can't run freely.
export type Action = 'none' | 'kick' | 'slide' | 'dive' | 'fall' | 'celebrate' | 'throw';

export type Player = {
  side: Side;
  // Shirt number, 1 to 11.
  num: number;
  role: Role;
  // The formation slot, in a frame where the player's own goal is at -x.
  homeX: number;
  homeZ: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  // Where the player faces, in radians: 0 is +x, PI/2 is +z.
  face: number;
  action: Action;
  busy: number;
  // For a dive or a slide: the direction taken.
  actX: number;
  actZ: number;
  // Ticks before the player may touch the ball again (after kicking it, losing it, missing a tackle).
  noTouch: number;
  // 0 to 1: skill from the team's rating, with a small spread per player.
  pace: number;
  skill: number;
  // For the renderer: skin and hair, picked once from the seed.
  look: number;
};

export type Ball = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  // The index of the player with the ball at their feet, or -1.
  owner: number;
  // Who touched it last, for throw-ins, corners and goal kicks.
  lastSide: Side;
  lastPlayer: number;
  // A shot in flight, so the keeper knows to dive.
  shot: boolean;
  // The teammate a pass was meant for, who runs to meet it; -1 when none.
  target: number;
  // Ticks the owner has had it.
  held: number;
  // Who kicked it last on purpose: a goal after a save or a deflection is theirs.
  credit: number;
};

// A button pressed while the ball was still on its way to the player, played on arrival.
export type Queued = { key: 'pass' | 'through'; until: number };

export type RestartKind = 'kickoff' | 'throw' | 'corner' | 'goalkick';

// A person's button pressed before the restart was ready is kept and used once it is.
export type Restart = {
  kind: RestartKind;
  side: Side;
  x: number;
  z: number;
  taker: number;
  queued?: 'pass' | 'lob' | 'cross';
};

export type Phase = 'play' | 'restart' | 'goal' | 'halftime' | 'over';

// One side's controls for one tick. `mx`/`mz` is a direction in the world, as whole numbers
// from -100 to 100, so an input sent over the network or kept in a replay reads back the same.
export type Input = {
  mx: number;
  mz: number;
  sprint: boolean;
  pass: boolean;
  shoot: boolean;
  through: boolean;
  lob: boolean;
};

export const NO_INPUT: Input = {
  mx: 0,
  mz: 0,
  sprint: false,
  pass: false,
  shoot: false,
  through: false,
  lob: false,
};

export type Difficulty = 'easy' | 'normal' | 'hard';

export type MatchSetup = {
  seed: number;
  teams: [string, string];
  // Whether a person plays each side; the CPU plays the rest.
  humans: [boolean, boolean];
  // Real minutes per half.
  halfMinutes: number;
  difficulty: Difficulty;
};

export type GameEvent =
  | { type: 'kick'; player: number; power: number }
  | { type: 'goal'; side: Side; scorer: number; own: boolean }
  | { type: 'save'; player: number; caught: boolean }
  | { type: 'post' }
  | { type: 'tackle'; player: number; won: boolean }
  | { type: 'whistle'; kind: 'start' | 'restart' | 'half' | 'end' }
  | { type: 'out'; kind: RestartKind };

export type MatchState = {
  setup: MatchSetup;
  rng: number;
  tick: number;
  // Match time in seconds, 0 to 90 * 60: one real half is `halfMinutes`.
  clock: number;
  half: 1 | 2;
  score: [number, number];
  phase: Phase;
  // Ticks left of the current pause (a goal, half time, a restart's set up).
  wait: number;
  restart: Restart | undefined;
  players: Player[];
  ball: Ball;
  // The player each side controls (a person's, or the CPU's ball carrier).
  control: [number, number];
  // Ticks the shot or lob button has been held; 0 when it isn't.
  charge: [number, number];
  chargeKind: ['shoot' | 'lob' | undefined, 'shoot' | 'lob' | undefined];
  // Last tick's input, to tell a press from a hold.
  prev: [Input, Input];
  // The CPU decides every few ticks, not every tick; `aim` is the way its carrier dribbles.
  think: [number, number];
  aim: [number, number];
  // First-time passes waiting for the ball, per side.
  queued: [Queued | undefined, Queued | undefined];
  // The teammate a person's pass would go to right now (-1 when none), for the highlight.
  preview: [number, number];
  // Goals by shirt number, for the end screen.
  scorers: { side: Side; num: number; minute: number; own: boolean }[];
  events: GameEvent[];
};
