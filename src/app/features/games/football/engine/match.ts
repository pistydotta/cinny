/* eslint-disable no-param-reassign */
import { datan2, dcos, dsin, dsqrt } from '../../horde/engine/dmath';
import {
  attackDir,
  clamp,
  dist,
  faceVector,
  goalX,
  inOwnBox,
  keeperOf,
  len,
  loft,
  passTo,
  pickReceiver,
  rand,
  release,
  shoot,
  teammates,
} from './actions';
import { Move, chaserOf, cpuCarrier, cpuTackle, keeper, offBall, press, toward } from './ai';
import {
  ACCEL,
  AIR_DRAG,
  BALL_RADIUS,
  BOX_DEPTH,
  BENCH,
  BOX_HALF_WIDTH,
  CHARGE_FULL,
  CHARGE_MAX,
  CIRCLE_RADIUS,
  CPU,
  DIVE_REACH,
  DIVE_TICKS,
  DRIBBLE_GAP,
  DT,
  FALL_TICKS,
  FIRST_TOUCH_TURN,
  FORMATION,
  FREEKICK_RANGE,
  GOAL_DEPTH,
  GOAL_HALF_WIDTH,
  GOAL_HEIGHT,
  GOAL_WAIT,
  GRAVITY,
  HALFTIME_WAIT,
  HALF_LENGTH,
  HALF_SECONDS,
  HALF_WIDTH,
  HEAD_MAX,
  HEAD_MIN,
  INCOMING,
  JOG,
  KEEPER_MAX_HOLD,
  KEEPER_REACH,
  MATCH_SECONDS,
  PENALTY_SPOT,
  POST_RADIUS,
  QUEUE_TICKS,
  REACH,
  RECEIVE_RUN,
  RECEIVE_SIDE,
  RECEIVE_HARD,
  RECEIVE_REACH,
  RESTART_PATIENCE,
  RESTART_WAIT,
  ROLL_FIXED,
  ROLL_PER_SPEED,
  SLIDE_SPEED,
  SLIDE_TICKS,
  SPRINT,
  STUMBLE_TICKS,
  TACKLE_RANGE,
  THROW_TICKS,
  TICK_RATE,
  TURN_RATE,
  TURN_RATE_BALL,
  WALK,
  WALL_DISTANCE,
  WITH_BALL,
} from './data';
import {
  FoulKind,
  RestartFor,
  foul,
  judgeSlide,
  judgeStand,
  moveOfficials,
  newOfficials,
  touch,
} from './referee';
import {
  fullTime,
  moveOffPitch,
  sceneHolds,
  sceneMove,
  seatSpot,
  signalRestart,
  startGoal,
  stepScene,
  subFromInput,
} from './scenes';
import { teamById } from './teams';
import {
  Ball,
  Input,
  MatchSetup,
  MatchState,
  NO_INPUT,
  Person,
  Player,
  RestartKind,
  Side,
} from './types';

// The rules of a match. `step` moves everything one tick (1/60 s) with one input per person
// (setup.slots) and is the only thing that changes a MatchState. It is deterministic: the
// same setup and the same inputs always give the same match, which online play relies on.
//
// Each person controls one player at a time; the rest of their team, and any side nobody
// plays, is the CPU. Fouls, cards and offside are judged in referee.ts; what everyone acts out
// while play is stopped (and substitutions) is scenes.ts.

const PITCH_MARGIN = 4;

const newPlayer = (
  m: { rng: number },
  side: Side,
  slot: { num: number; role: Player['role']; x: number; z: number },
  rating: number,
  look: number
): Player => {
  const base = (rating - 55) / 40;
  // Every player is a little different from the team's level, from the match's seed.
  const spread = (k: number) => clamp(base + (((look * 7919 + k) % 100) / 100 - 0.5) * 0.16, 0, 1);
  return {
    side,
    num: slot.num,
    role: slot.role,
    homeX: slot.x,
    homeZ: slot.z,
    x: 0,
    z: 0,
    vx: 0,
    vz: 0,
    face: side === 0 ? 0 : Math.PI,
    action: 'none',
    busy: 0,
    actX: 0,
    actZ: 0,
    noTouch: 0,
    pace: spread(1),
    skill: spread(2),
    look: (look + m.rng) % 997,
    yellow: 0,
    off: false,
    out: undefined,
    seat: -1,
  };
};

const newBall = (): Ball => ({
  x: 0,
  y: BALL_RADIUS,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  owner: -1,
  lastSide: 0,
  lastPlayer: -1,
  shot: false,
  target: -1,
  held: 0,
  credit: -1,
  from: -1,
  offside: [],
});

const newPerson = (control: number): Person => ({
  control,
  charge: 0,
  chargeKind: undefined,
  prev: NO_INPUT,
  queued: undefined,
  preview: -1,
});

export const sideHasPeople = (m: MatchState, side: Side): boolean => m.setup.slots.includes(side);

// For each player, the person (slot) controlling them, or -1.
const controllers = (m: MatchState): number[] => {
  const by = m.players.map(() => -1);
  m.people.forEach((person, s) => {
    by[person.control] = s;
  });
  return by;
};

const slotsOf = (m: MatchState, side: Side): number[] =>
  m.setup.slots.flatMap((s, k) => (s === side ? [k] : []));

// The person of `side` whose player is nearest to (x, z).
const nearestSlot = (m: MatchState, side: Side, x: number, z: number): number => {
  let best = -1;
  let bestD = Infinity;
  slotsOf(m, side).forEach((s) => {
    const d = dist(m.players[m.people[s].control], { x, z });
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  });
  return best;
};

// Gives player i to person s; whoever had i takes s's old player.
const giveControl = (m: MatchState, s: number, i: number) => {
  const other = m.people.findIndex((p, k) => k !== s && p.control === i);
  if (other >= 0) m.people[other].control = m.people[s].control;
  m.people[s].control = i;
};

// Pushes players of `side` out of a circle around (x, z).
const clearCircle = (m: MatchState, side: Side, x: number, z: number, r: number) => {
  m.players.forEach((p) => {
    if (p.side !== side || p.off) return;
    const d = len(p.x - x, p.z - z);
    if (d >= r) return;
    const k = d > 0.01 ? r / d : 1;
    p.x = x + (p.x - x) * k + (d > 0.01 ? 0 : r);
    p.z = z + (p.z - z) * k;
  });
};

