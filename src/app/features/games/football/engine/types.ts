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
  | 'flag'
  // Scenes (scenes.ts): what bodies do while play is stopped. They change nothing in the rules;
  // the renderer has a clip for each, and later features can hang on them.
  // Lying hurt after a foul, holding the leg.
  | 'down'
  // Arms out at the referee: "I never touched him".
  | 'protest'
  // Hands on the head: a goal let in, a match lost, a red card.
  | 'dejected'
  // Arms up, jumping: teammates of a scorer, a winning team.
  | 'cheer'
  // Celebrations a scorer picks: running with arms out like wings, sliding on the knees.
  | 'airplane'
  | 'kneeslide'
  // Clapping: the crowd for a player going off, a team at full time.
  | 'clap'
  // A hand up to slap: the two players of a substitution.
  | 'highfive'
  // On the bench.
  | 'sit'
  // Officials: pointing the way (a free kick, a throw-in, a corner, a goal kick), the arm up
  // for an indirect free kick, and the fourth official's board.
  | 'point'
  | 'indirect'
  | 'board';

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
  // Not on the pitch, so out of every choice: on the bench, taken off or sent off. `out` says
  // which (undefined while playing); `off` is kept as a plain flag because every choice reads it.
  off: boolean;
  out: 'bench' | 'subbed' | 'red' | undefined;
  // The bench seat (0 nearest the halfway line) of a substitute or a player taken off; -1 on
  // the pitch or sent off. A player coming on leaves their seat to the one going off.
  seat: number;
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
  // Where an action faces (a card at its player, a pointed arm), in radians; while it lasts the
  // official turns there instead of watching the ball.
  aim: number | undefined;
  // For the fourth official's board: the shirt numbers going off and on.
  board: [number, number] | undefined;
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
  // A substitution the person asks for (or calls off) this tick: `subCode` in scenes.ts, sent
  // for a few ticks like a button. Left out (or 0) the rest of the time.
  sub?: number;
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

// A substitution asked for and waiting for the next stoppage (the coach, scenes.ts).
export type SubRequest = { side: Side; out: number; on: number };

// A scene: what the bodies act out while play is stopped, run by scenes.ts. `t` counts its
// ticks. While `hold` is true the restart waits for it.
export type Scene =
  | {
      kind: 'foul';
      t: number;
      hold: boolean;
      offender: number;
      victim: number;
      card: 'yellow' | 'red' | undefined;
      penalty: boolean;
      // Where it happened.
      x: number;
      z: number;
      // The scene's tick when the referee showed the card or pointed the way; -1 before.
      shown: number;
      // Teammates of the victim who come to see to them, and of the offender who argue.
      helpers: number[];
      protesters: number[];
    }
  | { kind: 'offside'; t: number; hold: boolean; player: number; x: number; z: number }
  | {
      kind: 'goal';
      t: number;
      hold: boolean;
      side: Side;
      scorer: number;
      own: boolean;
      // Where the scorer runs to celebrate, and how.
      x: number;
      z: number;
      style: 'airplane' | 'kneeslide' | 'celebrate' | 'cheer';
      // The scene's tick when the scorer got there; -1 before.
      at: number;
    }
  | {
      kind: 'sub';
      t: number;
      hold: boolean;
      side: Side;
      out: number;
      on: number;
      // The point on the touchline where they swap.
      x: number;
      z: number;
      // The scene's tick when both reached it; -1 before.
      met: number;
    };

export type SceneKind = Scene['kind'];

// Moments worth showing again, as football on TV does once the ball is dead (replay.ts): a
// goal, a booking or a penalty, an offside, a save the ball went out from, a shot off the post
// or just wide.
export type ReplayKind = 'goal' | 'penalty' | 'foul' | 'offside' | 'save' | 'chance';

