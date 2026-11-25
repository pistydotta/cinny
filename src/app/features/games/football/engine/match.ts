/* eslint-disable no-param-reassign */
import { datan2, dcos, dsin } from '../../horde/engine/dmath';
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
  CELEBRATE_TICKS,
  CHARGE_FULL,
  CHARGE_MAX,
  CIRCLE_RADIUS,
  CPU,
  DIVE_REACH,
  DRIBBLE_GAP,
  DT,
  FALL_TICKS,
  FORMATION,
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
  POST_RADIUS,
  QUEUE_TICKS,
  REACH,
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
  WITH_BALL,
} from './data';
import { teamById } from './teams';
import { Ball, Input, MatchSetup, MatchState, NO_INPUT, Player, RestartKind, Side } from './types';

// The rules of a match. `step` moves everything one tick (1/60 s) with one input per side and
// is the only thing that changes a MatchState. It is deterministic: the same setup and the
// same inputs always give the same match, which online play and replays rely on.
//
// Simplified on purpose for now: no fouls, cards, offside or penalties.

const PITCH_MARGIN = 4;

const newPlayer = (
  m: { rng: number },
  side: Side,
  slot: typeof FORMATION[number],
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
});

// A restart: the ball on its spot, the taker beside it and everyone else sent toward their
// places. Kick-offs put both teams back in their halves at once.
const setRestart = (m: MatchState, kind: RestartKind, side: Side, x: number, z: number) => {
  const { ball } = m;
  Object.assign(ball, newBall(), { x, z, lastSide: side });
  let taker: number;
  const f = attackDir(m, side);
  if (kind === 'kickoff') {
    m.players.forEach((p) => {
      const pf = attackDir(m, p.side);
      const kx = Math.min(p.homeX * 0.92 - 1, -1);
      let px = kx;
      const pz = p.homeZ;
      // The other team stays outside the centre circle.
      if (p.side !== side && len(px, pz) < CIRCLE_RADIUS + 0.5) px = -(CIRCLE_RADIUS + 1);
      Object.assign(p, { x: px * pf, z: pz, vx: 0, vz: 0, face: pf > 0 ? 0 : Math.PI });
      Object.assign(p, { action: 'none', busy: 0, noTouch: 0 });
      if (p.side === side && p.num === 10) Object.assign(p, { x: -3 * f, z: -4 });
    });
    taker = teammates(m, side).find((i) => m.players[i].num === 9) ?? 0;
  } else if (kind === 'goalkick') {
    taker = keeperOf(m, side);
  } else {
    taker = teammates(m, side)
      .filter((i) => m.players[i].role !== 'gk')
      .reduce((a, b) => (dist(m.players[a], ball) <= dist(m.players[b], ball) ? a : b));
  }
  const t = m.players[taker];
  // The taker stands behind the ball, facing into the pitch.
  const inX = kind === 'goalkick' || kind === 'kickoff' ? f : -Math.sign(x) || f;
  let inZ = 0;
  if (kind === 'throw') inZ = -Math.sign(z);
  else if (kind === 'corner') inZ = -Math.sign(z) * 0.6;
  const a = datan2(inZ, kind === 'throw' ? 0 : inX);
  Object.assign(t, {
    x: x - dcos(a) * 0.6,
    z: z - dsin(a) * 0.6,
    vx: 0,
    vz: 0,
    face: a,
    action: 'none',
    busy: 0,
  });
  if (kind === 'throw') ball.y = 1.9;
  m.restart = { kind, side, x, z, taker };
  m.phase = 'restart';
  m.wait = RESTART_WAIT[kind];
  m.charge = [0, 0];
  m.chargeKind = [undefined, undefined];
  m.events.push({ type: 'out', kind });
};

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
    players: [],
    ball: newBall(),
    control: [9, 20],
    charge: [0, 0],
    chargeKind: [undefined, undefined],
    prev: [NO_INPUT, NO_INPUT],
    think: [0, 0],
    aim: [0, Math.PI],
    queued: [undefined, undefined],
    preview: [-1, -1],
    scorers: [],
    events: [],
  };
  ([0, 1] as Side[]).forEach((side) => {
    const team = teamById(setup.teams[side]);
    FORMATION.forEach((slot, k) =>
      m.players.push(newPlayer(m, side, slot, team.rating, k * 31 + side * 500))
    );
  });
  setRestart(m, 'kickoff', 0, 0, 0);
  m.events = [{ type: 'whistle', kind: 'start' }];
  return m;
};

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