// A restart: the ball on its spot, the taker beside it and everyone else sent toward their
// places. Kick-offs put both teams back in their halves; free kicks push the other team back
// 9.15 m and, near goal, build a wall; penalties clear the box.
const setRestart = (m: MatchState, kind: RestartKind, side: Side, x: number, z: number) => {
  const { ball } = m;
  const f = attackDir(m, side);
  let bx = x;
  if (kind === 'penalty') bx = goalX(m, side) - f * PENALTY_SPOT;
  Object.assign(ball, newBall(), { x: bx, z: kind === 'penalty' ? 0 : z, lastSide: side });
  let taker: number;
  if (kind === 'kickoff') {
    m.players.forEach((p) => {
      if (p.off) return;
      const pf = attackDir(m, p.side);
      let px = Math.min(p.homeX * 0.92 - 1, -1);
      const pz = p.homeZ;
      // The other team stays outside the centre circle.
      if (p.side !== side && len(px, pz) < CIRCLE_RADIUS + 0.5) px = -(CIRCLE_RADIUS + 1);
      Object.assign(p, { x: px * pf, z: pz, vx: 0, vz: 0, face: pf > 0 ? 0 : Math.PI });
      Object.assign(p, { action: 'none', busy: 0, noTouch: 0 });
      if (p.side === side && p.num === 10) Object.assign(p, { x: -3 * f, z: -4 });
    });
    const nine = teammates(m, side).find((i) => m.players[i].num === 9);
    taker = nine ?? teammates(m, side).filter((i) => m.players[i].role !== 'gk')[0];
  } else if (kind === 'goalkick') {
    taker = keeperOf(m, side);
  } else if (kind === 'penalty') {
    taker = teammates(m, side)
      .filter((i) => m.players[i].role !== 'gk')
      .reduce((a, b) => (m.players[a].skill >= m.players[b].skill ? a : b));
  } else {
    // Not someone lying hurt (a foul's victim), unless nobody else can.
    const outfield = teammates(m, side).filter((i) => m.players[i].role !== 'gk');
    const standing = outfield.filter((i) => m.players[i].action !== 'down');
    taker = (standing.length ? standing : outfield).reduce((a, b) =>
      dist(m.players[a], ball) <= dist(m.players[b], ball) ? a : b
    );
  }
  const t = m.players[taker];
  // The taker stands behind the ball, facing into the pitch (or at goal).
  let a: number;
  if (kind === 'throw') a = datan2(-Math.sign(z), 0);
  else if (kind === 'corner') a = datan2(-Math.sign(z) * 0.6, -Math.sign(bx) || f);
  else if (kind === 'freekick' || kind === 'penalty') a = datan2(-ball.z, goalX(m, side) - ball.x);
  else a = datan2(0, f);
  Object.assign(t, {
    x: ball.x - dcos(a) * 0.6,
    z: ball.z - dsin(a) * 0.6,
    vx: 0,
    vz: 0,
    face: a,
    action: 'none',
    busy: 0,
  });
  if (kind === 'throw') ball.y = 1.9;

  const other = (1 - side) as Side;
  if (kind === 'freekick' || kind === 'corner')
    clearCircle(m, other, ball.x, ball.z, WALL_DISTANCE);
  if (kind === 'freekick' && len(goalX(m, side) - ball.x, ball.z) < FREEKICK_RANGE) {
    // A wall of three on the line from the ball to the goal.
    const gx = goalX(m, side);
    const d = len(gx - ball.x, -ball.z) || 1;
    const ux = (gx - ball.x) / d;
    const uz = -ball.z / d;
    teammates(m, other)
      .filter((i) => m.players[i].role !== 'gk')
      .sort((i, j) => dist(m.players[i], ball) - dist(m.players[j], ball))
      .slice(0, 3)
      .forEach((i, k) => {
        const p = m.players[i];
        Object.assign(p, {
          x: ball.x + ux * WALL_DISTANCE - uz * (k - 1) * 0.75,
          z: ball.z + uz * WALL_DISTANCE + ux * (k - 1) * 0.75,
          vx: 0,
          vz: 0,
          face: a + Math.PI,
        });
      });
  }
  if (kind === 'penalty') {
    // Everyone but the taker and the keeper out of the box, behind the ball.
    const gx = goalX(m, side);
    m.players.forEach((p, i) => {
      if (p.off || i === taker) return;
      if (p.role === 'gk' && p.side === other) {
        Object.assign(p, { x: gx - f * 0.3, z: 0, vx: 0, vz: 0, face: a + Math.PI });
        return;
      }
      if (Math.abs(p.x - gx) < BOX_DEPTH + 1 && Math.abs(p.z) < BOX_HALF_WIDTH + 1)
        Object.assign(p, { x: gx - f * (BOX_DEPTH + 2), vx: 0, vz: 0 });
    });
  }
  m.restart = { kind, side, x: ball.x, z: ball.z, taker };
  m.phase = 'restart';
  m.wait = RESTART_WAIT[kind];
  m.people.forEach((person) => {
    person.charge = 0;
    person.chargeKind = undefined;
    person.queued = undefined;
  });
  m.events.push({ type: 'out', kind });
  signalRestart(m, kind, side, x, z);
};

// The referee's restarts. The decision's scene (scenes.ts) holds them while it plays.
const restartFor: RestartFor = (m, kind, side, x, z) => setRestart(m, kind, side, x, z);

// Which players people start on: the forwards first, then midfield.
const START_ORDER = [9, 10, 8, 7, 11, 5, 6, 2, 3, 4];

export const createMatch = (setup: MatchSetup): MatchState => {
  const m: MatchState = {
    setup,
    rng: Math.abs(Math.floor(setup.seed)) % 4294967296,
    tick: 0,
    clock: 0,
    half: 1,
    score: [0, 0],
    phase: 'restart',
    wait: 0,
    restart: undefined,
    call: undefined,
    players: [],
    officials: newOfficials(),
    ball: newBall(),
    people: [],
    think: [0, 0],
    aim: [0, Math.PI],
    scorers: [],
    cards: [],
    scene: undefined,
    subQueue: [],
    subs: [],
    events: [],
  };
  ([0, 1] as Side[]).forEach((side) => {
    const team = teamById(setup.teams[side]);
    FORMATION.forEach((slot, k) =>
      m.players.push(newPlayer(m, side, slot, team.rating, k * 31 + side * 500))
    );
  });
  // The benches come after the 22, so a player's index on the pitch never changes. Each
  // substitute sits in their seat, a little below the team's level.
  ([0, 1] as Side[]).forEach((side) => {
    const team = teamById(setup.teams[side]);
    BENCH.forEach((slot, k) => {
      const p = newPlayer(
        m,
        side,
        { ...slot, x: -40, z: 0 },
        team.rating - 3,
        k * 37 + side * 700 + 11
      );
      Object.assign(p, seatSpot(side, k), { off: true, out: 'bench', seat: k, action: 'sit' });
      p.face = Math.PI / 2;
      m.players.push(p);
    });
  });
  const taken: [number, number] = [0, 0];
  m.people = setup.slots.map((side) => {
    const num = START_ORDER[taken[side] % START_ORDER.length];
    taken[side] += 1;
    return newPerson(m.players.findIndex((p) => p.side === side && p.num === num));
  });
  setRestart(m, 'kickoff', 0, 0, 0);
  m.events = [{ type: 'whistle', kind: 'start' }];
  return m;
};

