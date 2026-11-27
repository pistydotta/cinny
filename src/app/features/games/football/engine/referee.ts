/* eslint-disable no-param-reassign */
import { datan2, dcos, dsin } from '../../horde/engine/dmath';
import { attackDir, clamp, dist, len, ownGoalX, rand, teammates } from './actions';
import {
  BOX_DEPTH,
  BOX_HALF_WIDTH,
  FOUL,
  HALF_LENGTH,
  HALF_WIDTH,
  LINESMAN_OFFSET,
  OFFICIAL_HURRY,
  OFFICIAL_SPEED,
  DT,
} from './data';
import { noteHighlight, noteIncident } from './replay';
import { FOURTH, knockDown, officialTarget, startFoul, startOffside } from './scenes';
import { MatchState, Official, Role, Side } from './types';

// The referee and the linesmen: fouls and their cards, offside, and where the officials stand.
// Deciding is here; the restart that follows is set by match.ts through `restartFor`, passed
// in to keep the two files from importing each other, and what the bodies act out after a
// decision (the referee running in, the card, the player walking off) is scenes.ts.

export type FoulKind = 'slideMiss' | 'slideBehind' | 'stand';

export type RestartFor = (
  m: MatchState,
  kind: 'freekick' | 'penalty' | 'goalkick',
  side: Side,
  x: number,
  z: number
) => void;

// The referee (0), the two linesmen (1 runs the near touchline, 2 the far one) and the fourth
// official (3), between the benches with the substitution board.
export const newOfficials = (): Official[] =>
  [
    { x: -10, z: -8 },
    { x: 26, z: HALF_WIDTH + LINESMAN_OFFSET },
    { x: -26, z: -(HALF_WIDTH + LINESMAN_OFFSET) },
    FOURTH,
  ].map(
    ({ x, z }): Official => ({
      x,
      z,
      vx: 0,
      vz: 0,
      face: 0,
      action: 'none',
      busy: 0,
      card: undefined,
      aim: undefined,
      board: undefined,
    })
  );

const act = (o: Official, action: Official['action'], busy: number) => {
  o.action = action;
  o.busy = busy;
};

// Sent off: out of the match at once, though the body stays for the card and then walks to
// the tunnel (scenes.ts). A keeper's role goes to the defender nearest the goal, who keeps
// that place until the coach can bring the bench keeper on.
export const sendOff = (m: MatchState, i: number): void => {
  const p = m.players[i];
  Object.assign(p, { off: true, out: 'red', seat: -1, vx: 0, vz: 0, busy: 0, action: 'none' });
  if (m.ball.owner === i) m.ball.owner = -1;
  if (p.role === 'gk') {
    const gx = ownGoalX(m, p.side);
    const next = teammates(m, p.side).sort(
      (a, b) => Math.abs(m.players[a].x - gx) - Math.abs(m.players[b].x - gx)
    )[0];
    if (next !== undefined) {
      m.players[next].role = 'gk';
      m.players[next].homeX = -50;
      m.players[next].homeZ = 0;
    }
  }
};

// Whether the offender was the last man and the victim was running at goal: denying a clear
// chance is a red.
const clearChance = (m: MatchState, offender: number, victim: number): boolean => {
  const o = m.players[offender];
  const v = m.players[victim];
  const gx = ownGoalX(m, o.side);
  const toGoal = len(gx - v.x, -v.z);
  if (toGoal > 30) return false;
  const f = attackDir(m, v.side);
  const behindVictim = teammates(m, o.side).filter(
    (j) => j !== offender && m.players[j].role !== 'gk' && m.players[j].x * f > v.x * f
  );
  return behindVictim.length === 0;
};

