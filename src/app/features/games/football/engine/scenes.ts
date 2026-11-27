/* eslint-disable no-param-reassign */
import { datan2, dcos, dsin } from '../../horde/engine/dmath';
import { attackDir, clamp, dist, goalX, len, rand, teammates } from './actions';
import { Move, toward } from './ai';
import {
  BENCH_X,
  BENCH_Z,
  CALL_WAIT,
  COACH_MINUTES,
  DT,
  FOURTH_Z,
  HALF_LENGTH,
  HALF_WIDTH,
  MAX_SUBS,
  PENALTY_SPOT,
  SCENE,
  SEAT_GAP,
  TUNNEL_Z,
  WALK,
} from './data';
import { Action, MatchState, Official, Player, Scene, Side } from './types';

// Scenes: what the players and officials act out while play is stopped, the way football on
// TV shows it. A fouled player lies holding a leg while teammates come over, the offender
// argues and the referee runs in to show the card; someone sent off walks to the tunnel; a
// scorer runs off to celebrate and the team piles on while the other side holds its heads; the
// fourth official raises the board and two players slap hands at the line. Each is one `Scene`
// in the match (`m.scene`), stepped here every tick, so it is the same on every computer.
//
// What a scene does is presentation: positions, facing and `action`, which the renderer turns
// into clips. Its only effects on the rules are that `hold` keeps the restart waiting and that
// a substitution swaps two players. Later features hang on the same pieces: `startScene`,
// `sceneHolds`, the `scene` start and end events, `requestSub`, and `sceneFocus` for the camera.
//
// match.ts calls `stepScene` at the top of each tick, `sceneMove` for each player on the pitch
// before their own choices, and `moveOffPitch` for the bench, the substituted and the sent off.

// Bench seat `seat` of `side`: side 0's bench toward -x, side 1's toward +x.
export const seatSpot = (side: Side, seat: number): { x: number; z: number } => ({
  x: (side === 0 ? -1 : 1) * (BENCH_X + seat * SEAT_GAP),
  z: BENCH_Z,
});

export const TUNNEL = { x: 0, z: TUNNEL_Z };
export const FOURTH = { x: 0, z: FOURTH_Z };

// Toward the pitch from the far touchline, where the benches are.
const FACE_PITCH = Math.PI / 2;

const angleTo = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  datan2(b.z - a.z, b.x - a.x);

export const startScene = (m: MatchState, scene: Scene): void => {
  if (m.scene) m.events.push({ type: 'scene', kind: m.scene.kind, stage: 'end' });
  m.scene = scene;
  m.events.push({ type: 'scene', kind: scene.kind, stage: 'start' });
};

export const endScene = (m: MatchState): void => {
  const s = m.scene;
  if (!s) return;
  m.scene = undefined;
  m.events.push({ type: 'scene', kind: s.kind, stage: 'end' });
};

// Whether the restart waits for the scene.
export const sceneHolds = (m: MatchState): boolean => m.scene?.hold === true;

// The restart may go: what a decision still needs on screen is short.
const release = (m: MatchState, s: Scene) => {
  if (!s.hold) return;
  s.hold = false;
  m.wait = Math.min(m.wait, CALL_WAIT);
};

const official = (o: Official, action: Action, busy: number, aim?: number) => {
  o.action = action;
  o.busy = busy;
  o.aim = aim;
};

// Those nearest (x, z) among `from`, at most `n` within `range`.
const nearest = (
  m: MatchState,
  from: number[],
  x: number,
  z: number,
  n: number,
  range: number
): number[] =>
  from
    .filter((i) => dist(m.players[i], { x, z }) < range)
    .sort((a, b) => dist(m.players[a], { x, z }) - dist(m.players[b], { x, z }))
    .slice(0, n);

// ----- Fouls -----