// What a person's input holds from one tick to the next (`prev`): the stick and buttons, in one
// order, without a substitution, so every copy of a match writes it the same.
const buttons = (i: Input): Input => ({
  mx: i.mx,
  mz: i.mz,
  sprint: i.sprint,
  pass: i.pass,
  shoot: i.shoot,
  through: i.through,
  lob: i.lob,
});

const pressed = (now: Input, before: Input, key: 'pass' | 'shoot' | 'through' | 'lob') =>
  now[key] && !before[key];

// The direction a person points, or undefined when the stick is centred.
const stick = (input: Input): [number, number] | undefined => {
  const l = len(input.mx, input.mz);
  return l < 20 ? undefined : [input.mx / l, input.mz / l];
};

const speedOf = (p: Player, sprint: boolean, withBall: boolean) => {
  const [base, extra] = sprint ? SPRINT : JOG;
  return (base + extra * p.pace) * (withBall ? WITH_BALL : 1);
};

const callFoul = (m: MatchState, offender: number, victim: number, kind: FoulKind) =>
  foul(m, offender, victim, kind, restartFor);

// A standing tackle: wins the ball, or leaves the tackler stumbling (and now and then the
// referee calls it a foul).
const standingTackle = (m: MatchState, i: number, nudge: number, range = 1.5) => {
  const p = m.players[i];
  const { ball } = m;
  if (ball.owner < 0 || p.busy > 0) return;
  const c = m.players[ball.owner];
  if (c.side === p.side || dist(p, c) > range || (c.role === 'gk' && inOwnBox(m, c.side, c.x, c.z)))
    return;
  const chance = clamp(0.5 + (p.skill - c.skill) * 0.5 + nudge, 0.15, 0.85);
  const won = rand(m) < chance;
  m.events.push({ type: 'tackle', player: i, won });
  if (won) {
    const loser = ball.owner;
    ball.owner = -1;
    const [fx, fz] = faceVector(p);
    ball.vx = fx * 3 + p.vx * 0.5;
    ball.vz = fz * 3 + p.vz * 0.5;
    ball.lastSide = p.side;
    ball.lastPlayer = i;
    ball.offside = [];
    m.players[loser].noTouch = 30;
    return;
  }
  p.busy = STUMBLE_TICKS;
  p.action = 'fall';
  p.noTouch = 30;
  const kind = dist(p, c) < 1.2 ? judgeStand(m) : undefined;
  if (kind) callFoul(m, i, ball.owner, kind);
};

const startSlide = (m: MatchState, i: number, dx: number, dz: number) => {
  const p = m.players[i];
  if (p.busy > 0) return;
  const l = len(dx, dz) || 1;
  p.action = 'slide';
  p.busy = SLIDE_TICKS;
  p.actX = dx / l;
  p.actZ = dz / l;
  p.face = datan2(p.actZ, p.actX);
};

// What a person's buttons do this tick. With the ball (or with it on its way: a first-time pass
// or shot), pass and through ball are played on the press, shoot and lob charge while held and
// go on release. Without it, pass switches player, shoot slides in and through tackles (holding
// it presses, in step).
const personActs = (m: MatchState, s: number, input: Input, taken: number[]): void => {
  const person = m.people[s];
  const side = m.setup.slots[s];
  const before = person.prev;
  const i = person.control;
  const p = m.players[i];
  const { ball } = m;
  const dir = stick(input);
  const [dx, dz] = dir ?? faceVector(p);
  const mine = ball.owner === i;
  const incoming = ball.owner < 0 && (ball.target === i || dist(p, ball) < INCOMING);
  person.preview = -1;

  if ((mine || incoming) && p.busy === 0) {
    const aim = { mx: input.mx, mz: input.mz, until: m.tick + QUEUE_TICKS };
    if (pressed(input, before, 'pass')) person.queued = { key: 'pass', ...aim };
    else if (pressed(input, before, 'through')) person.queued = { key: 'through', ...aim };
    (['shoot', 'lob'] as const).forEach((key) => {
      if (person.charge === 0 && pressed(input, before, key)) {
        person.charge = 1;
        person.chargeKind = key;
      }
    });
    const kind = person.chargeKind;
    if (kind && input[kind] && person.charge < CHARGE_MAX) person.charge += 1;
    if (!mine) return;

    const { queued } = person;
    person.queued = undefined;
    if (queued && queued.until >= m.tick) {
      person.charge = 0;
      person.chargeKind = undefined;
      const through = queued.key === 'through';
      const [qx, qz] = dir ?? stick({ ...input, mx: queued.mx, mz: queued.mz }) ?? [dx, dz];
      const j = pickReceiver(m, i, qx, qz, through ? 50 : 45);
      const speed = through ? 17 : 13;
      if (j >= 0) passTo(m, i, j, through ? 7 : 0);
      else release(m, i, qx * speed, 0.3, qz * speed);
      return;
    }
    if (kind && (!input[kind] || person.charge >= CHARGE_MAX)) {
      const power = Math.min(1, person.charge / CHARGE_FULL);
      if (kind === 'shoot') {
        // The stick's part across the pitch picks the spot between the posts.
        shoot(m, i, dir ? clamp(dir[1] * 1.2, -1, 1) : (rand(m) - 0.5) * 0.8, power);
      } else {
        const j = pickReceiver(m, i, dx, dz, 60);
        const a = j >= 0 ? datan2(m.players[j].z - p.z, m.players[j].x - p.x) : datan2(dz, dx);
        const d = j >= 0 ? dist(p, m.players[j]) : 18 + power * 30;
        loft(m, i, a, d, j);
      }
      person.charge = 0;
      person.chargeKind = undefined;
      return;
    }
    // A keeper can't hold the ball for ever: it goes long.
    if (p.role === 'gk' && ball.held > KEEPER_MAX_HOLD) {
      loft(m, i, datan2(0, attackDir(m, side)), 40);
      return;
    }
    person.preview = pickReceiver(m, i, dx, dz);
    return;
  }

  person.charge = 0;
  person.chargeKind = undefined;
  person.queued = undefined;
  if (ball.owner >= 0 && m.players[ball.owner].side === side) return;

  if (pressed(input, before, 'pass')) {
    // The nearest teammate to the ball nobody else is playing.
    const next = chaserOf(m, side, [i, ...taken]);
    if (next >= 0) person.control = next;
  } else if (pressed(input, before, 'shoot')) {
    startSlide(m, i, dx, dz);
  } else if (pressed(input, before, 'through')) {
    standingTackle(m, i, 0, TACKLE_RANGE);
  }
};