// A foul: the card (if any), the call shown while play waits, and the free kick or, inside
// the offender's own box, the penalty.
export const foul = (
  m: MatchState,
  offender: number,
  victim: number,
  kind: FoulKind,
  restartFor: RestartFor
): void => {
  const o = m.players[offender];
  const v = m.players[victim];
  m.events.push({ type: 'foul', player: offender, victim });
  let card: 'yellow' | 'red' | undefined;
  const r = rand(m);
  if (clearChance(m, offender, victim) && rand(m) < FOUL.redChance) card = 'red';
  else if (kind === 'slideBehind') {
    if (r < FOUL.redBehind) card = 'red';
    else if (r < FOUL.redBehind + FOUL.yellowBehind) card = 'yellow';
  } else if (kind === 'slideMiss') card = r < FOUL.yellowSlide ? 'yellow' : undefined;
  else card = r < FOUL.yellowStand ? 'yellow' : undefined;
  let secondYellow = false;
  if (card === 'yellow') {
    o.yellow += 1;
    if (o.yellow >= 2) {
      card = 'red';
      secondYellow = true;
    }
  }
  const minute = Math.min(90, Math.floor(m.clock / 60) + 1);
  if (card) {
    m.events.push({ type: 'card', player: offender, color: card });
    m.cards.push({ side: o.side, num: o.num, minute, color: card });
  }

  const gx = ownGoalX(m, o.side);
  const inBox = Math.abs(v.x - gx) < BOX_DEPTH && Math.abs(v.z) < BOX_HALF_WIDTH;
  const x = clamp(v.x, -HALF_LENGTH + 1, HALF_LENGTH - 1);
  const z = clamp(v.z, -HALF_WIDTH + 1, HALF_WIDTH - 1);
  // Down before the restart is set, so whoever takes it isn't the one lying hurt.
  knockDown(m, victim);
  m.events.push({ type: 'whistle', kind: 'foul' });
  const { side } = v;
  if (inBox) restartFor(m, 'penalty', side, 0, 0);
  else restartFor(m, 'freekick', side, x, z);
  m.call = { kind: inBox ? 'penalty' : 'foul', player: offender, card, secondYellow };
  // Noted before a red takes the offender off, so the video referee can give them back.
  noteIncident(m, {
    kind: 'foul',
    penalty: inBox,
    offender,
    victim,
    card,
    secondYellow,
    x,
    z,
    roles: m.players.flatMap((p, i) =>
      p.side === o.side && !p.off
        ? [[i, p.role, p.homeX, p.homeZ] as [number, Role, number, number]]
        : []
    ),
    ox: o.x,
    oz: o.z,
    subs: m.subs.length,
  });
  if (card === 'red') sendOff(m, offender);
  // A booking or a penalty is shown again; a plain foul isn't worth stopping for.
  if (card || inBox) noteHighlight(m, inBox ? 'penalty' : 'foul', offender, x, z);
  startFoul(m, offender, victim, card, inBox, x, z);
};

// Whether a failed or clumsy challenge is a foul, and of which kind. A slide from behind is
// judged by the slider coming the same way the carrier faces.
export const judgeSlide = (
  m: MatchState,
  slider: number,
  carrier: number,
  wonBall: boolean
): FoulKind | undefined => {
  const s = m.players[slider];
  const c = m.players[carrier];
  const along = s.actX * dcos(c.face) + s.actZ * dsin(c.face);
  const behind = along > 0.5;
  if (behind && rand(m) < (wonBall ? FOUL.slideBehind * 0.5 : 1)) return 'slideBehind';
  if (!wonBall && rand(m) < FOUL.slideMiss) return 'slideMiss';
  return undefined;
};

export const judgeStand = (m: MatchState): FoulKind | undefined =>
  rand(m) < FOUL.stand ? 'stand' : undefined;