// The fouled player goes down a step on from where they were hit, the way they were going.
// Called before the restart is set, which leaves someone lying out of the free kick.
export const knockDown = (m: MatchState, victim: number): void => {
  const v = m.players[victim];
  v.x = clamp(v.x + dcos(v.face) * 1.2, -HALF_LENGTH + 0.5, HALF_LENGTH - 0.5);
  v.z = clamp(v.z + dsin(v.face) * 1.2, -HALF_WIDTH + 0.5, HALF_WIDTH - 0.5);
  v.vx = 0;
  v.vz = 0;
  v.action = 'down';
  v.busy = SCENE.down;
};

// After the referee's decision (referee.ts), with the restart already set.
export const startFoul = (
  m: MatchState,
  offender: number,
  victim: number,
  card: 'yellow' | 'red' | undefined,
  penalty: boolean,
  x: number,
  z: number
): void => {
  const v = m.players[victim];
  const o = m.players[offender];
  const taker = m.restart?.taker ?? -1;
  const free = (i: number) => i !== victim && i !== offender && i !== taker;
  const outfield = (side: Side) =>
    teammates(m, side).filter((i) => free(i) && m.players[i].role !== 'gk');
  startScene(m, {
    kind: 'foul',
    t: 0,
    hold: true,
    offender,
    victim,
    card,
    penalty,
    x,
    z,
    shown: -1,
    helpers: nearest(m, outfield(v.side), v.x, v.z, 2, 25),
    protesters: card ? nearest(m, outfield(o.side), o.x, o.z, 1, 20) : [],
  });
  official(m.officials[0], 'whistle', 30);
};

// Where the referee runs during a foul: to the offender with a card, else to a few meters from
// the spot.
const foulRefSpot = (m: MatchState, s: Extract<Scene, { kind: 'foul' }>) => {
  const ref = m.officials[0];
  if (s.card) {
    const o = m.players[s.offender];
    const a = angleTo(o, ref);
    return { x: o.x + dcos(a) * 1.8, z: o.z + dsin(a) * 1.8 };
  }
  const a = angleTo({ x: s.x, z: s.z }, ref);
  return { x: s.x + dcos(a) * 5, z: s.z + dsin(a) * 5 };
};

const stepFoul = (m: MatchState, s: Extract<Scene, { kind: 'foul' }>) => {
  const ref = m.officials[0];
  const v = m.players[s.victim];
  if (s.shown < 0 && ref.busy === 0) {
    const there = dist(ref, foulRefSpot(m, s)) < 1.2;
    if (there || s.t > SCENE.foulMax - SCENE.card) {
      s.shown = s.t;
      if (s.card) {
        official(ref, 'card', SCENE.card, angleTo(ref, m.players[s.offender]));
        ref.card = s.card;
      } else if (s.penalty) {
        const f = attackDir(m, v.side);
        const spot = { x: goalX(m, v.side) - f * PENALTY_SPOT, z: 0 };
        official(ref, 'point', SCENE.point, angleTo(ref, spot));
      } else {
        // The way the free kick goes: toward the goal the fouled side attacks.
        official(ref, 'point', SCENE.point, attackDir(m, v.side) > 0 ? 0 : Math.PI);
      }
    }
  }
  const shownFor = s.card ? SCENE.card * 0.8 : SCENE.point * 0.6;
  if (s.shown >= 0 && s.t >= s.shown + shownFor && s.t >= SCENE.foulMin) release(m, s);
  if (!s.hold && ref.busy === 0 && v.action !== 'down') endScene(m);
};

// ----- Offside -----

export const startOffside = (m: MatchState, player: number, x: number, z: number): void => {
  startScene(m, { kind: 'offside', t: 0, hold: true, player, x, z });
  official(m.officials[0], 'whistle', 30);
};

const stepOffside = (m: MatchState, s: Extract<Scene, { kind: 'offside' }>) => {
  const ref = m.officials[0];
  // The arm up: an indirect free kick.
  if (s.t === 31) official(ref, 'indirect', SCENE.offside - 30);
  if (s.t >= SCENE.offside) release(m, s);
  if (!s.hold && ref.busy === 0) endScene(m);
};

// ----- Goals -----