// Free kicks and penalties: does the CPU (or a person who didn't choose) shoot from here.
const shootingRange = (m: MatchState, side: Side, x: number, z: number) =>
  len(goalX(m, side) - x, z) < FREEKICK_RANGE && Math.abs(z) < 22;

// The keeper picks a side before a penalty is struck: left, the middle or right.
const keeperGuess = (m: MatchState, side: Side) => {
  const k = m.players[keeperOf(m, side)];
  const r = rand(m);
  let z = 0;
  if (r < 0.4) z = -2.6;
  else if (r < 0.8) z = 2.6;
  if (z !== 0) {
    k.action = 'dive';
    k.busy = DIVE_TICKS;
    k.actX = 0;
    k.actZ = Math.sign(z);
    k.vz = Math.sign(z) * 6.5;
  }
};

// Taking a restart: the person picks pass, lob, a cross, or (free kick, penalty) holds shoot
// for a shot; the CPU picks after the wait. The ball goes in and play is back on.
const takeRestart = (m: MatchState, inputs: Input[], by: number[]) => {
  const r = m.restart;
  if (!r) return;
  const i = r.taker;
  const p = m.players[i];
  const s = by[i];
  const f = attackDir(m, r.side);
  const shotKind = r.kind === 'freekick' || r.kind === 'penalty';
  let go: 'pass' | 'lob' | 'cross' | 'shot' | undefined;
  let power = 0.7;
  let aim = (rand(m) < 0.5 ? -1 : 1) * (0.5 + rand(m) * 0.45);
  if (s >= 0) {
    const person = m.people[s];
    const input = inputs[s] ?? NO_INPUT;
    const before = person.prev;
    const dir = stick(input);
    if (dir && r.kind !== 'penalty') p.face = datan2(dir[1], dir[0]);
    if (pressed(input, before, 'pass') || pressed(input, before, 'through')) r.queued = 'pass';
    else if (pressed(input, before, 'lob')) r.queued = 'lob';
    else if (pressed(input, before, 'shoot')) {
      if (shotKind) {
        person.charge = 1;
        person.chargeKind = 'shoot';
      } else r.queued = r.kind === 'corner' ? 'cross' : 'lob';
    }
    if (person.chargeKind === 'shoot') {
      if (input.shoot && person.charge < CHARGE_MAX) person.charge += 1;
      else r.queued = 'shot';
    }
    if (m.wait > 0 || sceneHolds(m)) return;
    go = r.queued;
    if (go === 'shot') {
      power = Math.min(1, person.charge / CHARGE_FULL);
      aim = dir ? clamp(dir[1] * 1.2, -1, 1) : (rand(m) - 0.5) * 0.6;
      person.charge = 0;
      person.chargeKind = undefined;
    }
    if (!go && m.wait < -RESTART_PATIENCE) {
      if (r.kind === 'penalty') go = 'shot';
      else go = r.kind === 'corner' ? 'cross' : 'pass';
    }
  } else {
    if (m.wait > 0 || sceneHolds(m)) return;
    go = 'pass';
    if (r.kind === 'corner') go = 'cross';
    else if (r.kind === 'goalkick') go = 'lob';
    else if (r.kind === 'penalty') go = 'shot';
    else if (r.kind === 'freekick' && shootingRange(m, r.side, r.x, r.z)) go = 'shot';
    if (r.kind === 'throw' && rand(m) < 0.3) go = 'lob';
    power = 0.55 + rand(m) * 0.3;
  }
  if (!go) return;

  const anim = r.kind === 'throw' ? 'throw' : 'kick';
  const busy = r.kind === 'throw' ? THROW_TICKS : undefined;
  const [fx, fz] = faceVector(p);
  m.ball.owner = -1;
  if (go === 'shot') {
    if (r.kind === 'penalty') keeperGuess(m, (1 - r.side) as Side);
    shoot(m, i, aim, power);
  } else if (go === 'cross') {
    const gx = goalX(m, r.side);
    const tx = gx - f * (7 + rand(m) * 6);
    const tz = (rand(m) - 0.5) * 12;
    loft(m, i, datan2(tz - p.z, tx - p.x), len(tx - p.x, tz - p.z));
  } else {
    let j = s >= 0 ? pickReceiver(m, i, fx, fz, r.kind === 'throw' ? 25 : 60) : -1;
    if (j < 0) {
      const options = teammates(m, r.side).filter((k) => {
        const q = m.players[k];
        const d = dist(q, p);
        if (k === i || q.role === 'gk' || d < 4) return false;
        if (r.kind === 'throw') return d < 22;
        if (r.kind === 'kickoff') return d < 16;
        return go === 'lob' ? d > 20 : d < 30;
      });
      j = options.length ? options[Math.floor(rand(m) * options.length)] : -1;
    }
    if (j < 0) loft(m, i, datan2(fz, fx), 25);
    else if (go === 'lob' || r.kind === 'throw') {
      const q = m.players[j];
      loft(m, i, datan2(q.z - p.z, q.x - p.x), Math.max(6, dist(p, q)), j);
    } else passTo(m, i, j);
  }
  // No offside from a throw-in, a goal kick or a corner.
  if (r.kind === 'throw' || r.kind === 'goalkick' || r.kind === 'corner') m.ball.offside = [];
  m.players[i].action = anim;
  if (busy) m.players[i].busy = busy;
  // A ball thrown or kicked must be touched by someone else first.
  m.players[i].noTouch = 20;
  m.phase = 'play';
  m.restart = undefined;
  m.call = undefined;
  m.events.push({ type: 'whistle', kind: 'restart' });
};

// Moves a player toward the velocity it wants, turning its body to where it runs.
const movePlayer = (p: Player, want: Move, withBall: boolean) => {
  const speed = want.walk ? WALK : speedOf(p, want.sprint, withBall);
  const tvx = want.x * speed;
  const tvz = want.z * speed;
  const dvx = tvx - p.vx;
  const dvz = tvz - p.vz;
  const dv = len(dvx, dvz);
  const stepSize = ACCEL * DT;
  if (dv <= stepSize) {
    p.vx = tvx;
    p.vz = tvz;
  } else {
    p.vx += (dvx / dv) * stepSize;
    p.vz += (dvz / dv) * stepSize;
  }
  const v = len(p.vx, p.vz);
  if (v > 0.6) {
    const target = datan2(p.vz, p.vx);
    let diff = target - p.face;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    const turn = (withBall ? TURN_RATE_BALL : TURN_RATE) * DT;
    p.face += clamp(diff, -turn, turn);
  }
};