// A standing tackle: wins the ball or leaves the tackler stumbling.
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
    m.players[loser].noTouch = 30;
  } else {
    p.busy = STUMBLE_TICKS;
    p.action = 'fall';
    p.noTouch = 30;
  }
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
const personActs = (m: MatchState, side: Side, input: Input): void => {
  const before = m.prev[side];
  const i = m.control[side];
  const p = m.players[i];
  const { ball } = m;
  const dir = stick(input);
  const [dx, dz] = dir ?? faceVector(p);
  const mine = ball.owner === i;
  const incoming = ball.owner < 0 && (ball.target === i || dist(p, ball) < INCOMING);
  m.preview[side] = -1;

  if ((mine || incoming) && p.busy === 0) {
    if (pressed(input, before, 'pass'))
      m.queued[side] = { key: 'pass', until: m.tick + QUEUE_TICKS };
    else if (pressed(input, before, 'through'))
      m.queued[side] = { key: 'through', until: m.tick + QUEUE_TICKS };
    (['shoot', 'lob'] as const).forEach((key) => {
      if (m.charge[side] === 0 && pressed(input, before, key)) {
        m.charge[side] = 1;
        m.chargeKind[side] = key;
      }
    });
    const kind = m.chargeKind[side];
    if (kind && input[kind] && m.charge[side] < CHARGE_MAX) m.charge[side] += 1;
    if (!mine) return;

    const queued = m.queued[side];
    m.queued[side] = undefined;
    if (queued && queued.until >= m.tick) {
      m.charge[side] = 0;
      m.chargeKind[side] = undefined;
      const through = queued.key === 'through';
      const j = pickReceiver(m, i, dx, dz, through ? 50 : 45);
      const speed = through ? 17 : 13;
      if (j >= 0) passTo(m, i, j, through ? 7 : 0);
      else release(m, i, dx * speed, 0.3, dz * speed);
      return;
    }
    if (kind && (!input[kind] || m.charge[side] >= CHARGE_MAX)) {
      const power = Math.min(1, m.charge[side] / CHARGE_FULL);
      if (kind === 'shoot') {
        // The stick's part across the pitch picks the spot between the posts.
        shoot(m, i, dir ? clamp(dir[1] * 1.2, -1, 1) : (rand(m) - 0.5) * 0.8, power);
      } else {
        const j = pickReceiver(m, i, dx, dz, 60);
        const a = j >= 0 ? datan2(m.players[j].z - p.z, m.players[j].x - p.x) : datan2(dz, dx);
        const d = j >= 0 ? dist(p, m.players[j]) : 18 + power * 30;
        loft(m, i, a, d, j);
      }
      m.charge[side] = 0;
      m.chargeKind[side] = undefined;
      return;
    }
    // A keeper can't hold the ball for ever: it goes long.
    if (p.role === 'gk' && ball.held > KEEPER_MAX_HOLD) {
      loft(m, i, datan2(0, attackDir(m, side)), 40);
      return;
    }
    m.preview[side] = pickReceiver(m, i, dx, dz);
    return;
  }

  m.charge[side] = 0;
  m.chargeKind[side] = undefined;
  m.queued[side] = undefined;
  if (ball.owner >= 0 && m.players[ball.owner].side === side) return;

  if (pressed(input, before, 'pass')) {
    const next = chaserOf(m, side, i);
    if (next >= 0) m.control[side] = next;
  } else if (pressed(input, before, 'shoot')) {
    startSlide(m, i, dx, dz);
  } else if (pressed(input, before, 'through')) {
    standingTackle(m, i, 0, TACKLE_RANGE);
  }
};