export const startGoal = (m: MatchState, side: Side, scorer: number, own: boolean): void => {
  const f = attackDir(m, side);
  const p = scorer >= 0 ? m.players[scorer] : undefined;
  const r = rand(m);
  let style: Extract<Scene, { kind: 'goal' }>['style'] = 'cheer';
  if (r < 0.35) style = 'airplane';
  else if (r < 0.6) style = 'kneeslide';
  else if (r < 0.85) style = 'celebrate';
  startScene(m, {
    kind: 'goal',
    t: 0,
    hold: false,
    side,
    scorer,
    own,
    // Off toward the corner on the scorer's side, a little short of it.
    x: goalX(m, side) - f * 12,
    z: (p && p.z < 0 ? -1 : 1) * (HALF_WIDTH - 5),
    style,
    at: -1,
  });
  // The other side: hands on heads, not all at once.
  m.players.forEach((q, i) => {
    if (q.off || q.side === side) return;
    q.action = 'dejected';
    q.busy = SCENE.dejected + ((i * 13) % 50);
  });
};

// The scorer's teammates take places in a ring around them.
const ringSpot = (m: MatchState, s: Extract<Scene, { kind: 'goal' }>, i: number) => {
  const mates = teammates(m, s.side).filter((j) => j !== s.scorer && m.players[j].role !== 'gk');
  const k = mates.indexOf(i);
  const c = m.players[s.scorer];
  const a = (k / Math.max(1, mates.length)) * Math.PI * 2 + 0.4;
  return { x: c.x + dcos(a) * (1.1 + (k % 2) * 0.5), z: c.z + dsin(a) * (1.1 + (k % 2) * 0.5) };
};

const stepGoal = (m: MatchState, s: Extract<Scene, { kind: 'goal' }>) => {
  if (s.own || s.scorer < 0 || s.at >= 0) return;
  const p = m.players[s.scorer];
  if (dist(p, s) < 2 || s.t > 200) {
    s.at = s.t;
    if (s.style === 'kneeslide') {
      // On the knees, carried on by the run.
      p.action = 'kneeslide';
      p.busy = 70;
      p.face = datan2(p.vz, p.vx);
    }
  }
};

// ----- Substitutions -----

// Changes of a side made, under way at the line or waiting for a stoppage.
export const subsUsed = (m: MatchState, side: Side): number => {
  const s = m.scene;
  // A change at the line is in m.subs once the two have swapped.
  const atLine = s?.kind === 'sub' && s.side === side && m.players[s.on].out === 'bench';
  return (
    m.subs.filter((x) => x.side === side).length +
    m.subQueue.filter((x) => x.side === side).length +
    (atLine ? 1 : 0)
  );
};

// Asks for a substitution at the next stoppage. False when it can't be made: the player isn't
// on the pitch, the substitute isn't on that side's bench, or the side has no changes left.
export const requestSub = (m: MatchState, side: Side, out: number, on: number): boolean => {
  const o = m.players[out];
  const n = m.players[on];
  if (!o || !n || o.side !== side || n.side !== side || o.off || n.out !== 'bench') return false;
  if (subsUsed(m, side) >= MAX_SUBS) return false;
  if (m.subQueue.some((x) => x.out === out || x.on === on)) return false;
  // Already on its way at the line.
  const s = m.scene;
  if (s?.kind === 'sub' && (s.out === out || s.on === on)) return false;
  m.subQueue.push({ side, out, on });
  return true;
};

// A substitution as one whole number for the inputs (Input.sub): 1 + out + on * 64, both
// indices in m.players. `on` SUB_CANCEL calls off the waiting change of `out`.
export const SUB_CANCEL = 63;
export const SUB_CODES = 64 * 64 + 1;
export const subCode = (out: number, on: number): number => 1 + out + on * 64;
export const decodeSub = (code: number): { out: number; on: number } => ({
  out: (code - 1) % 64,
  on: Math.floor((code - 1) / 64),
});

// Calls off a change of `side` still waiting for a stoppage.
export const cancelSub = (m: MatchState, side: Side, out: number): void => {
  m.subQueue = m.subQueue.filter((x) => x.side !== side || x.out !== out);
};