// Turns a standing body toward an angle at the usual turning rate.
const turnTo = (p: Player, face: number) => {
  let diff = face - p.face;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  const turn = TURN_RATE * DT;
  p.face += clamp(diff, -turn, turn);
};

// Bodies busy with a move: slides and dives carry on, the rest slow to a stop.
const moveBusy = (p: Player) => {
  if (p.action === 'slide') {
    const left = p.busy / SLIDE_TICKS;
    const s = SLIDE_SPEED * Math.min(1, left * 1.6);
    p.vx = p.actX * s;
    p.vz = p.actZ * s;
  } else if (p.action === 'dive') {
    p.vx *= 0.94;
    p.vz *= 0.94;
  } else if (p.action === 'kneeslide') {
    // A scorer on the knees glides on.
    p.vx *= 0.965;
    p.vz *= 0.965;
  } else {
    p.vx *= 0.85;
    p.vz *= 0.85;
  }
};

const goalScored = (m: MatchState, scoringSide: Side) => {
  const { ball } = m;
  let scorer = ball.lastPlayer;
  let own = scorer >= 0 && m.players[scorer].side !== scoringSide;
  // Saved or deflected in: the goal is the kicker's, not an own goal.
  if (own && ball.credit >= 0 && m.players[ball.credit].side === scoringSide) {
    scorer = ball.credit;
    own = false;
  }
  const lastP = scorer >= 0 ? m.players[scorer] : undefined;
  m.score[scoringSide] += 1;
  m.scorers.push({
    side: scoringSide,
    num: lastP?.num ?? 0,
    minute: Math.min(90, Math.floor(m.clock / 60) + 1),
    own,
  });
  m.events.push({ type: 'goal', side: scoringSide, scorer, own });
  m.phase = 'goal';
  m.wait = GOAL_WAIT;
  ball.owner = -1;
  ball.shot = false;
  ball.offside = [];
  startGoal(m, scoringSide, scorer, own);
};

// The ball flies, bounces and rolls; at the edges it scores, hits a post or goes out.
const moveBall = (m: MatchState) => {
  const { ball } = m;
  if (ball.owner >= 0) {
    const p = m.players[ball.owner];
    const [fx, fz] = faceVector(p);
    ball.x = p.x + fx * DRIBBLE_GAP;
    ball.z = p.z + fz * DRIBBLE_GAP;
    ball.y = p.role === 'gk' && inOwnBox(m, p.side, p.x, p.z) ? 1.1 : BALL_RADIUS;
    ball.vx = p.vx;
    ball.vz = p.vz;
    ball.vy = 0;
    ball.held += 1;
    return;
  }
  const speed = len(ball.vx, ball.vz);
  const airborne = ball.y > BALL_RADIUS + 0.001 || ball.vy > 0;
  if (airborne) {
    ball.vy -= GRAVITY * DT;
    const drag = 1 - AIR_DRAG * len(speed, ball.vy) * DT;
    ball.vx *= drag;
    ball.vz *= drag;
    ball.vy *= drag;
  } else if (speed > 0) {
    const next = Math.max(0, speed - (ROLL_FIXED + ROLL_PER_SPEED * speed) * DT);
    ball.vx *= next / speed;
    ball.vz *= next / speed;
  }
  const px = ball.x;
  ball.x += ball.vx * DT;
  ball.y += ball.vy * DT;
  ball.z += ball.vz * DT;
  if (ball.y < BALL_RADIUS) {
    ball.y = BALL_RADIUS;
    if (ball.vy < -1.8) {
      ball.vy = -ball.vy * 0.5;
      ball.vx *= 0.88;
      ball.vz *= 0.88;
    } else ball.vy = 0;
  }

  if (m.phase === 'goal') {
    // Inside the net: it stops the ball.
    const back = HALF_LENGTH + GOAL_DEPTH;
    if (Math.abs(ball.x) > back) {
      ball.x = Math.sign(ball.x) * back;
      ball.vx *= -0.15;
      ball.vz *= 0.4;
    }
    if (Math.abs(ball.x) > HALF_LENGTH && Math.abs(ball.z) > GOAL_HALF_WIDTH) {
      ball.z = Math.sign(ball.z) * GOAL_HALF_WIDTH;
      ball.vz *= -0.2;
    }
    if (Math.abs(ball.x) > HALF_LENGTH && ball.y > GOAL_HEIGHT) {
      ball.y = GOAL_HEIGHT;
      ball.vy = 0;
    }
    return;
  }
  if (m.phase !== 'play') return;

  // Crossing a goal line.
  if (Math.abs(ball.x) >= HALF_LENGTH && Math.abs(px) < HALF_LENGTH) {
    const end = Math.sign(ball.x);
    const az = Math.abs(ball.z);
    const postHit =
      Math.abs(az - GOAL_HALF_WIDTH) < POST_RADIUS + BALL_RADIUS && ball.y < GOAL_HEIGHT + 0.1;
    const barHit = az < GOAL_HALF_WIDTH && Math.abs(ball.y - GOAL_HEIGHT) < BALL_RADIUS + 0.06;
    if (postHit || barHit) {
      m.events.push({ type: 'post' });
      ball.x = end * (HALF_LENGTH - 0.05);
      ball.vx = -ball.vx * 0.55;
      if (postHit) ball.vz = -Math.sign(ball.z) * Math.abs(ball.vz * 0.4) + (rand(m) - 0.5) * 3;
      else ball.vy = -Math.abs(ball.vy) * 0.5;
      ball.shot = false;
      return;
    }
    if (az < GOAL_HALF_WIDTH && ball.y < GOAL_HEIGHT) {
      // Side 0 attacks +x in the first half.
      const scorer: Side = end === attackDir(m, 0) ? 0 : 1;
      goalScored(m, scorer);
      return;
    }
  }
  if (Math.abs(ball.x) > HALF_LENGTH + BALL_RADIUS) {
    const end = Math.sign(ball.x);
    // The side defending this end, and whether it touched the ball last.
    const defending: Side = attackDir(m, 0) === end ? 1 : 0;
    const z = Math.sign(ball.z) || 1;
    if (ball.lastSide === defending)
      setRestart(
        m,
        'corner',
        (1 - defending) as Side,
        end * (HALF_LENGTH - 0.3),
        z * (HALF_WIDTH - 0.3)
      );
    else setRestart(m, 'goalkick', defending, end * (HALF_LENGTH - 5.5), z * 4);
    return;
  }
  if (Math.abs(ball.z) > HALF_WIDTH + BALL_RADIUS) {
    const x = clamp(ball.x, -HALF_LENGTH + 1, HALF_LENGTH - 1);
    setRestart(m, 'throw', (1 - ball.lastSide) as Side, x, Math.sign(ball.z) * HALF_WIDTH);
  }
};

