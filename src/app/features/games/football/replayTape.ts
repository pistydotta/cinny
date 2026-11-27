import { attackDir } from './engine/actions';
import { offsideLine } from './engine/referee';
import { Ball, MatchState, Official, Player, Replay } from './engine/types';

// The match as it looked over the last seconds, for replays (engine/replay.ts says which ticks
// to show and when). Each computer records the ticks it steps for good: every tick here, the
// confirmed ones online (a guess rolled back is never shown again), and those a watcher plays.
// Ticks while a replay plays are the match standing still and aren't kept.

// About 20 seconds: a replay reaches back at most a few seconds before a moment, and starts at
// most a few seconds after it (the longest is a foul scene's).
export const TAPE_TICKS = 1200;

type BodyFrame = Pick<
  Player,
  'x' | 'z' | 'vx' | 'vz' | 'face' | 'action' | 'actX' | 'actZ' | 'off' | 'out'
>;
type OfficialFrame = Pick<Official, 'x' | 'z' | 'vx' | 'vz' | 'face' | 'action' | 'card' | 'board'>;
type BallFrame = Pick<Ball, 'x' | 'y' | 'z' | 'vx' | 'vy' | 'vz'>;

export type Frame = {
  tick: number;
  players: BodyFrame[];
  officials: OfficialFrame[];
  ball: BallFrame;
};

const body = (p: Player): BodyFrame => ({
  x: p.x,
  z: p.z,
  vx: p.vx,
  vz: p.vz,
  face: p.face,
  action: p.action,
  actX: p.actX,
  actZ: p.actZ,
  off: p.off,
  out: p.out,
});

const official = (o: Official): OfficialFrame => ({
  x: o.x,
  z: o.z,
  vx: o.vx,
  vz: o.vz,
  face: o.face,
  action: o.action,
  card: o.card,
  board: o.board,
});

const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

// Turning the short way round.
const lerpAngle = (a: number, b: number, f: number) => {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * f;
};

const between = <T extends { x: number; z: number; vx: number; vz: number; face: number }>(
  a: T,
  b: T,
  f: number
): T => ({
  ...a,
  x: lerp(a.x, b.x, f),
  z: lerp(a.z, b.z, f),
  vx: lerp(a.vx, b.vx, f),
  vz: lerp(a.vz, b.vz, f),
  face: lerpAngle(a.face, b.face, f),
});

export class ReplayTape {
  private frames: (Frame | undefined)[] = new Array(TAPE_TICKS);

  record(m: MatchState): void {
    if (m.replay || m.varReview) return;
    this.frames[m.tick % TAPE_TICKS] = {
      tick: m.tick,
      players: m.players.map(body),
      officials: m.officials.map(official),
      ball: {
        x: m.ball.x,
        y: m.ball.y,
        z: m.ball.z,
        vx: m.ball.vx,
        vy: m.ball.vy,
        vz: m.ball.vz,
      },
    };
  }

  get(tick: number): Frame | undefined {
    if (!Number.isInteger(tick) || tick < 0) return undefined;
    const f = this.frames[tick % TAPE_TICKS];
    return f && f.tick === tick ? f : undefined;
  }

  // The match at `tick` (with a fraction, between two ticks) for the renderer: the live match
  // with the bodies and the ball where they were. Undefined when this computer didn't see that
  // tick (a watcher who came in later, a player back from a reconnection).
  view(live: MatchState, tick: number): MatchState | undefined {
    const t = Math.floor(tick);
    const a = this.get(t);
    if (!a) return undefined;
    const b = this.get(t + 1) ?? a;
    const f = tick - t;
    return {
      ...live,
      phase: 'play',
      scene: undefined,
      players: live.players.map((p, i) => ({ ...p, ...between(a.players[i], b.players[i], f) })),
      officials: live.officials.map((o, k) => ({
        ...o,
        ...between(a.officials[k], b.officials[k], f),
      })),
      ball: {
        ...live.ball,
        x: lerp(a.ball.x, b.ball.x, f),
        y: lerp(a.ball.y, b.ball.y, f),
        z: lerp(a.ball.z, b.ball.z, f),
        vx: lerp(a.ball.vx, b.ball.vx, f),
        vy: lerp(a.ball.vy, b.ball.vy, f),
        vz: lerp(a.ball.vz, b.ball.vz, f),
      },
    };
  }
}

// What the replay's cameras need besides the picture: the end of the pitch it happened at
// (behind which goal), and for an offside the line of the second-last defender as it moves.
export const replayMarks = (
  r: Pick<Replay, 'kind' | 'x' | 'who'>,
  view: MatchState
): { end: number; line: number | undefined } => {
  const end = Math.sign(r.x) || 1;
  if (r.kind !== 'offside' || r.who < 0) return { end, line: undefined };
  const attacking = attackDir(view, view.players[r.who].side);
  return { end: attacking, line: offsideLine(view, attacking) };
};