// A person's input asking for (or calling off) a change of their own side. A code sent again
// on the next ticks finds it already asked for, so it is asked once.
export const subFromInput = (m: MatchState, side: Side, code: number): void => {
  if (!Number.isInteger(code) || code < 1 || code >= SUB_CODES) return;
  const { out, on } = decodeSub(code);
  if (on === SUB_CANCEL) cancelSub(m, side, out);
  else requestSub(m, side, out, on);
};

// The CPU coach, at a stoppage, for a side nobody plays (people choose their own changes). It
// replaces a stand-in keeper with the bench keeper after a red, and makes a change after each
// of COACH_MINUTES, taking off someone booked if it can.
const coach = (m: MatchState) => {
  const minute = m.clock / 60;
  ([0, 1] as Side[]).forEach((side) => {
    if (m.setup.slots.includes(side)) return;
    if (subsUsed(m, side) >= MAX_SUBS) return;
    const bench = m.players.flatMap((p, i) => (p.side === side && p.out === 'bench' ? [i] : []));
    const queued = (i: number) => m.subQueue.some((x) => x.out === i || x.on === i);
    const free = bench.filter((i) => !queued(i));
    const onPitch = teammates(m, side).filter((i) => !queued(i));
    const standIn = onPitch.find(
      (i) => m.players[i].role === 'gk' && m.players[i].num !== 1 && m.players[i].num !== 12
    );
    const benchKeeper = free.find((i) => m.players[i].role === 'gk');
    if (standIn !== undefined && benchKeeper !== undefined) {
      requestSub(m, side, standIn, benchKeeper);
      return;
    }
    const planned = m.subs.filter((x) => x.side === side).length;
    if (planned >= COACH_MINUTES.length || minute < COACH_MINUTES[planned]) return;
    const outfield = onPitch.filter((i) => m.players[i].role !== 'gk');
    const booked = outfield.filter((i) => m.players[i].yellow > 0);
    const pool = booked.length ? booked : outfield;
    if (!pool.length) return;
    const out = pool[Math.floor(rand(m) * pool.length)];
    const { role } = m.players[out];
    const on =
      free.find((i) => m.players[i].role === role) ?? free.find((i) => m.players[i].role !== 'gk');
    if (on !== undefined) requestSub(m, side, out, on);
  });
};

// The next substitution waiting, if this stoppage can take one.
const startNextSub = (m: MatchState) => {
  const r = m.restart;
  if (!r || r.kind === 'penalty') return;
  while (m.subQueue.length) {
    const next = m.subQueue[0];
    const o = m.players[next.out];
    const n = m.players[next.on];
    if (o.off || n.out !== 'bench') {
      m.subQueue.shift();
    } else {
      // The taker keeps the ball: their change waits for another stoppage.
      if (next.out === r.taker) return;
      m.subQueue.shift();
      const x = (next.side === 0 ? -1 : 1) * 2;
      startScene(m, { kind: 'sub', t: 0, hold: true, ...next, x, z: -HALF_WIDTH, met: -1 });
      // Someone playing the player going off is given the teammate nearest the ball.
      m.people.forEach((person) => {
        if (person.control !== next.out) return;
        const taken = m.people.map((q) => q.control);
        const mates = teammates(m, next.side).filter((i) => i !== next.out && !taken.includes(i));
        const [best] = nearest(m, mates, m.ball.x, m.ball.z, 1, Infinity);
        if (best !== undefined) person.control = best;
      });
      m.events.push({ type: 'sub', side: next.side, out: next.out, on: next.on });
      return;
    }
  }
};

// Where the two players of a substitution wait at the line: the one going off just inside it,
// the one coming on just outside.
const subSpots = (s: Extract<Scene, { kind: 'sub' }>) => ({
  out: { x: s.x, z: s.z + 0.7 },
  on: { x: s.x, z: s.z - 0.7 },
});