// Someone takes the ball. A person's receiver gets the first touch they steer: the body turns
// part of the way toward where they point, so the ball sits ready to go there. A carrier no
// person plays goes to the person who passed to them, or the nearest one on that side.
const gainBall = (m: MatchState, i: number, inputs: Input[]) => {
  const { ball } = m;
  const p = m.players[i];
  const passer = ball.credit;
  ball.from = passer >= 0 && m.players[passer].side === p.side && passer !== i ? passer : -1;
  ball.owner = i;
  ball.lastSide = p.side;
  ball.lastPlayer = i;
  ball.shot = false;
  ball.target = -1;
  ball.held = 0;
  ball.credit = i;
  ball.vy = 0;
  m.think[p.side] = 0;
  if (!sideHasPeople(m, p.side)) return;
  let s = m.people.findIndex((person) => person.control === i);
  if (s < 0) {
    s = nearestSlot(m, p.side, p.x, p.z);
    if (s >= 0) giveControl(m, s, i);
  }
  const dir = s >= 0 ? stick(inputs[s] ?? NO_INPUT) : undefined;
  if (dir) {
    let diff = datan2(dir[1], dir[0]) - p.face;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    p.face += clamp(diff, -FIRST_TOUCH_TURN, FIRST_TOUCH_TURN);
  }
};

// A sliding player meeting the ball, or the body of the player on it (a slide from behind
// meets the legs first). Returns true when the referee called it a foul.
const slideContact = (m: MatchState, i: number): boolean => {
  const { ball } = m;
  const p = m.players[i];
  if (m.phase !== 'play') return false;
  if (p.off || p.action !== 'slide' || p.busy < 6 || p.busy > SLIDE_TICKS - 3) return false;
  const onCarrier = ball.owner >= 0 && dist(p, m.players[ball.owner]) < 1.0;
  if (ball.y > 0.6 || (dist(p, ball) > 1.2 && !onCarrier)) return false;
  if (ball.owner >= 0) {
    const carrier = ball.owner;
    const c = m.players[carrier];
    if (c.side === p.side) return false;
    const won = rand(m) < clamp(0.72 + (p.skill - c.skill) * 0.4, 0.3, 0.92);
    const offence = judgeSlide(m, i, carrier, won);
    m.events.push({ type: 'tackle', player: i, won });
    p.busy = Math.min(p.busy, 12);
    if (offence) {
      c.action = 'fall';
      c.busy = FALL_TICKS;
      callFoul(m, i, carrier, offence);
      return true;
    }
    if (!won) return false;
    c.noTouch = 30;
    if (rand(m) < 0.35) {
      c.action = 'fall';
      c.busy = FALL_TICKS;
    }
  }
  if (ball.owner >= 0 && m.players[ball.owner].side === p.side) return false;
  ball.owner = -1;
  ball.vx = p.actX * 6 + (rand(m) - 0.5) * 2;
  ball.vz = p.actZ * 6 + (rand(m) - 0.5) * 2;
  ball.vy = 0.5;
  ball.lastSide = p.side;
  ball.lastPlayer = i;
  ball.shot = false;
  ball.offside = [];
  p.noTouch = 10;
  return false;
};

// Who touches a loose ball: keepers save or catch, heads meet high balls, feet take the rest.
// A sliding player knocks the ball off a carrier, fairly or not. The player a pass is meant for
// reaches a little further and keeps harder balls more often.
const contacts = (m: MatchState, inputs: Input[]) => {
  const { ball } = m;
  if (m.phase !== 'play') return;

  // Slides: stop at the first that is called a foul.
  if (m.players.some((_, i) => slideContact(m, i))) return;

  if (ball.owner >= 0 || m.phase !== 'play') return;

  let best = -1;
  let bestD = Infinity;
  m.players.forEach((p, i) => {
    if (p.off || p.noTouch > 0 || p.action === 'fall' || p.action === 'celebrate') return;
    const keeperHands = p.role === 'gk' && inOwnBox(m, p.side, ball.x, ball.z);
    const diving = p.action === 'dive';
    let reach = ball.target === i ? RECEIVE_REACH : REACH;
    let top = HEAD_MAX;
    if (keeperHands) {
      reach = diving ? DIVE_REACH : KEEPER_REACH;
      top = diving ? 2.2 : 2.6;
    }
    if (ball.y > top) return;
    const d = dist(p, ball);
    if (d < reach && d < bestD) {
      bestD = d;
      best = i;
    }
  });
  if (best < 0) return;
  const p = m.players[best];
  const keeperHands = p.role === 'gk' && inOwnBox(m, p.side, ball.x, ball.z);
  const rel = len(ball.vx - p.vx, ball.vz - p.vz);

  if (keeperHands) {
    if (ball.shot || rel > 12) {
      const nudge = sideHasPeople(m, p.side) ? 0 : CPU[m.setup.difficulty].skill;
      const save = clamp(0.62 + p.skill * 0.3 - (rel - 18) * 0.025 + nudge, 0.2, 0.95);
      if (rand(m) > save) {
        p.noTouch = 30;
        return;
      }
      const caught = rel < 20 && rand(m) < 0.55 + p.skill * 0.3;
      m.events.push({ type: 'save', player: best, caught });
      if (!caught) {
        // Parried out wide.
        const away = -Math.sign(ball.vx);
        ball.vx = away * (3 + rand(m) * 4);
        ball.vz = (Math.sign(ball.z - p.z) || 1) * (4 + rand(m) * 5);
        ball.vy = 2 + rand(m) * 3;
        ball.shot = false;
        ball.lastSide = p.side;
        ball.lastPlayer = best;
        p.noTouch = 25;
        return;
      }
    }
    if (touch(m, best, restartFor)) return;
    gainBall(m, best, inputs);
    p.vx = 0;
    p.vz = 0;
    return;
  }

  if (touch(m, best, restartFor)) return;

  // A lofted pass meant for this player is brought down on the chest; other high balls are
  // headed.
  if (ball.y > HEAD_MIN && ball.target !== best) {
    // A header: at goal when near it, otherwise cleared forward.
    const f = attackDir(m, p.side);
    const gx = goalX(m, p.side);
    const toGoal = len(gx - p.x, -p.z);
    if (toGoal < 18 && rand(m) < 0.4 + p.skill * 0.4) {
      const tz = (rand(m) - 0.5) * 2 * (GOAL_HALF_WIDTH + 1);
      const a = datan2(tz - p.z, gx - p.x);
      const s = 11 + p.skill * 6;
      release(m, best, dcos(a) * s, -1 + rand(m) * 3, dsin(a) * s, { shot: true, busy: 6 });
    } else {
      const a = datan2(ball.z * -0.2 + (rand(m) - 0.5) * 10, f * 10);
      release(m, best, dcos(a) * 12, 4, dsin(a) * 12, { busy: 6 });
    }
    return;
  }

  // A hard ball can bounce off the feet instead of being taken.
  const meant = ball.target === best;
  const hard = meant ? RECEIVE_HARD : 15;
  const keep = (meant ? 0.65 : 0.35) + p.skill * (meant ? 0.3 : 0.4);
  if (rel > hard && rand(m) > keep) {
    ball.vx = -ball.vx * 0.25 + p.vx;
    ball.vz = -ball.vz * 0.25 + p.vz;
    ball.vy = 1.5;
    ball.lastSide = p.side;
    ball.lastPlayer = best;
    ball.shot = false;
    p.noTouch = 12;
    return;
  }
  gainBall(m, best, inputs);
};