// Taking a restart: the person picks pass, lob or a cross with shoot (or the CPU does, after
// the wait); the ball goes in and play is back on.
const takeRestart = (m: MatchState, inputs: [Input, Input]) => {
  const r = m.restart;
  if (!r) return;
  const i = r.taker;
  const p = m.players[i];
  const human = m.setup.humans[r.side];
  const input = inputs[r.side];
  const before = m.prev[r.side];
  const f = attackDir(m, r.side);
  let go: 'pass' | 'lob' | 'cross' | undefined;
  if (human) {
    const dir = stick(input);
    if (dir) p.face = datan2(dir[1], dir[0]);
    if (pressed(input, before, 'pass') || pressed(input, before, 'through')) r.queued = 'pass';
    else if (pressed(input, before, 'lob')) r.queued = 'lob';
    else if (pressed(input, before, 'shoot')) r.queued = r.kind === 'corner' ? 'cross' : 'lob';
    if (m.wait > 0) return;
    go = r.queued;
    if (!go && m.wait < -RESTART_PATIENCE) go = r.kind === 'corner' ? 'cross' : 'pass';
  } else {
    if (m.wait > 0) return;
    go = 'pass';
    if (r.kind === 'corner') go = 'cross';
    else if (r.kind === 'goalkick') go = 'lob';
    if (r.kind === 'throw' && rand(m) < 0.3) go = 'lob';
  }
  if (!go) return;

  const anim = r.kind === 'throw' ? 'throw' : 'kick';
  const busy = r.kind === 'throw' ? THROW_TICKS : undefined;
  const [fx, fz] = faceVector(p);
  m.ball.owner = -1;
  if (go === 'cross') {
    const gx = goalX(m, r.side);
    const tx = gx - f * (7 + rand(m) * 6);
    const tz = (rand(m) - 0.5) * 12;
    loft(m, i, datan2(tz - p.z, tx - p.x), len(tx - p.x, tz - p.z));
  } else {
    let j = human ? pickReceiver(m, i, fx, fz, r.kind === 'throw' ? 25 : 60) : -1;
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
  m.players[i].action = anim;
  if (busy) m.players[i].busy = busy;
  // A ball thrown or kicked must be touched by someone else first.
  m.players[i].noTouch = 20;
  m.phase = 'play';
  m.restart = undefined;
  m.events.push({ type: 'whistle', kind: 'restart' });
};

// Moves a player toward the velocity it wants, turning its body to where it runs.
const movePlayer = (p: Player, want: Move, withBall: boolean) => {
  const speed = speedOf(p, want.sprint, withBall);
  const tvx = want.x * speed;
  const tvz = want.z * speed;
  const dvx = tvx - p.vx;
  const dvz = tvz - p.vz;
  const dv = len(dvx, dvz);
  const step = ACCEL * DT;
  if (dv <= step) {
    p.vx = tvx;
    p.vz = tvz;
  } else {
    p.vx += (dvx / dv) * step;
    p.vz += (dvz / dv) * step;
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
  if (lastP && !own) {
    lastP.action = 'celebrate';
    lastP.busy = CELEBRATE_TICKS;
  }
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

const gainBall = (m: MatchState, i: number) => {
  const { ball } = m;
  const p = m.players[i];
  ball.owner = i;
  ball.lastSide = p.side;
  ball.lastPlayer = i;
  ball.shot = false;
  ball.target = -1;
  ball.held = 0;
  ball.credit = i;
  ball.vy = 0;
  m.think[p.side] = 0;
  if (m.setup.humans[p.side]) m.control[p.side] = i;
};

// Who touches a loose ball: keepers save or catch, heads meet high balls, feet take the rest.
// A sliding player knocks the ball off a carrier.
const contacts = (m: MatchState) => {
  const { ball } = m;
  if (m.phase !== 'play') return;

  // Slides.
  m.players.forEach((p, i) => {
    if (p.action !== 'slide' || p.busy < 6 || p.busy > SLIDE_TICKS - 3) return;
    if (ball.y > 0.6 || dist(p, ball) > 1.2) return;
    if (ball.owner >= 0) {
      const c = m.players[ball.owner];
      if (c.side === p.side) return;
      const won = rand(m) < clamp(0.72 + (p.skill - c.skill) * 0.4, 0.3, 0.92);
      m.events.push({ type: 'tackle', player: i, won });
      if (!won) return;
      c.noTouch = 30;
      if (rand(m) < 0.35) {
        c.action = 'fall';
        c.busy = FALL_TICKS;
      }
    }
    if (ball.owner >= 0 && m.players[ball.owner].side === p.side) return;
    ball.owner = -1;
    ball.vx = p.actX * 6 + (rand(m) - 0.5) * 2;
    ball.vz = p.actZ * 6 + (rand(m) - 0.5) * 2;
    ball.vy = 0.5;
    ball.lastSide = p.side;
    ball.lastPlayer = i;
    ball.shot = false;
    p.noTouch = 10;
  });

  if (ball.owner >= 0) return;

  let best = -1;
  let bestD = Infinity;
  m.players.forEach((p, i) => {
    if (p.noTouch > 0 || p.action === 'fall' || p.action === 'celebrate') return;
    const keeperHands = p.role === 'gk' && inOwnBox(m, p.side, ball.x, ball.z);
    const diving = p.action === 'dive';
    let reach = REACH;
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
      const nudge = m.setup.humans[p.side] ? 0 : CPU[m.setup.difficulty].skill;
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
    gainBall(m, best);
    p.vx = 0;
    p.vz = 0;
    return;
  }

  if (ball.y > HEAD_MIN) {
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
  if (rel > 15 && rand(m) > 0.35 + p.skill * 0.4) {
    ball.vx = -ball.vx * 0.25 + p.vx;
    ball.vz = -ball.vz * 0.25 + p.vz;
    ball.vy = 1.5;
    ball.lastSide = p.side;
    ball.lastPlayer = best;
    ball.shot = false;
    p.noTouch = 12;
    return;
  }
  gainBall(m, best);
};

// Keeps players from walking through each other.
const separate = (m: MatchState) => {
  const ps = m.players;
  for (let i = 0; i < ps.length; i += 1) {
    for (let j = i + 1; j < ps.length; j += 1) {
      const a = ps[i];
      const b = ps[j];
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
};

// Who each side controls: its ball carrier, or for a person the player they picked, switched
// when someone else is clearly nearer the ball.
const updateControl = (m: MatchState) => {
  const { ball } = m;
  ([0, 1] as Side[]).forEach((side) => {
    if (ball.owner >= 0 && m.players[ball.owner].side === side) {
      m.control[side] = ball.owner;
      return;
    }
    if (m.phase === 'restart' && m.restart?.side === side) {
      m.control[side] = m.restart.taker;
      return;
    }
    const current = m.players[m.control[side]];
    const nearest = chaserOf(m, side);
    if (nearest < 0) return;
    if (!m.setup.humans[side]) {
      m.control[side] = nearest;
      return;
    }
    if (ball.target >= 0 && m.players[ball.target].side === side) {
      m.control[side] = ball.target;
      return;
    }
    if (current.role === 'gk' || dist(current, ball) > dist(m.players[nearest], ball) + 12)
      m.control[side] = nearest;
  });
};

export const step = (m: MatchState, inputs: [Input, Input]): void => {
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
  } else if (m.phase === 'restart') {
    m.wait -= 1;
  }
  if (m.phase === 'over') {
    m.players.forEach((p) => moveBusy(p));
    m.prev = inputs;
    return;
  }

  updateControl(m);

  const chasers: [number, number] = [-1, -1];
  ([0, 1] as Side[]).forEach((side) => {
    if (ball.owner >= 0 && m.players[ball.owner].side === side) return;
    const human = m.setup.humans[side];
    const skip = human ? m.control[side] : -1;
    const c = chaserOf(m, side, skip);
    // A person's teammates help press only when the person's player is far from the ball.
    if (human && dist(m.players[m.control[side]], ball) < 9) return;
    chasers[side] = c;
  });

  const restart = m.phase === 'restart' ? m.restart : undefined;
  const live = m.phase === 'play';

  m.players.forEach((p, i) => {
    if (p.noTouch > 0) p.noTouch -= 1;
    if (p.busy > 0) {
      p.busy -= 1;
      moveBusy(p);
      if (p.busy === 0) p.action = 'none';
      return;
    }
    const { side } = p;
    const human = m.setup.humans[side] && m.control[side] === i;
    const hasBall = ball.owner === i;
    let want: Move = { x: 0, z: 0, sprint: false };

    if (restart && restart.taker === i) {
      want = { x: 0, z: 0, sprint: false };
    } else if (m.phase === 'goal' || m.phase === 'halftime') {
      want = toward(p, p.x * 0.98, p.z * 0.98);
    } else if (human) {
      const input = inputs[side];
      if (live) personActs(m, side, input);
      const dir = stick(input);
      const theirs = ball.owner < 0 || m.players[ball.owner].side !== side;
      if (live && theirs && input.through && ball.target < 0) want = press(m, i, input.sprint);
      else if (dir) want = { x: dir[0], z: dir[1], sprint: input.sprint };
    } else if (p.role === 'gk') {
      want = keeper(m, i);
    } else if (hasBall && live) {
      want = cpuCarrier(m, i);
    } else {
      want = offBall(m, i, chasers);
      if (live && !m.setup.humans[side]) {
        const t = cpuTackle(m, i);
        if (t === 'stand') standingTackle(m, i, CPU[m.setup.difficulty].skill);
        else if (t === 'slide') {
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
    if (p.busy > 0) return;
    movePlayer(p, want, ball.owner === i);
  });

  m.players.forEach((p) => {
    p.x += p.vx * DT;
    p.z += p.vz * DT;
    p.x = clamp(p.x, -HALF_LENGTH - PITCH_MARGIN, HALF_LENGTH + PITCH_MARGIN);
    p.z = clamp(p.z, -HALF_WIDTH - PITCH_MARGIN, HALF_WIDTH + PITCH_MARGIN);
  });
  separate(m);

  if (m.phase === 'restart') takeRestart(m, inputs);
  if (m.phase !== 'restart') moveBall(m);
  contacts(m);

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
      } else m.phase = 'over';
      ball.owner = -1;
    }
  }
  m.prev = inputs;
};

export const minuteOf = (m: MatchState): number => Math.floor(m.clock / 60);

export const winnerOf = (m: MatchState): Side | undefined => {
  if (m.score[0] === m.score[1]) return undefined;
  return m.score[0] > m.score[1] ? 0 : 1;
};