const swap = (m: MatchState, s: Extract<Scene, { kind: 'sub' }>) => {
  const o = m.players[s.out];
  const n = m.players[s.on];
  const { seat } = n;
  Object.assign(n, {
    off: false,
    out: undefined,
    seat: -1,
    role: o.role,
    homeX: o.homeX,
    homeZ: o.homeZ,
    x: o.x,
    z: o.z + 0.8,
    vx: 0,
    vz: 0,
    face: FACE_PITCH,
    action: 'none',
    busy: 0,
    noTouch: 0,
  });
  Object.assign(o, { off: true, out: 'subbed', seat, action: 'none', busy: 0, vx: 0, vz: 0 });
  m.people.forEach((person) => {
    if (person.control === s.out) person.control = s.on;
  });
  m.subs.push({
    side: s.side,
    out: o.num,
    on: n.num,
    minute: Math.min(90, Math.floor(m.clock / 60) + 1),
  });
};

const stepSub = (m: MatchState, s: Extract<Scene, { kind: 'sub' }>) => {
  const o = m.players[s.out];
  const n = m.players[s.on];
  const spots = subSpots(s);
  const fourth = m.officials[3];
  if (fourth && s.t < (s.met < 0 ? Infinity : s.met + SCENE.highfive + 20)) {
    official(fourth, 'board', 2, FACE_PITCH);
    fourth.board = [o.num, n.num];
  }
  if (s.met < 0) {
    if (!o.off && s.t >= SCENE.subWalk && dist(o, spots.out) > 0.6) {
      // Too far to walk it all: put them at the line (the camera is on the bench).
      Object.assign(o, { x: spots.out.x, z: spots.out.z, vx: 0, vz: 0 });
    }
    if (dist(o, spots.out) < 0.6 && dist(n, spots.on) < 0.6) s.met = s.t;
    return;
  }
  if (s.t === s.met + SCENE.highfive) swap(m, s);
  if (s.t >= s.met + SCENE.highfive + SCENE.subAfter) {
    release(m, s);
    endScene(m);
  }
};

// ----- Each tick -----

// Moves the scene on one tick, before the players move. A scene whose moment has passed ends:
// fouls, offsides and substitutions belong to a restart, a goal's to the pause after it.
export const stepScene = (m: MatchState): void => {
  const s = m.scene;
  if (s) {
    const phase = s.kind === 'goal' ? 'goal' : 'restart';
    if (m.phase !== phase) endScene(m);
    else {
      s.t += 1;
      if (s.kind === 'foul') stepFoul(m, s);
      else if (s.kind === 'offside') stepOffside(m, s);
      else if (s.kind === 'goal') stepGoal(m, s);
      else if (s.kind === 'sub') stepSub(m, s);
    }
  }
  if (!m.scene && m.phase === 'restart') {
    coach(m);
    startNextSub(m);
  }
};

export type Scripted = { move: Move; action: Action; face?: number };

const STAND: Move = { x: 0, z: 0, sprint: false };

const standFacing = (action: Action, face?: number): Scripted => ({ move: STAND, action, face });