// Keeps players from walking through each other.
const separate = (m: MatchState) => {
  const ps = m.players;
  for (let i = 0; i < ps.length; i += 1) {
    for (let j = i + 1; j < ps.length; j += 1) {
      const a = ps[i];
      const b = ps[j];
      if (!a.off && !b.off) {
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < 0.49 && d2 > 1e-6) {
          const d = len(dx, dz);
          const push = (0.7 - d) / 2;
          a.x -= (dx / d) * push;
          a.z -= (dz / d) * push;
          b.x += (dx / d) * push;
          b.z += (dz / d) * push;
        }
      }
    }
  }
};

// Who each person controls. The carrier and a restart's taker were given in gainBall and
// below; a pass on its way to a teammate nobody plays goes to the passer's person. Alone on a
// side, a person is switched when someone else is clearly nearer the ball, as before; with
// several, each switches with the pass button, so nobody's player is taken from under them.
const updateControl = (m: MatchState) => {
  const { ball } = m;
  const by = controllers(m);
  m.people.forEach((person, s) => {
    const side = m.setup.slots[s];
    const current = m.players[person.control];
    if (current.off) {
      const next = chaserOf(
        m,
        side,
        m.people.map((q) => q.control)
      );
      if (next >= 0) person.control = next;
    }
    if (m.phase === 'restart' && m.restart?.side === side && by[m.restart.taker] < 0) {
      if (nearestSlot(m, side, m.restart.x, m.restart.z) === s) {
        giveControl(m, s, m.restart.taker);
        by[m.restart.taker] = s;
      }
      return;
    }
    if (ball.owner >= 0 && m.players[ball.owner].side === side) return;
    // A pass on its way to a teammate nobody plays: the person whose player is nearest takes
    // the receiver (as in co-op football games), so with several people a side the ball goes
    // round them instead of staying with whoever passed.
    if (ball.target >= 0 && m.players[ball.target].side === side) {
      const q = m.players[ball.target];
      if (by[ball.target] < 0 && nearestSlot(m, side, q.x, q.z) === s) {
        giveControl(m, s, ball.target);
        by[ball.target] = s;
      }
      return;
    }
    const alone = slotsOf(m, side).length === 1;
    const others = m.people.filter((q, k) => k !== s).map((q) => q.control);
    const nearest = chaserOf(m, side, others);
    if (nearest < 0) return;
    const keeperIdle = current.role === 'gk' && ball.owner !== person.control;
    if (keeperIdle || (alone && dist(current, ball) > dist(m.players[nearest], ball) + 12))
      person.control = nearest;
  });
};

// A pass on its way to a person's player: the player goes to meet it, and the stick says how.
// Across the ball's path it picks a step to either side (up to RECEIVE_SIDE); along the path,
// with the ball, it lets the ball run to take it further on (up to RECEIVE_RUN); sprint attacks
// it. The first touch then follows the stick too (gainBall). Without this the stick alone made
// people run past their passes.
const receiveMove = (
  m: MatchState,
  i: number,
  dir: [number, number] | undefined,
  sprint: boolean
): Move | undefined => {
  const { ball } = m;
  if (ball.owner >= 0 || ball.target !== i) return undefined;
  const p = m.players[i];
  const speed = len(ball.vx, ball.vz);
  if (speed < 0.8) {
    // A ball that has stopped (or nearly): go and get it.
    if (dist(p, ball) > 14) return undefined;
    return toward(p, ball.x, ball.z, sprint || dist(p, ball) > 5);
  }
  const ux = ball.vx / speed;
  const uz = ball.vz / speed;
  // How far along its path the ball can still go: in the air to where it lands, then rolling
  // to a stop on the grass. The meeting point stays short of that.
  // On the ground, as far as it still arrives with some pace (3 m/s), so nobody waits for a
  // ball crawling up to them.
  const arrive = 3;
  let reachable =
    Math.max(0, speed * speed - arrive * arrive) /
    (2 * (ROLL_FIXED + (ROLL_PER_SPEED * (speed + arrive)) / 2));
  if (ball.y > BALL_RADIUS + 0.05 || ball.vy > 0) {
    const air =
      (ball.vy + dsqrt(ball.vy * ball.vy + 2 * GRAVITY * (ball.y - BALL_RADIUS))) / GRAVITY;
    // A ball in the air is best met where it comes down.
    reachable = speed * air + 2;
  }
  // Where the player is along the path, moved on by the stick when it points with the ball.
  let s = (p.x - ball.x) * ux + (p.z - ball.z) * uz;
  let side = 0;
  if (dir) {
    const along = dir[0] * ux + dir[1] * uz;
    side = (-dir[0] * uz + dir[1] * ux) * RECEIVE_SIDE;
    // Letting a slow ball run would only mean waiting for it: the run grows with its pace.
    s += Math.max(0, along) * Math.min(RECEIVE_RUN, speed * 0.3);
  }
  s = clamp(s, 0.5, Math.max(0.5, reachable));
  const tx = ball.x + ux * s - uz * side;
  const tz = ball.z + uz * s + ux * side;
  if (dist(p, { x: tx, z: tz }) > 14) return undefined;
  const far = dist(p, { x: tx, z: tz });
  return toward(p, tx, tz, sprint || far > 5);
};

