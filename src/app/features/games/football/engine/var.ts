/* eslint-disable no-param-reassign */
import { HALF_LENGTH, VAR } from './data';
import { RestartFor, sendOff } from './referee';
import { replayLength } from './replay';
import { endScene, sceneHolds } from './scenes';
import {
  Action,
  MatchState,
  Order,
  ReplayKind,
  Side,
  VarChoice,
  VarIncident,
  VarReview,
} from './types';

// The video referee. Online, the people watching (never the players) can ask for the referee's
// last decision to be reviewed while play is stopped: a goal, a foul (free kick or penalty, and
// its card) or an offside. Everyone then watches the moment again on a loop while the watchers
// vote; the most voted option wins, and a tie or no votes leaves the referee's call. A decision
// changed is put right in the match: the goal taken off the score, the card taken back (a red
// given back to the pitch) or a new one shown, and the restart set again.
//
// Asking and voting reach the match as orders (`Order`), which the API stamps on a tick nobody
// has stepped for good yet, so every copy and the API take them on the same tick (rollback
// covers a player who already guessed past it). The match stands still during the review, like
// a replay. Nothing here runs offline: without orders there is never a review.
//
// match.ts calls `varWindow`, `applyOrders` and `stepVar` at the top of each tick; referee.ts and
// match.ts note the decisions (`noteIncident` in replay.ts).

export const replayKindOf = (i: VarIncident): ReplayKind => {
  if (i.kind === 'foul') return i.penalty ? 'penalty' : 'foul';
  return i.kind;
};

// Whose decision it is: the scorer, the offender or the player flagged.
export const incidentWho = (i: VarIncident): number => {
  if (i.kind === 'goal') return i.scorer;
  if (i.kind === 'foul') return i.offender;
  return i.player;
};

// A red can't be given back once a substitution has been made since: the stand-in keeper may
// have gone off, or the bench keeper come on.
const redLocked = (m: MatchState, i: VarIncident) =>
  i.kind === 'foul' && i.card === 'red' && m.subs.length > i.subs;

// A decision can be reviewed until play goes on, and not twice.
export const varWindow = (m: MatchState): void => {
  if (m.varIncident && (m.phase === 'play' || m.phase === 'halftime' || m.phase === 'over'))
    m.varIncident = undefined;
};

// Whether a review may start now: a decision to review, none under way, and no scene holding
// the restart (the card is shown before anyone reviews it, a substitution finishes).
export const canCallVar = (m: MatchState): boolean => {
  const i = m.varIncident;
  if (!i || m.varReview || m.phase === 'play' || m.phase === 'halftime' || m.phase === 'over')
    return false;
  return !sceneHolds(m) && !redLocked(m, i);
};

export const varOptions = (i: VarIncident): { options: VarChoice[]; called: number } => {
  if (i.kind === 'goal') return { options: ['goal', 'nogoal_offside', 'nogoal_foul'], called: 0 };
  if (i.kind === 'offside') return { options: ['offside', 'onside'], called: 0 };
  let called = 1;
  if (i.card === 'yellow') called = 2;
  else if (i.card === 'red') called = 3;
  return { options: ['nofoul', 'foul', 'yellow', 'red'], called };
};

const startReview = (m: MatchState, voters: number) => {
  const i = m.varIncident as VarIncident;
  m.varIncident = undefined;
  // The review's own replay takes over from the usual one.
  m.highlight = undefined;
  if (m.replay) {
    m.events.push({ type: 'replay', kind: m.replay.kind, stage: 'end' });
    m.replay = undefined;
    m.replayEnd = m.tick;
  }
  const { options, called } = varOptions(i);
  m.varReview = {
    incident: i,
    options,
    called,
    votes: options.map(() => 0),
    voters,
    t: 0,
    watch: replayLength({ kind: replayKindOf(i), at: i.at, floor: i.floor }),
    verdict: -1,
    shown: 0,
  };
  m.events.push({ type: 'var', stage: 'review' });
};

// This tick's orders. Ones that come too late (play went on, the vote closed) or don't make
// sense change nothing, the same way on every copy.
export const applyOrders = (m: MatchState, orders: readonly Order[]): void => {
  orders.forEach((o) => {
    if (!o || typeof o !== 'object') return;
    if (o.kind === 'var') {
      if (!Number.isInteger(o.voters) || !canCallVar(m)) return;
      startReview(m, Math.max(1, Math.min(VAR.maxVoters, o.voters)));
    } else if (o.kind === 'vote') {
      const r = m.varReview;
      if (!r || r.verdict >= 0 || !Number.isInteger(o.choice)) return;
      if (o.choice < 0 || o.choice >= r.options.length) return;
      r.votes[o.choice] += 1;
    }
  });
};

// The most voted option; a tie at the top, or no votes, leaves the referee's call.
export const varWinner = (r: Pick<VarReview, 'votes' | 'called'>): number => {
  const top = Math.max(...r.votes);
  if (top === 0 || r.votes.filter((v) => v === top).length > 1) return r.called;
  return r.votes.indexOf(top);
};

const CELEBRATING: Action[] = ['celebrate', 'cheer', 'airplane', 'kneeslide', 'dejected'];

