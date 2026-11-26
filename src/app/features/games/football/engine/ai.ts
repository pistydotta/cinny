/* eslint-disable no-param-reassign */
import { datan2, dcos, dsin } from '../../horde/engine/dmath';
import {
  attackDir,
  clamp,
  dist,
  goalX,
  laneSpace,
  len,
  loft,
  nearestOpponent,
  ownGoalX,
  passTo,
  rand,
  shoot,
  shotPath,
  teammates,
} from './actions';
import {
  BOX_DEPTH,
  BOX_HALF_WIDTH,
  CPU,
  DIVE_TICKS,
  GOAL_HALF_WIDTH,
  HALF_WIDTH,
  KEEPER_HOLD,
} from './data';
import { MatchState, Player, Side } from './types';

// The CPU: where every player without a person runs, what a CPU ball carrier does, how the
// keepers stand and dive. It sees the same state a person sees on screen, nothing hidden.

// `walk` is a scene's slow walk (scenes.ts), slower than any jog.
export type Move = { x: number; z: number; sprint: boolean; walk?: boolean };

const STAND: Move = { x: 0, z: 0, sprint: false };

// A unit direction toward (tx, tz) that slows down on arrival, as a fraction of full speed.
export const toward = (p: Player, tx: number, tz: number, sprint = false): Move => {
  const dx = tx - p.x;
  const dz = tz - p.z;
  const d = len(dx, dz);
  if (d < 0.4) return STAND;
  const k = Math.min(1, d / 2.5) / d;
  return { x: dx * k, z: dz * k, sprint: sprint && d > 4 };
};

// The ball, a moment ahead, for whoever runs to meet it.
export const ballAhead = (m: MatchState, t: number): [number, number] => {
  const { ball } = m;
  return [ball.x + ball.vx * t, ball.z + ball.vz * t];
};

// Where a player stands when not chasing the ball: the formation slot, slid up the pitch with
// the ball and toward its side, further forward when the team has it.
export const shapeSpot = (m: MatchState, i: number): [number, number] => {
  const p = m.players[i];
  const f = attackDir(m, p.side);
  const { ball } = m;
  const ballF = ball.x * f;
  const owner = ball.owner >= 0 ? m.players[ball.owner].side : -1;
  const attacking = owner === p.side;
  let tx = p.homeX * 0.62 + ballF * 0.45 + (attacking ? 12 : 0);
  if (p.role === 'def') tx = Math.min(tx, attacking ? ballF - 4 : ballF - 6);
  if (p.role === 'fwd' && attacking) tx = Math.max(tx, ballF + 3);
  if (!attacking && p.role !== 'fwd') tx -= 4;
  tx = clamp(tx, -46, 44);
  let tz = p.homeZ * (attacking ? 0.9 : 0.7) + ball.z * 0.3;
  tz = clamp(tz, -HALF_WIDTH + 3, HALF_WIDTH - 3);
  return [tx * f, tz];
};

