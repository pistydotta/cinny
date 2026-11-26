/* eslint-disable no-param-reassign */
import { datan2, dcos, dsin, dsqrt } from '../../horde/engine/dmath';
import {
  BALL_RADIUS,
  BOX_DEPTH,
  BOX_HALF_WIDTH,
  GOAL_HALF_WIDTH,
  GRAVITY,
  HALF_LENGTH,
  KICK_TICKS,
  ROLL_FIXED,
  ROLL_PER_SPEED,
} from './data';
import { MatchState, Player, Side } from './types';

// Shared by the rules (match.ts) and the CPU (ai.ts): the seeded dice, geometry and every way
// the ball leaves a player's feet.

/* eslint-disable no-bitwise */
// mulberry32, with its state kept in the match so a copy of the state rolls the same.
export const rand = (m: MatchState): number => {
  m.rng = (m.rng + 0x6d2b79f5) >>> 0;
  let t = m.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/* eslint-enable no-bitwise */

export const len = (x: number, z: number): number => dsqrt(x * x + z * z);

export const dist = (a: { x: number; z: number }, b: { x: number; z: number }): number =>
  len(a.x - b.x, a.z - b.z);

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// +1 when the side attacks the +x goal now, -1 when it attacks -x. Sides swap at half time.
export const attackDir = (m: MatchState, side: Side): number =>
  (side === 0 ? 1 : -1) * (m.half === 1 ? 1 : -1);

export const goalX = (m: MatchState, side: Side): number => HALF_LENGTH * attackDir(m, side);

export const ownGoalX = (m: MatchState, side: Side): number => -goalX(m, side);

export const inOwnBox = (m: MatchState, side: Side, x: number, z: number): boolean => {
  const gx = ownGoalX(m, side);
  return Math.abs(x - gx) < BOX_DEPTH && Math.abs(z) < BOX_HALF_WIDTH;
};

// Players still on the pitch: someone sent off is out of every choice.
export const teammates = (m: MatchState, side: Side): number[] =>
  m.players.flatMap((p, i) => (p.side === side && !p.off ? [i] : []));

// The side's keeper: the one in the role (a sent-off keeper's role passes to an outfielder).
export const keeperOf = (m: MatchState, side: Side): number => {
  const i = m.players.findIndex((p) => p.side === side && p.role === 'gk' && !p.off);
  return i >= 0 ? i : teammates(m, side)[0];
};

// The attackers of `side` in an offside position now: in the other half, past the ball and
// past the second-last defender. A pass or shot taken now catches them if they play the ball
// next.
export const offsidePositions = (
  m: MatchState,
  side: Side,
  kicker: number
): [number, number, number][] => {
  const f = attackDir(m, side);
  const defenders = m.players
    .filter((p) => p.side !== side && !p.off)
    .map((p) => p.x * f)
    .sort((a, b) => b - a);
  const line = Math.max(defenders[1] ?? -Infinity, m.ball.x * f);
  return teammates(m, side).flatMap((j) => {
    const q = m.players[j];
    const x = q.x * f;
    return j !== kicker && x > 0 && x > line + 0.2
      ? [[j, q.x, q.z] as [number, number, number]]
      : [];
  });
};

export const faceVector = (p: Player): [number, number] => [dcos(p.face), dsin(p.face)];

// The angle between two directions, 0 to PI.
export const angleBetween = (ax: number, az: number, bx: number, bz: number): number => {
  const d = Math.abs(datan2(az, ax) - datan2(bz, bx));
  return d > Math.PI ? 2 * Math.PI - d : d;
};

// The speed a ground pass needs to cover `d` meters and still arrive with some pace.
// A short pass keeps a little pace on arrival, not so much the receiver can't hold it; a
// through ball (`firm`) more, to beat the defenders it runs past.
export const groundPassSpeed = (d: number, firm = false): number => {
  const decel = ROLL_FIXED + ROLL_PER_SPEED * 8;
  return Math.min(26, dsqrt(2 * decel * d) + (firm ? 2.5 : 1.5));
};

// Puts the ball in flight from player `i`. Every kick goes through here.
export const release = (
  m: MatchState,
  i: number,
  vx: number,
  vy: number,
  vz: number,
  opts: { shot?: boolean; target?: number; anim?: 'kick' | 'throw'; busy?: number } = {}
): void => {
  const p = m.players[i];
  const { ball } = m;
  ball.owner = -1;
  ball.vx = vx;
  ball.vy = vy;
  ball.vz = vz;
  ball.y = Math.max(ball.y, BALL_RADIUS);
  ball.lastSide = p.side;
  ball.lastPlayer = i;
  ball.shot = !!opts.shot;
  ball.target = opts.target ?? -1;
  ball.held = 0;
  ball.credit = i;
  ball.offside = offsidePositions(m, p.side, i);
  p.action = opts.anim ?? 'kick';
  p.busy = opts.busy ?? KICK_TICKS;
  p.noTouch = 14;
  m.events.push({ type: 'kick', player: i, power: len(vx, vz) });
};

// A ground pass from `i` to wherever teammate `j` will be when the ball gets there.
export const passTo = (m: MatchState, i: number, j: number, lead = 0): void => {
  const p = m.players[i];
  const q = m.players[j];
  const dir = attackDir(m, p.side);
  let tx = q.x + dir * lead;
  let tz = q.z;
  let d = len(tx - p.x, tz - p.z);
  let speed = groundPassSpeed(d, lead > 0);
  // One correction for where the receiver runs meanwhile.
  const t = d / speed;
  tx += q.vx * t * 0.8;
  tz += q.vz * t * 0.8;
  d = len(tx - p.x, tz - p.z);
  speed = groundPassSpeed(d, lead > 0);
  const err = (1 - p.skill) * 0.05 * (rand(m) - 0.5);
  const a = datan2(tz - p.z, tx - p.x) + err;
  release(m, i, dcos(a) * speed, 0.3, dsin(a) * speed, { target: j });
};

// A lofted ball that lands about `d` meters away along angle `a`.
export const loft = (m: MatchState, i: number, a: number, d: number, target = -1): void => {
  const h = Math.min(24, Math.max(11, d * 0.55 + 6));
  const t = d / h;
  const vy = (GRAVITY * t) / 2;
  release(m, i, dcos(a) * h, vy, dsin(a) * h, { target });
};

// A shot at the goal the side attacks. `aimZ` picks the spot between the posts (-1 to 1),
// `power` 0 to 1. The miss grows with power, distance and a lack of skill.
export const shoot = (
  m: MatchState,
  i: number,
  aimZ: number,
  power: number,
  skillNudge = 0
): void => {
  const p = m.players[i];
  const gx = goalX(m, p.side);
  const skill = clamp(p.skill + skillNudge, 0.05, 1);
  const d = len(gx - p.x, -p.z);
  const err = (1 - skill) * 1.4 + power * power * 1.1 + d * 0.025;
  const z = aimZ * (GOAL_HALF_WIDTH - 0.5) + (rand(m) - 0.5) * 2 * err;
  const y = 0.25 + power * 1.3 + rand(m) * err * 0.7;
  const speed = (15 + power * 15) * (0.85 + skill * 0.2);
  const hd = len(gx - p.x, z - p.z);
  const t = hd / speed;
  const vy = (y - BALL_RADIUS) / t + (GRAVITY * t) / 2;
  const a = datan2(z - p.z, gx - p.x);
  release(m, i, dcos(a) * speed, Math.min(vy, 9), dsin(a) * speed, { shot: true });
};

// The teammate a pass in direction (dx, dz) goes to: the one closest to that line, not too
// near and not too far. Without a direction it takes the player's facing.
export const pickReceiver = (
  m: MatchState,
  i: number,
  dx: number,
  dz: number,
  maxDist = 45
): number => {
  const p = m.players[i];
  let [fx, fz] = [dx, dz];
  if (fx === 0 && fz === 0) [fx, fz] = faceVector(p);
  let best = -1;
  let bestScore = Infinity;
  teammates(m, p.side).forEach((j) => {
    if (j === i) return;
    const q = m.players[j];
    const d = dist(p, q);
    if (d < 3 || d > maxDist) return;
    const ang = angleBetween(fx, fz, q.x - p.x, q.z - p.z);
    if (ang > 1.1) return;
    // A back pass to the keeper only when asked for clearly.
    if (q.role === 'gk' && ang > 0.35) return;
    let score = ang * 14 + d * 0.12;
    // Another person's player is the better target when roughly that way; the one who just
    // passed to us only when aimed at clearly.
    if (ang < 0.8 && m.people.some((person) => person.control === j)) score -= 5;
    if (j === m.ball.from && ang > 0.25) score += 5;
    if (score < bestScore) {
      bestScore = score;
      best = j;
    }
  });
  return best;
};

// How free a pass from p to q is: the smallest distance of an opponent to the line between
// them (big is free).
export const laneSpace = (m: MatchState, p: Player, q: Player): number => {
  const lx = q.x - p.x;
  const lz = q.z - p.z;
  const l2 = lx * lx + lz * lz || 1;
  let space = 30;
  m.players.forEach((o) => {
    if (o.side === p.side || o.off) return;
    const t = clamp(((o.x - p.x) * lx + (o.z - p.z) * lz) / l2, 0, 1);
    space = Math.min(space, len(p.x + lx * t - o.x, p.z + lz * t - o.z));
  });
  return space;
};

export const nearestOpponent = (m: MatchState, p: Player): number => {
  let best = Infinity;
  m.players.forEach((o) => {
    if (o.side !== p.side && !o.off) best = Math.min(best, dist(o, p));
  });
  return best;
};

// Whether a ball near the goal line is going in between the posts, for keepers.
export const shotPath = (
  m: MatchState,
  side: Side,
  atX: number
): { z: number; y: number; t: number } | undefined => {
  const { ball } = m;
  if (ball.owner >= 0) return undefined;
  const gx = ownGoalX(m, side);
  if (Math.sign(ball.vx) !== Math.sign(gx) || Math.abs(ball.vx) < 3) return undefined;
  const t = (atX - ball.x) / ball.vx;
  if (t < 0 || t > 1.6) return undefined;
  const z = ball.z + ball.vz * t;
  const y = Math.max(BALL_RADIUS, ball.y + ball.vy * t - (GRAVITY * t * t) / 2);
  const tGoal = (gx - ball.x) / ball.vx;
  const zGoal = ball.z + ball.vz * tGoal;
  if (Math.abs(zGoal) > GOAL_HALF_WIDTH + 1.2) return undefined;
  return { z, y, t };
};