// A red given back: the offender back where they stood, the side's roles as they were (a keeper's
// gloves back from the stand-in), and the change the CPU coach queued for the stand-in dropped.
const giveBack = (m: MatchState, i: Extract<VarIncident, { kind: 'foul' }>) => {
  const o = m.players[i.offender];
  Object.assign(o, {
    off: false,
    out: undefined,
    seat: -1,
    x: i.ox,
    z: i.oz,
    vx: 0,
    vz: 0,
    action: 'none',
    busy: 0,
  });
  const moved = new Set<number>([i.offender]);
  i.roles.forEach(([k, role, homeX, homeZ]) => {
    const p = m.players[k];
    if (p.role !== role || p.homeX !== homeX || p.homeZ !== homeZ) moved.add(k);
    Object.assign(p, { role, homeX, homeZ });
  });
  m.subQueue = m.subQueue.filter((q) => !moved.has(q.out));
};

const minuteNow = (m: MatchState) => Math.min(90, Math.floor(m.clock / 60) + 1);

const changeFoul = (
  m: MatchState,
  i: Extract<VarIncident, { kind: 'foul' }>,
  choice: VarChoice,
  restartFor: RestartFor
) => {
  const o = m.players[i.offender];
  // The referee's card taken back (a second yellow's red takes the yellow back too).
  if (i.card) {
    for (let k = m.cards.length - 1; k >= 0; k -= 1) {
      const c = m.cards[k];
      if (c.side === o.side && c.num === o.num && c.color === i.card) {
        m.cards.splice(k, 1);
        break;
      }
    }
    if (i.card === 'yellow' || i.secondYellow) o.yellow -= 1;
    if (i.card === 'red') giveBack(m, i);
  }
  // Then the card the vote chose: a yellow on a booked player is a red.
  let card: 'yellow' | 'red' | undefined;
  if (choice === 'yellow') card = 'yellow';
  else if (choice === 'red') card = 'red';
  let secondYellow = false;
  if (card === 'yellow') {
    o.yellow += 1;
    if (o.yellow >= 2) {
      card = 'red';
      secondYellow = true;
    }
  }
  if (card) {
    m.cards.push({ side: o.side, num: o.num, minute: minuteNow(m), color: card });
    m.events.push({ type: 'card', player: i.offender, color: card });
    if (card === 'red') sendOff(m, i.offender);
  }
  if (m.scene?.kind === 'foul') endScene(m);
  if (choice === 'nofoul') {
    // A fair challenge: the ball is the challenger's side's, where it happened.
    const v = m.players[i.victim];
    if (v.action === 'down') Object.assign(v, { action: 'none', busy: 0 });
    restartFor(m, 'freekick', o.side, i.x, i.z);
    m.call = undefined;
  } else {
    m.call = { kind: i.penalty ? 'penalty' : 'foul', player: i.offender, card, secondYellow };
  }
};

// Puts a changed decision right in the match.
const change = (m: MatchState, i: VarIncident, choice: VarChoice, restartFor: RestartFor) => {
  if (i.kind === 'goal') {
    // Ruled out: off the score, the celebrations stop, and a goal kick.
    m.score[i.side] -= 1;
    m.scorers.pop();
    if (m.scene?.kind === 'goal') endScene(m);
    m.players.forEach((p) => {
      if (!p.off && CELEBRATING.includes(p.action)) Object.assign(p, { action: 'none', busy: 0 });
    });
    const end = Math.sign(i.x) || 1;
    restartFor(
      m,
      'goalkick',
      (1 - i.side) as Side,
      end * (HALF_LENGTH - 5.5),
      (Math.sign(i.z) || 1) * 4
    );
    m.call = undefined;
  } else if (i.kind === 'foul') {
    changeFoul(m, i, choice, restartFor);
  } else {
    // Onside after all: the ball is the attackers', where the player stood.
    if (m.scene?.kind === 'offside') endScene(m);
    m.officials.forEach((o) => {
      if (o.action === 'flag' || o.action === 'indirect')
        Object.assign(o, { action: 'none', busy: 0, aim: undefined });
    });
    restartFor(m, 'freekick', m.players[i.player].side, i.x, i.z);
    m.call = undefined;
  }
};

// One tick of the review: the vote closes after its longest, or once everyone watching has voted
// and the moment has played once; the verdict then shows a moment before play goes on.
export const stepVar = (m: MatchState, restartFor: RestartFor): void => {
  const r = m.varReview;
  if (!r) return;
  r.t += 1;
  if (r.verdict < 0) {
    const cast = r.votes.reduce((a, b) => a + b, 0);
    if (r.t < VAR.review && !(r.t >= r.watch && cast >= r.voters)) return;
    r.verdict = varWinner(r);
    const choice = r.options[r.verdict];
    const changed = r.verdict !== r.called;
    if (changed) change(m, r.incident, choice, restartFor);
    m.varLog.push({ minute: minuteNow(m), choice, changed });
    m.events.push({ type: 'var', stage: 'verdict', choice, changed });
    return;
  }
  r.shown += 1;
  if (r.shown < VAR.verdict) return;
  m.varReview = undefined;
  // Like a replay's, these ticks were the match standing still.
  m.replayEnd = m.tick;
};

// The moment on screen while the vote is open, looping: what a replay would show (replay.ts).
export const varReplay = (
  m: MatchState
):
  | { kind: ReplayKind; at: number; floor: number; x: number; who: number; t: number }
  | undefined => {
  const r = m.varReview;
  if (!r || r.verdict >= 0) return undefined;
  const i = r.incident;
  return {
    kind: replayKindOf(i),
    at: i.at,
    floor: i.floor,
    x: i.x,
    who: incidentWho(i),
    t: r.watch > 0 ? r.t % r.watch : 0,
  };
};