// A moment noted as it happens, waiting for the ball to be dead.
export type Highlight = {
  kind: ReplayKind;
  // The tick it happened, and the first tick the ball was dead after it (-1 while in play).
  at: number;
  dead: number;
  // Whose moment it is (the scorer, the offender, the player caught offside, the keeper, the
  // shooter; -1 when nobody's), and where (the ball, or the foul's spot).
  who: number;
  x: number;
  z: number;
  // The earliest tick a replay may show: the ticks of an earlier replay were the match
  // standing still.
  floor: number;
};

// A replay on screen. The match stands still while it plays, and every computer shows the same
// one: `t` counts its ticks up to `length`; it ends sooner once every side with people has
// pressed to skip it.
export type Replay = Highlight & { t: number; length: number; skip: [boolean, boolean] };

// The video referee (var.ts): online, the people watching can ask for a decision to be
// reviewed and vote on it while everyone watches it again.
//
// A decision that can still be reviewed, until play goes on: a goal, a foul (a free kick or a
// penalty, with its card) or an offside. `floor` is a replay's, for the same reason.
export type VarIncident =
  | { kind: 'goal'; at: number; floor: number; side: Side; scorer: number; x: number; z: number }
  | {
      kind: 'foul';
      at: number;
      floor: number;
      penalty: boolean;
      offender: number;
      victim: number;
      card: 'yellow' | 'red' | undefined;
      secondYellow: boolean;
      x: number;
      z: number;
      // The offender's side before a red, to give a rescinded one back: each player's role and
      // place in the formation (a keeper sent off hands the gloves on), where the offender
      // stood, and the substitutions made by then (after one, a red can't be undone).
      roles: [number, Role, number, number][];
      ox: number;
      oz: number;
      subs: number;
    }
  | { kind: 'offside'; at: number; floor: number; player: number; x: number; z: number };

// What the vote can decide. A goal stands or is ruled out (offside, or a foul in the build-up);
// a foul is no foul, a foul without a card, a yellow or a red; an offside stands or was onside.
export type VarChoice =
  | 'goal'
  | 'nogoal_offside'
  | 'nogoal_foul'
  | 'nofoul'
  | 'foul'
  | 'yellow'
  | 'red'
  | 'offside'
  | 'onside';

export type VarReview = {
  incident: VarIncident;
  options: VarChoice[];
  // The referee's own call among the options: it stands on a tie or with no votes.
  called: number;
  votes: number[];
  // How many people were watching when it was asked for: once they have all voted (and the
  // moment has played once), the vote closes early.
  voters: number;
  t: number;
  // The replay's length in ticks, shown on a loop while the vote is open.
  watch: number;
  // The option chosen (-1 while the vote is open), and how long it has been on screen.
  verdict: number;
  shown: number;
};

// What reaches the match from outside the people's inputs, stamped by the API on a tick every
// copy steps with it: a review asked for (with the number of people watching), and a vote.
export type Order = { kind: 'var'; voters: number } | { kind: 'vote'; choice: number };

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
  | { type: 'offside'; player: number }
  | { type: 'sub'; side: Side; out: number; on: number }
  | { type: 'scene'; kind: SceneKind; stage: 'start' | 'end' }
  | { type: 'replay'; kind: ReplayKind; stage: 'start' | 'end' }
  | { type: 'var'; stage: 'review' }
  | { type: 'var'; stage: 'verdict'; choice: VarChoice; changed: boolean };

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
  // What is being acted out while play is stopped (scenes.ts).
  scene: Scene | undefined;
  // Substitutions waiting for a stoppage, and those made (shirt numbers, for the end screen).
  subQueue: SubRequest[];
  subs: { side: Side; out: number; on: number; minute: number }[];
  // The moment the next replay will show, the replay playing, and the tick the last one ended
  // (replay.ts).
  highlight: Highlight | undefined;
  replay: Replay | undefined;
  replayEnd: number;
  // The decision the video referee may still review, the review under way, and the decisions
  // reviewed (for the end screen).
  varIncident: VarIncident | undefined;
  varReview: VarReview | undefined;
  varLog: { minute: number; choice: VarChoice; changed: boolean }[];
  events: GameEvent[];
};