// The outfield player of `side` nearest to where the ball is going.
// `skip` leaves out players already taken (the person's own, or other people's).
export const chaserOf = (m: MatchState, side: Side, skip: number | number[] = -1): number => {
  const skips = Array.isArray(skip) ? skip : [skip];
  const [bx, bz] = ballAhead(m, 0.3);
  let best = -1;
  let bestD = Infinity;
  teammates(m, side).forEach((i) => {
    const p = m.players[i];
    if (p.role === 'gk' || skips.includes(i) || p.action === 'fall') return;
    const d = len(p.x - bx, p.z - bz);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
};

// Pressing: goal-side of the other team's carrier, or after a loose ball. A person holding the
// tackle button gets this too, sprinting only when they also hold sprint.
export const press = (m: MatchState, i: number, sprint: boolean): Move => {
  const p = m.players[i];
  const { ball } = m;
  if (ball.owner >= 0 && m.players[ball.owner].side !== p.side) {
    const c = m.players[ball.owner];
    const gx = ownGoalX(m, p.side);
    const d = len(gx - c.x, -c.z) || 1;
    return toward(p, c.x + ((gx - c.x) / d) * 0.9, c.z + (-c.z / d) * 0.9, sprint);
  }
  const [bx, bz] = ballAhead(m, 0.35);
  return toward(p, bx, bz, sprint);
};

// Off the ball: run to meet a pass meant for you, chase a ball nobody has, press the carrier,
// or keep the shape.
export const offBall = (m: MatchState, i: number, chasers: [number, number]): Move => {
  const p = m.players[i];
  const { ball } = m;
  if (ball.target === i && ball.owner < 0) {
    const [bx, bz] = ballAhead(m, 0.25);
    return toward(p, bx, bz, true);
  }
  if (chasers[p.side] === i) return press(m, i, true);
  const [tx, tz] = shapeSpot(m, i);
  return toward(p, tx, tz, dist(p, { x: tx, z: tz }) > 12);
};

// The keeper: stands between the ball and the goal's middle, comes out for a loose ball in the
// box, and dives at a shot it can reach. Holding the ball, it gives it to a defender or kicks
// it long.
export const keeper = (m: MatchState, i: number): Move => {
  const p = m.players[i];
  const { ball } = m;
  const gx = ownGoalX(m, p.side);
  const f = attackDir(m, p.side);

  if (ball.owner === i) {
    if (ball.held < KEEPER_HOLD) return STAND;
    const backs = teammates(m, p.side).filter((j) => m.players[j].role === 'def');
    const free = backs
      .map((j) => ({ j, s: laneSpace(m, p, m.players[j]) }))
      .sort((a, b) => b.s - a.s)[0];
    if (free && free.s > 6) passTo(m, i, free.j);
    else loft(m, i, datan2((rand(m) - 0.5) * 30, f * 40), 45 + rand(m) * 10);
    return STAND;
  }

  const path = ball.shot ? shotPath(m, p.side, p.x) : undefined;
  if (path && p.busy === 0 && path.t < 0.7 && path.y < 2.8) {
    const dz = path.z - p.z;
    if (Math.abs(dz) > 0.9) {
      p.action = 'dive';
      p.busy = DIVE_TICKS;
      p.actX = 0;
      p.actZ = Math.sign(dz);
      p.vz = Math.sign(dz) * Math.min(7.5, Math.abs(dz) / Math.max(path.t, 0.15));
      return STAND;
    }
    return toward(p, p.x, path.z);
  }

  const inBox =
    Math.abs(ball.x - gx) < BOX_DEPTH - 2 && Math.abs(ball.z) < BOX_HALF_WIDTH - 4 && ball.y < 2;
  const loose = ball.owner < 0 && !ball.shot;
  if (inBox && (loose || (ball.owner >= 0 && m.players[ball.owner].side !== p.side))) {
    // Come out only when the keeper gets there first.
    const mine = dist(p, ball);
    const theirs = Math.min(
      ...m.players.filter((o) => o.side !== p.side && !o.off).map((o) => dist(o, ball))
    );
    if (mine < theirs + 1.5) return toward(p, ball.x, ball.z, true);
  }

  const bx = ball.x - gx;
  const bz = ball.z;
  const d = len(bx, bz) || 1;
  const out = Math.min(5.5, 1.2 + d * 0.06);
  return toward(p, gx + (bx / d) * out, clamp((bz / d) * out, -GOAL_HALF_WIDTH, GOAL_HALF_WIDTH));
};

// A CPU carrier: shoots in range, passes when pressed or when a teammate is clearly better
// placed, and otherwise dribbles at goal, bending away from the nearest defender.
export const cpuCarrier = (m: MatchState, i: number): Move => {
  const p = m.players[i];
  const cfg = CPU[m.setup.difficulty];
  const { side } = p;
  const f = attackDir(m, side);
  const gx = goalX(m, side);
  const toGoal = len(gx - p.x, -p.z);

  if (m.think[side] <= 0) {
    m.think[side] = cfg.think;
    const pressure = nearestOpponent(m, p);
    const angleOk = Math.abs(p.z) < 18 || toGoal < 12;
    if (toGoal < cfg.shootRange && angleOk && (pressure < 4 || toGoal < 15 || rand(m) < 0.25)) {
      const aim = (rand(m) < 0.5 ? -1 : 1) * (0.55 + rand(m) * 0.4);
      shoot(m, i, aim, 0.45 + rand(m) * 0.4, cfg.skill);
      return STAND;
    }
    let passChance = 0.06;
    if (pressure < 2.2) passChance = 0.7;
    else if (pressure < 4) passChance = 0.18;
    if (rand(m) < passChance) {
      let best = -1;
      let bestScore = -Infinity;
      teammates(m, side).forEach((j) => {
        const q = m.players[j];
        if (j === i || q.role === 'gk') return;
        const d = dist(p, q);
        if (d < 5 || d > 38) return;
        const gain = (q.x - p.x) * f;
        const space = laneSpace(m, p, q);
        const score = gain * 0.6 + Math.min(space, 6) * 2 - d * 0.1 + rand(m) * 3;
        if (space > 1.6 && score > bestScore) {
          bestScore = score;
          best = j;
        }
      });
      if (best >= 0) {
        passTo(m, i, best, (m.players[best].x - p.x) * f > 8 ? 3 : 0);
        return STAND;
      }
    }
    // Dribble at goal, away from whoever is near.
    let ax = (gx - p.x) / (toGoal || 1);
    let az = -p.z / (toGoal || 1);
    m.players.forEach((o) => {
      if (o.side === side || o.off) return;
      const d = dist(o, p);
      if (d > 6 || d < 0.01) return;
      ax += ((p.x - o.x) / d) * (6 - d) * 0.25;
      az += ((p.z - o.z) / d) * (6 - d) * 0.25;
    });
    if (Math.abs(p.z) > HALF_WIDTH - 4) az -= Math.sign(p.z) * 0.6;
    m.aim[side] = datan2(az, ax);
  }
  const a = m.aim[side];
  return { x: dcos(a), z: dsin(a), sprint: nearestOpponent(m, p) > 3 };
};

// A CPU defender next to the carrier tries a tackle now and then, sometimes sliding in.
export const cpuTackle = (m: MatchState, i: number): 'stand' | 'slide' | undefined => {
  const p = m.players[i];
  const { ball } = m;
  if (ball.owner < 0 || p.busy > 0 || p.noTouch > 0) return undefined;
  const c = m.players[ball.owner];
  if (c.side === p.side || c.role === 'gk') return undefined;
  const d = dist(p, c);
  const cfg = CPU[m.setup.difficulty];
  if (d < 1.4 && rand(m) < cfg.tackle / 30) return 'stand';
  if (d < 3 && d > 1.5 && rand(m) < cfg.tackle / 40) return 'slide';
  return undefined;
};
