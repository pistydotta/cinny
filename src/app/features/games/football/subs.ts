import { MAX_SUBS } from './engine/data';
import { subsUsed } from './engine/scenes';
import { MatchState, Player, Side } from './engine/types';

// What the substitutions screen shows for one side: who is on the pitch and on the bench, the
// changes waiting for the ball to stop (asked here or already in the match) and those made.

export type SquadPlayer = { index: number; num: number; role: Player['role']; yellow: number };

export type SquadView = {
  onPitch: SquadPlayer[];
  bench: SquadPlayer[];
  waiting: { out: SquadPlayer; on: SquadPlayer }[];
  made: MatchState['subs'];
  left: number;
  // Whether another change can be asked for.
  open: boolean;
};

const ROLE_ORDER: Player['role'][] = ['gk', 'def', 'mid', 'fwd'];

export const squadOf = (
  m: MatchState,
  side: Side,
  asked: { side: Side; out: number; on: number }[]
): SquadView => {
  const player = (index: number): SquadPlayer => {
    const { num, role, yellow } = m.players[index];
    return { index, num, role, yellow };
  };
  const byRole = (a: SquadPlayer, b: SquadPlayer) =>
    ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.num - b.num;
  const atLine = m.scene?.kind === 'sub' ? m.scene.out : -1;
  const valid = (q: { side: Side; out: number; on: number }) =>
    q.side === side && q.out !== atLine && !m.players[q.out].off && m.players[q.on].out === 'bench';
  // One per player going off: asked here and already in the match are the same change.
  const seen = new Set<number>();
  const waiting = [...m.subQueue, ...asked].filter(valid).flatMap((q) => {
    if (seen.has(q.out)) return [];
    seen.add(q.out);
    return [{ out: player(q.out), on: player(q.on) }];
  });
  const made = m.subs.filter((s) => s.side === side);
  // Those asked here the match hasn't heard of yet count too.
  const unheard = waiting.filter((w) => !m.subQueue.some((q) => q.out === w.out.index)).length;
  const left = Math.max(0, MAX_SUBS - subsUsed(m, side) - unheard);
  return {
    onPitch: m.players
      .flatMap((p, i) => (p.side === side && !p.off ? [player(i)] : []))
      .sort(byRole),
    bench: m.players
      .flatMap((p, i) => (p.side === side && p.out === 'bench' ? [player(i)] : []))
      .sort(byRole),
    waiting,
    made,
    left,
    open: m.phase !== 'over' && left > 0,
  };
};