export const step = (m: MatchState, inputs: Input[]): void => {
  m.events = [];
  m.tick += 1;
  const { ball } = m;

  if (m.phase === 'goal' || m.phase === 'halftime') {
    m.wait -= 1;
    if (m.wait <= 0) {
      if (m.phase === 'halftime') {
        m.half = 2;
        setRestart(m, 'kickoff', 1, 0, 0);
        m.events.push({ type: 'whistle', kind: 'start' });
      } else {
        const last = m.scorers[m.scorers.length - 1];
        setRestart(m, 'kickoff', last ? ((1 - last.side) as Side) : 0, 0, 0);
      }
    }
  } else if (m.phase === 'restart' && !sceneHolds(m)) {
    m.wait -= 1;
  }
  if (m.phase === 'over') {
    m.players.forEach((p) => moveBusy(p));
    m.people.forEach((person, s) => {
      person.prev = buttons(inputs[s] ?? NO_INPUT);
    });
    return;
  }

  m.people.forEach((_, s) => {
    const code = inputs[s]?.sub;
    if (code) subFromInput(m, m.setup.slots[s], code);
  });
  stepScene(m);
  updateControl(m);
  const by = controllers(m);

  const chasers: [number, number] = [-1, -1];
  ([0, 1] as Side[]).forEach((side) => {
    if (ball.owner >= 0 && m.players[ball.owner].side === side) return;
    const mine = slotsOf(m, side).map((s) => m.people[s].control);
    // A person's teammates help press only when no person's player is near the ball.
    if (mine.some((i) => dist(m.players[i], ball) < 9)) return;
    chasers[side] = chaserOf(m, side, mine);
  });

  const restart = m.phase === 'restart' ? m.restart : undefined;
  const wall = restart?.kind === 'freekick' || restart?.kind === 'penalty';

  m.players.forEach((p, i) => {
    if (p.off) return;
    if (p.noTouch > 0) p.noTouch -= 1;
    if (p.busy > 0) {
      p.busy -= 1;
      moveBusy(p);
      if (p.busy === 0) p.action = 'none';
      return;
    }
    const scripted = sceneMove(m, i);
    if (scripted) {
      movePlayer(p, scripted.move, false);
      p.action = scripted.action;
      if (scripted.face !== undefined && len(p.vx, p.vz) < 0.6) turnTo(p, scripted.face);
      return;
    }
    // A pose a scene left (cheering, arguing) ends with it.
    if (p.action !== 'none') p.action = 'none';
    const { side } = p;
    const s = by[i];
    const hasBall = ball.owner === i;
    let want: Move = { x: 0, z: 0, sprint: false };

    if (restart && (restart.taker === i || wall || restart.kind === 'penalty')) {
      // The taker waits on the ball; at a free kick or penalty everyone holds their place.
      want = { x: 0, z: 0, sprint: false };
    } else if (m.phase === 'goal' || m.phase === 'halftime') {
      want = toward(p, p.x * 0.98, p.z * 0.98);
    } else if (s >= 0) {
      const input = inputs[s] ?? NO_INPUT;
      const liveNow = m.phase === 'play';
      const others = m.people.filter((_, k) => k !== s).map((q) => q.control);
      if (liveNow) personActs(m, s, input, others);
      const dir = stick(input);
      const theirs = ball.owner < 0 || m.players[ball.owner].side !== side;
      const receive = liveNow ? receiveMove(m, i, dir, input.sprint) : undefined;
      if (receive) want = receive;
      else if (liveNow && theirs && input.through && ball.target < 0)
        want = press(m, i, input.sprint);
      else if (dir) want = { x: dir[0], z: dir[1], sprint: input.sprint };
    } else if (p.role === 'gk') {
      want = keeper(m, i);
    } else if (hasBall && m.phase === 'play') {
      want = cpuCarrier(m, i);
    } else {
      want = offBall(m, i, chasers);
      if (m.phase === 'play' && !sideHasPeople(m, side)) {
        const t = cpuTackle(m, i);
        if (t === 'stand') standingTackle(m, i, CPU[m.setup.difficulty].skill);
        else if (t === 'slide' && ball.owner >= 0) {
          const c = m.players[ball.owner];
          startSlide(m, i, c.x + c.vx * 0.3 - p.x, c.z + c.vz * 0.3 - p.z);
        }
      }
    }
    if (restart && restart.taker !== i && restart.kind === 'kickoff') {
      // Nobody crosses into the other half before the kick-off.
      const f = attackDir(m, side);
      if ((p.x + want.x) * f > -0.5 && !(side === restart.side && p.num === 10)) want.x = 0;
    }
    if (p.busy === 0) movePlayer(p, want, ball.owner === i);
  });

  m.players.forEach((p) => {
    if (p.off) return;
    p.x += p.vx * DT;
    p.z += p.vz * DT;
    p.x = clamp(p.x, -HALF_LENGTH - PITCH_MARGIN, HALF_LENGTH + PITCH_MARGIN);
    p.z = clamp(p.z, -HALF_WIDTH - PITCH_MARGIN, HALF_WIDTH + PITCH_MARGIN);
  });
  separate(m);
  if (m.phase === 'restart' && m.restart && m.restart.kind !== 'throw') {
    const r = m.restart;
    if (r.kind === 'freekick' || r.kind === 'corner')
      clearCircle(m, (1 - r.side) as Side, r.x, r.z, WALL_DISTANCE - 0.5);
  }

  if (m.phase === 'restart') takeRestart(m, inputs, controllers(m));
  if (m.phase !== 'restart') moveBall(m);
  contacts(m, inputs);
  moveOffPitch(m);
  moveOfficials(m);

  if (m.phase === 'play' || m.phase === 'restart') {
    if (m.think[0] > 0) m.think[0] -= 1;
    if (m.think[1] > 0) m.think[1] -= 1;
    m.clock += HALF_SECONDS / (m.setup.halfMinutes * 60 * TICK_RATE);
    const endOfHalf = m.half === 1 ? HALF_SECONDS : MATCH_SECONDS;
    if (m.clock >= endOfHalf && m.phase === 'play' && !ball.shot) {
      m.clock = endOfHalf;
      m.events.push({ type: 'whistle', kind: m.half === 1 ? 'half' : 'end' });
      if (m.half === 1) {
        m.phase = 'halftime';
        m.wait = HALFTIME_WAIT;
      } else {
        m.phase = 'over';
        fullTime(m);
      }
      ball.owner = -1;
    }
  }
  m.people.forEach((person, s) => {
    person.prev = buttons(inputs[s] ?? NO_INPUT);
  });
};

export const minuteOf = (m: MatchState): number => Math.floor(m.clock / 60);

export const winnerOf = (m: MatchState): Side | undefined => {
  if (m.score[0] === m.score[1]) return undefined;
  return m.score[0] > m.score[1] ? 0 : 1;
};
