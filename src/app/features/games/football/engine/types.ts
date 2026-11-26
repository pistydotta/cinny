// A match is plain data, stepped 60 times a second by `step` in match.ts. Nothing here holds a
// function or a class, so a state can be copied with structuredClone: online play keeps a few
// past states and steps again from one when a late input arrives (rollback).
//
// Lengths are in meters and speeds in meters per second. The pitch's long axis is x, from
// -52.5 to 52.5; z runs across it, from -34 to 34; y is height. The renderer's camera looks
// from the +z touchline, so +x is the right of the screen and -z is up.

export type Side = 0 | 1;

export type Role = 'gk' | 'def' | 'mid' | 'fwd';

// What a body is busy with. While `busy` counts down the player can't run freely.
export type Action =
  | 'none'
  | 'kick'
  | 'slide'
  | 'dive'
  | 'fall'
  | 'celebrate'
  | 'throw'
  // Officials: the whistle, a card held up, the linesman's flag.
  | 'whistle'
  | 'card'
  | 'flag';

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
  // Yellow cards this match; a second one is a red.
  yellow: number;
  // Sent off: out of the match, standing by the bench.
  off: boolean;
};

// The referee (0) and the two linesmen (1 runs the near touchline, 2 the far one).
export type Official = {
  x: number;
  z: number;
  vx: number;
  vz: number;
  face: number;
  action: Action;
  busy: number;
  // The card being shown.
  card: 'yellow' | 'red' | undefined;
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
  // The teammate who passed it to the player who has it now (-1 when none): passing straight
  // back takes a clear aim, so the ball moves around.
  from: number;
  // Attackers in an offside position when a teammate last played the ball, with where they
  // stood: the first of them to touch it next is caught.
  offside: [number, number, number][];
};

// A button pressed while the ball was still on its way to the player, played on arrival, toward
// where the person pointed when they pressed it (unless they point somewhere else by then).
export type Queued = { key: 'pass' | 'through'; until: number; mx: number; mz: number };

export type RestartKind = 'kickoff' | 'throw' | 'corner' | 'goalkick' | 'freekick' | 'penalty';

// A person's button pressed before the restart was ready is kept and used once it is.
export type Restart = {
  kind: RestartKind;
  side: Side;
  x: number;
  z: number;
  taker: number;
  queued?: 'pass' | 'lob' | 'cross' | 'shot';
};

// The referee's last decision, shown while play waits for the restart.
export type Call =
  | { kind: 'foul'; player: number; card: 'yellow' | 'red' | undefined; secondYellow: boolean }
  | { kind: 'offside'; player: number }
  | { kind: 'penalty'; player: number; card: 'yellow' | 'red' | undefined; secondYellow: boolean };

export type Phase = 'play' | 'restart' | 'goal' | 'halftime' | 'over';

// One person's controls for one tick. `mx`/`mz` is a direction in the world, as whole numbers
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
  // One entry per person, the side they play: [0] against the CPU, [0, 1] two people, up to
  // four per side online. Inputs come in this order. A side with nobody is the CPU's.
  slots: Side[];
  // Real minutes per half.
  halfMinutes: number;
  difficulty: Difficulty;
};

// What each person holds: the player they control and their buttons' state.
export type Person = {
  control: number;
  // Ticks the shot or lob button has been held; 0 when it isn't.
  charge: number;
  chargeKind: 'shoot' | 'lob' | undefined;
  // Last tick's input, to tell a press from a hold.
  prev: Input;
  // A first-time pass waiting for the ball.
  queued: Queued | undefined;
  // The teammate this person's pass would go to right now (-1 when none), for the highlight.
  preview: number;
};

export type GameEvent =
  | { type: 'kick'; player: number; power: number }
  | { type: 'goal'; side: Side; scorer: number; own: boolean }
  | { type: 'save'; player: number; caught: boolean }
  | { type: 'post' }
  | { type: 'tackle'; player: number; won: boolean }
  | { type: 'whistle'; kind: 'start' | 'restart' | 'half' | 'end' | 'foul' }
  | { type: 'out'; kind: RestartKind }
  | { type: 'foul'; player: number; victim: number }
  | { type: 'card'; player: number; color: 'yellow' | 'red' }
  | { type: 'offside'; player: number };

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
  call: Call | undefined;
  players: Player[];
  officials: Official[];
  ball: Ball;
  // One per entry of setup.slots.
  people: Person[];
  // The CPU decides every few ticks, not every tick; `aim` is the way its carrier dribbles.
  think: [number, number];
  aim: [number, number];
  // Goals by shirt number, for the end screen.
  scorers: { side: Side; num: number; minute: number; own: boolean }[];
  // Cards by shirt number, for the end screen.
  cards: { side: Side; num: number; minute: number; color: 'yellow' | 'red' }[];
  events: GameEvent[];
};