// A player touches the ball: caught offside if they were in an offside position when a
// teammate last played it. Any touch ends that phase of play. Returns whether it was offside.
export const touch = (m: MatchState, i: number, restartFor: RestartFor): boolean => {
  const caught = m.ball.offside.find(([j]) => j === i);
  m.ball.offside = [];
  if (!caught) return false;
  const [, x, z] = caught;
  const p = m.players[i];
  m.events.push({ type: 'offside', player: i });
  m.events.push({ type: 'whistle', kind: 'foul' });
  // The linesman of that half raises the flag.
  const linesman = x > 0 ? m.officials[1] : m.officials[2];
  act(linesman, 'flag', 150);
  restartFor(
    m,
    'freekick',
    (1 - p.side) as Side,
    clamp(x, -HALF_LENGTH + 1, HALF_LENGTH - 1),
    clamp(z, -HALF_WIDTH + 1, HALF_WIDTH - 1)
  );
  m.call = { kind: 'offside', player: i };
  noteHighlight(m, 'offside', i, x, z);
  noteIncident(m, { kind: 'offside', player: i, x, z });
  startOffside(m, i, x, z);
  return true;
};

// The second-last defender of the side defending the end at `end` (+1 or -1), as an x. The
// replay of an offside draws it too.
export const offsideLine = (m: MatchState, end: number): number => {
  const defending: Side = attackDir(m, 0) === end ? 1 : 0;
  const xs = m.players
    .filter((p) => p.side === defending && !p.off)
    .map((p) => p.x * end)
    .sort((a, b) => b - a);
  return (xs[1] ?? 0) * end;
};

const moveOfficial = (
  o: Official,
  tx: number,
  tz: number,
  look: { x: number; z: number },
  hurry = false
) => {
  if (o.busy > 0) {
    o.busy -= 1;
    o.vx *= 0.8;
    o.vz *= 0.8;
    if (o.busy === 0) {
      o.action = 'none';
      o.card = undefined;
      o.aim = undefined;
      o.board = undefined;
    }
  } else {
    const dx = tx - o.x;
    const dz = tz - o.z;
    const d = len(dx, dz);
    const top = OFFICIAL_SPEED * (hurry ? OFFICIAL_HURRY : 1);
    const speed = d < 0.5 ? 0 : Math.min(top, d * 1.5);
    const k = d > 0 ? speed / d : 0;
    o.vx += (dx * k - o.vx) * 0.12;
    o.vz += (dz * k - o.vz) * 0.12;
  }
  o.x += o.vx * DT;
  o.z += o.vz * DT;
  // A signal faces its way; moving, they face where they go; standing, they watch the ball.
  if (o.busy > 0 && o.aim !== undefined) o.face = o.aim;
  else o.face = len(o.vx, o.vz) > 1 ? datan2(o.vz, o.vx) : datan2(look.z - o.z, look.x - o.x);
};

// The referee keeps about 12 m off the ball, on its far side; each linesman follows the
// offside line of the half they run, or the ball when it is past it.
export const moveOfficials = (m: MatchState): void => {
  const { ball } = m;
  const [ref, near, far, fourth] = m.officials;
  const rx = clamp(ball.x - 9, -HALF_LENGTH + 4, HALF_LENGTH - 4);
  const rz = clamp(ball.z - 9, -HALF_WIDTH + 3, HALF_WIDTH - 3);
  const awayFromPlayers = m.players.some((p) => !p.off && dist(p, { x: rx, z: rz }) < 2) ? 3 : 0;
  const scripted = officialTarget(m, 0);
  if (scripted) moveOfficial(ref, scripted.x, scripted.z, ball, scripted.hurry);
  else moveOfficial(ref, rx, rz + awayFromPlayers, ball);
  const lineFor = (end: number) => {
    const line = offsideLine(m, end);
    const x = ball.x * end > line * end ? ball.x : line;
    return end > 0 ? clamp(x, 0, HALF_LENGTH) : clamp(x, -HALF_LENGTH, 0);
  };
  moveOfficial(near, lineFor(1), HALF_WIDTH + LINESMAN_OFFSET, ball);
  moveOfficial(far, lineFor(-1), -(HALF_WIDTH + LINESMAN_OFFSET), ball);
  if (fourth) moveOfficial(fourth, FOURTH.x, FOURTH.z, ball);
};