// What a player on the pitch does in the scene, or undefined to play on as usual. Not called
// for a body busy with a move (a slide, lying hurt), which finishes it first.
export const sceneMove = (m: MatchState, i: number): Scripted | undefined => {
  const s = m.scene;
  if (!s) return undefined;
  const p = m.players[i];
  if (s.kind === 'foul') {
    const ref = m.officials[0];
    const v = m.players[s.victim];
    // The offender argues (until the card, when there is one), then takes it.
    const arguing = s.shown < 0 ? !!s.card || s.t < SCENE.protest : false;
    if (i === s.offender && (arguing || (s.card && s.t < s.shown + SCENE.card))) {
      return standFacing(arguing ? 'protest' : 'none', angleTo(p, ref));
    }
    const h = s.helpers.indexOf(i);
    if (h >= 0 && v.action === 'down') {
      const a = v.face + (h === 0 ? 2.2 : -2.2);
      const spot = { x: v.x + dcos(a) * 1.3, z: v.z + dsin(a) * 1.3 };
      if (dist(p, spot) > 0.5) return { move: toward(p, spot.x, spot.z), action: 'none' };
      return standFacing('none', angleTo(p, v));
    }
    if (s.protesters.includes(i) && (s.shown < 0 || s.t < s.shown + SCENE.card)) {
      const spot = { x: ref.x + dcos(ref.face + 0.9) * 1.6, z: ref.z + dsin(ref.face + 0.9) * 1.6 };
      if (dist(p, spot) > 0.8) return { move: toward(p, spot.x, spot.z), action: 'none' };
      return standFacing('protest', angleTo(p, ref));
    }
    return undefined;
  }
  if (s.kind === 'offside') {
    if (i === s.player && s.t < SCENE.offside - 20)
      return standFacing('protest', angleTo(p, m.officials[0]));
    return undefined;
  }
  if (s.kind === 'goal') {
    if (s.own || s.scorer < 0) {
      if (p.side === s.side && s.t < 120) return standFacing('cheer');
      return undefined;
    }
    if (p.side !== s.side) return undefined;
    if (i === s.scorer) {
      if (s.at < 0)
        return {
          move: { ...toward(p, s.x, s.z, true), sprint: true },
          action: s.style === 'airplane' ? 'airplane' : 'none',
        };
      // At the corner, to the camera.
      const action = s.style === 'celebrate' ? 'celebrate' : 'cheer';
      return standFacing(action, FACE_PITCH);
    }
    if (p.role === 'gk') return s.t < 160 ? standFacing('cheer') : undefined;
    // The team runs to the scorer after a moment, nearest first.
    if (s.t < 12 + (i % 11) * 4) return standFacing('cheer');
    const spot = ringSpot(m, s, i);
    const c = m.players[s.scorer];
    if (dist(p, spot) > 0.7)
      return { move: { ...toward(p, spot.x, spot.z, true), sprint: true }, action: 'none' };
    return standFacing('cheer', angleTo(p, c));
  }
  if (s.kind === 'sub' && i === s.out) {
    const spot = subSpots(s).out;
    if (s.met >= 0) return standFacing('highfive', -FACE_PITCH);
    if (dist(p, spot) > 0.4) return { move: toward(p, spot.x, spot.z), action: 'none' };
    return standFacing('none', -FACE_PITCH);
  }
  return undefined;
};

// Walks someone off the pitch toward a spot at WALK speed; true once there.
const walkTo = (p: Player, x: number, z: number): boolean => {
  const dx = x - p.x;
  const dz = z - p.z;
  const d = len(dx, dz);
  if (d < 0.05) {
    p.vx = 0;
    p.vz = 0;
    return true;
  }
  const v = Math.min(WALK, d / DT);
  p.vx = (dx / d) * v;
  p.vz = (dz / d) * v;
  p.x += p.vx * DT;
  p.z += p.vz * DT;
  if (v > 0.3) p.face = datan2(dz, dx);
  return false;
};

// Everyone off the pitch: substitutes on the bench, a substitute walking to the line, a
// substituted player back to their seat and a sent-off one to the tunnel (where the renderer
// stops drawing them), after the card.
export const moveOffPitch = (m: MatchState): void => {
  const s = m.scene;
  m.players.forEach((p, i) => {
    if (!p.off) return;
    if (p.busy > 0) {
      p.busy -= 1;
      if (p.busy === 0) p.action = 'none';
    }
    if (s?.kind === 'sub' && s.on === i) {
      const spot = subSpots(s).on;
      walkTo(p, spot.x, spot.z);
      if (dist(p, spot) < 0.1) {
        p.face = FACE_PITCH;
        p.action = s.met >= 0 ? 'highfive' : 'none';
      } else p.action = 'none';
      return;
    }
    if (s?.kind === 'foul' && s.offender === i && (s.shown < 0 || s.t < s.shown + SCENE.card)) {
      p.vx = 0;
      p.vz = 0;
      p.face = angleTo(p, m.officials[0]);
      if (s.shown < 0) p.action = 'protest';
      else p.action = s.t > s.shown + 30 ? 'dejected' : 'none';
      return;
    }
    if (p.out === 'red') {
      walkTo(p, TUNNEL.x, TUNNEL.z);
      p.action = 'none';
      return;
    }
    const seat = seatSpot(p.side, p.seat);
    if (walkTo(p, seat.x, seat.z)) {
      p.face = FACE_PITCH;
      if (p.busy === 0) p.action = 'sit';
    } else if (p.busy === 0) p.action = 'none';
  });
};

