/* eslint-disable no-param-reassign */
import { REPLAY_AFTER, REPLAY_STALE, REPLAY_TAKES, ReplayCam } from './data';
import { sceneHolds } from './scenes';
import { Input, MatchState, NO_INPUT, Replay, ReplayKind, Side, VarIncident } from './types';

// Replays, the way football on TV shows them: once the ball is dead after a goal, a booking or a
// penalty, an offside, a save or a shot off the post, the match stands still and the moment
// plays again, in takes from other cameras and in slow motion. The replay is match state like
// a scene, started and ended on the same tick on every computer and the API, so nobody plays on
// while someone else watches it.
//
// The engine keeps no pictures: it only says which ticks to show and when (`replayShot`). Each
// computer keeps the match as it was a few seconds back (`ReplayTape` in ../replayTape.ts) and
// draws those ticks. A person skips with pass or shoot; it ends once every side with people has.
//
// match.ts calls `replayDue` and `stepReplay` at the top of each tick; referee.ts and match.ts
// call `noteHighlight` where the moments happen.

// The moment just now, if it's worth a replay: the newest one replaces an older one still
// waiting (a shot off the post and the goal from the rebound shows the goal).
export const noteHighlight = (
  m: MatchState,
  kind: ReplayKind,
  who: number,
  x: number,
  z: number
): void => {
  m.highlight = { kind, at: m.tick, dead: -1, who, x, z, floor: m.replayEnd };
};

// A decision the video referee may review until play goes on (var.ts): a newer one replaces it.
// Passed without `at` and `floor`, which are now's.
type Note<T> = T extends unknown ? Omit<T, 'at' | 'floor'> : never;

export const noteIncident = (m: MatchState, incident: Note<VarIncident>): void => {
  m.varIncident = { ...incident, at: m.tick, floor: m.replayEnd } as VarIncident;
};

const first = (r: Pick<Replay, 'at' | 'floor'>, before: number) => Math.max(r.at - before, r.floor);

// Ticks of the match each take shows, and the replay's length in ticks.
const takeSpan = (r: Pick<Replay, 'kind' | 'at' | 'floor'>, k: number) => {
  const take = REPLAY_TAKES[r.kind][k];
  const from = first(r, take.before);
  return { take, from, ticks: r.at + take.after - from };
};

export const replayLength = (r: Pick<Replay, 'kind' | 'at' | 'floor'>): number =>
  REPLAY_TAKES[r.kind].reduce((sum, take, k) => sum + takeSpan(r, k).ticks * take.slow, 0);

// What the screen shows `t` ticks into a replay (t may have a fraction, for smooth slow motion):
// the take, its camera, the match tick (with a fraction) and how slowly it plays.
export const replayShot = (
  r: Pick<Replay, 'kind' | 'at' | 'floor'>,
  t: number
): { take: number; cam: ReplayCam; tick: number; slow: number } => {
  const takes = REPLAY_TAKES[r.kind];
  let left = Math.max(0, t);
  for (let k = 0; k < takes.length; k += 1) {
    const { take, from, ticks } = takeSpan(r, k);
    const span = ticks * take.slow;
    if (left < span || k === takes.length - 1) {
      return {
        take: k,
        cam: take.cam,
        tick: from + Math.min(ticks, left / take.slow),
        slow: take.slow,
      };
    }
    left -= span;
  }
  // Every kind has a take; this is never reached.
  return { take: 0, cam: 'tv', tick: r.at, slow: 1 };
};

// Starts the replay of the waiting moment when its time comes: the goal celebration over, or
// REPLAY_AFTER ticks into a stoppage once any scene lets the restart go. Forgets a moment play
// ran on from, or one before half time. True when a replay starts this tick.
export const replayDue = (m: MatchState): boolean => {
  const h = m.highlight;
  if (!h) return false;
  if (m.phase === 'halftime' || m.phase === 'over') {
    m.highlight = undefined;
    return false;
  }
  if (m.phase === 'play') {
    if (h.dead >= 0 || m.tick - h.at > REPLAY_STALE) m.highlight = undefined;
    return false;
  }
  if (h.dead < 0) h.dead = m.tick;
  // The goal's wait would run out this tick and set up the kick-off.
  const ready =
    m.phase === 'goal' ? m.wait <= 1 : !sceneHolds(m) && m.tick - h.dead >= REPLAY_AFTER;
  if (!ready) return false;
  m.highlight = undefined;
  m.replay = { ...h, t: 0, length: replayLength(h), skip: [false, false] };
  m.events.push({ type: 'replay', kind: h.kind, stage: 'start' });
  return true;
};

const pressed = (input: Input, before: Input) =>
  (input.pass && !before.pass) || (input.shoot && !before.shoot);

// One tick of the replay: nothing else in the match moves. Pass or shoot pressed by a person
// votes to skip for their side.
export const stepReplay = (m: MatchState, inputs: Input[]): void => {
  const r = m.replay;
  if (!r) return;
  r.t += 1;
  m.people.forEach((person, s) => {
    if (pressed(inputs[s] ?? NO_INPUT, person.prev)) r.skip[m.setup.slots[s]] = true;
  });
  const sides = ([0, 1] as Side[]).filter((side) => m.setup.slots.includes(side));
  const skipped = sides.length > 0 && sides.every((side) => r.skip[side]);
  if (r.t < r.length && !skipped) return;
  m.replay = undefined;
  m.replayEnd = m.tick;
  m.events.push({ type: 'replay', kind: r.kind, stage: 'end' });
};