// Whether someone sent off has reached the tunnel (the renderer stops drawing them).
export const inTunnel = (p: Player): boolean => p.out === 'red' && dist(p, TUNNEL) < 0.5;

// The final whistle: the winners celebrate, the losers hold their heads, a draw is applauded.
// The match no longer steps, so these play until the screen closes.
export const fullTime = (m: MatchState): void => {
  const [a, b] = m.score;
  m.players.forEach((p) => {
    if (p.out === 'red') return;
    let action: Action = 'clap';
    if (a !== b) action = a > b === (p.side === 0) ? 'cheer' : 'dejected';
    p.action = action;
    p.busy = 1e6;
    p.vx = 0;
    p.vz = 0;
    if (p.off) p.face = FACE_PITCH;
  });
};

// Where the TV camera looks during a scene, and how close (1 is the usual distance), or
// undefined to follow the ball.
export const sceneFocus = (m: MatchState): { x: number; z: number; zoom: number } | undefined => {
  const s = m.scene;
  if (!s) return undefined;
  if (s.kind === 'foul') {
    const ref = m.officials[0];
    if (s.card && s.shown >= 0) return { x: ref.x, z: ref.z, zoom: 0.7 };
    return { x: s.x, z: s.z, zoom: 0.8 };
  }
  if (s.kind === 'goal' && !s.own && s.scorer >= 0) {
    // A little ahead of a scorer on the run.
    const p = m.players[s.scorer];
    return { x: p.x + p.vx * 0.5, z: p.z + p.vz * 0.5, zoom: 0.75 };
  }
  if (s.kind === 'sub') return { x: s.x, z: s.z - 1, zoom: 0.75 };
  return undefined;
};

// Where an official heads in a scene instead of their usual place, and whether they hurry:
// the referee runs to a foul. Undefined to move as usual (referee.ts).
export const officialTarget = (
  m: MatchState,
  k: number
): { x: number; z: number; hurry: boolean } | undefined => {
  const s = m.scene;
  if (k === 0 && s?.kind === 'foul' && s.shown < 0) return { ...foulRefSpot(m, s), hurry: true };
  return undefined;
};

// The officials' signals for a ball gone out: the way a throw-in goes, the corner flag, the
// goal area for a goal kick. The nearest linesman joins in when the ball went out near them.
export const signalRestart = (
  m: MatchState,
  kind: string,
  side: Side,
  x: number,
  z: number
): void => {
  const [ref, ...linesmen] = m.officials;
  const linesman = linesmen
    .slice(0, 2)
    .filter((o) => dist(o, { x, z }) < 25)
    .sort((a, b) => dist(a, { x, z }) - dist(b, { x, z }))[0];
  const point = (o: Official, aim: number) => {
    if (o.busy === 0) official(o, 'point', SCENE.point, aim);
  };
  if (kind === 'throw') {
    const aim = attackDir(m, side) > 0 ? 0 : Math.PI;
    point(ref, aim);
    if (linesman) point(linesman, aim);
  } else if (kind === 'corner') {
    const flag = { x: Math.sign(x) * HALF_LENGTH, z: Math.sign(z || 1) * HALF_WIDTH };
    point(ref, angleTo(ref, flag));
    if (linesman) point(linesman, angleTo(linesman, flag));
  } else if (kind === 'goalkick') {
    point(ref, angleTo(ref, { x: Math.sign(x) * (HALF_LENGTH - 5), z: 0 }));
  }
};
