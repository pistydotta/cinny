import { step } from '../engine/match';
import { PackedInput, hashMatch, packInput, sameInput, unpackInput } from '../engine/net';
import { GameEvent, Input, MatchState, NO_INPUT, Side } from '../engine/types';

// One player's side of an online match, with rollback (the GGPO way): every tick both inputs
// go into the engine, ours read a few ticks ahead and the other's guessed (the last one we
// got) until it arrives. When it arrives different from the guess, the match goes back to the
// last state both agreed on and steps forward again with the real inputs, all within a frame.
//
// Ticks: a match's `tick` is the last one stepped; stepping tick t needs both inputs for t.
// `confirmed` is the last tick stepped with real inputs on both sides, so nothing up to it can
// change; states after it are kept to roll back to.

// Ticks between pressing a key and the engine using it: the other player's input usually
// arrives within this, so most ticks need no guess.
export const INPUT_DELAY = 3;
// How far we may step past the confirmed tick before waiting for the other player.
export const MAX_AHEAD = 15;
// A hash of the confirmed match goes to the API every this many ticks.
export const HASH_EVERY = 60;

export type NetOut = {
  sendInput: (t: number, input: PackedInput) => void;
  sendHash: (t: number, hash: number) => void;
};

export type Pending = [Side, number, PackedInput][];

export class Netplay {
  match: MatchState;

  confirmed: number;

  private inputs: [Map<number, Input>, Map<number, Input>] = [new Map(), new Map()];

  // The other side's input each stepped tick was played with, guessed or real.
  private used = new Map<number, Input>();

  // The match after each tick from `confirmed` on.
  private states = new Map<number, MatchState>();

  private ownMax = 0;

  // The other side's newest real input and its tick.
  private remoteMax = 0;

  private lastRemote: Input = NO_INPUT;

  private rollbackFrom: number | undefined;

  // For the netcode tests: how many ticks were stepped again.
  resteps = 0;

  constructor(readonly side: Side, state: MatchState, private out: NetOut, pending: Pending = []) {
    this.match = structuredClone(state);
    this.confirmed = state.tick;
    this.reset(state, pending);
  }

  private get other(): Side {
    return (1 - this.side) as Side;
  }

  // Starts again from a state the API sent (joining late, back from a reconnection, or after a
  // copy drifted), with the inputs the API holds past it.
  reset(state: MatchState, pending: Pending): void {
    // Inputs of ours already sent past that state stay ours: some may still be on their way to
    // the API, which will play them.
    const sent = [...this.inputs[this.side].entries()].filter(([t]) => t > state.tick);
    this.match = structuredClone(state);
    this.confirmed = state.tick;
    this.inputs = [new Map(sent), new Map()];
    this.used.clear();
    this.states.clear();
    this.states.set(state.tick, structuredClone(state));
    this.rollbackFrom = undefined;
    this.ownMax = Math.max(state.tick, ...sent.map(([t]) => t));
    this.remoteMax = state.tick;
    this.lastRemote = state.prev[this.other];
    pending.forEach(([s, t, packed]) => {
      if (t <= state.tick) return;
      const input = unpackInput(packed);
      this.inputs[s].set(t, input);
      if (s === this.side) this.ownMax = Math.max(this.ownMax, t);
      else if (t > this.remoteMax) {
        this.remoteMax = t;
        this.lastRemote = input;
      }
    });
    // Our first ticks are already late for real input: they are played standing still.
    for (let t = this.ownMax + 1; t <= state.tick + INPUT_DELAY; t += 1) this.setOwn(t, NO_INPUT);
  }

  private setOwn(t: number, input: Input) {
    this.inputs[this.side].set(t, input);
    this.ownMax = t;
    this.out.sendInput(t, packInput(input));
  }

  // The other player's input for tick t, relayed by the API.
  remoteInput(t: number, packed: PackedInput): void {
    if (t <= this.confirmed || this.inputs[this.other].has(t)) return;
    const input = unpackInput(packed);
    this.inputs[this.other].set(t, input);
    if (t > this.remoteMax) {
      this.remoteMax = t;
      this.lastRemote = input;
    }
    const guessed = this.used.get(t);
    if (t <= this.match.tick && guessed && !sameInput(guessed, input))
      this.rollbackFrom = Math.min(this.rollbackFrom ?? t, t);
  }

  private remoteFor(t: number): Input {
    return this.inputs[this.other].get(t) ?? this.lastRemote;
  }

  private stepOnce(): GameEvent[] {
    const t = this.match.tick + 1;
    const own = this.inputs[this.side].get(t) ?? NO_INPUT;
    const remote = this.remoteFor(t);
    this.used.set(t, remote);
    const inputs: [Input, Input] = this.side === 0 ? [own, remote] : [remote, own];
    step(this.match, inputs);
    this.states.set(t, structuredClone(this.match));
    return this.match.events;
  }

  private rollback() {
    const from = this.rollbackFrom;
    this.rollbackFrom = undefined;
    if (from === undefined) return;
    const base = this.states.get(from - 1);
    if (!base) return;
    const until = this.match.tick;
    this.match = structuredClone(base);
    while (this.match.tick < until) {
      this.stepOnce();
      this.resteps += 1;
    }
  }

  private confirm() {
    const own = this.inputs[this.side];
    const remote = this.inputs[this.other];
    while (
      this.confirmed < this.match.tick &&
      own.has(this.confirmed + 1) &&
      remote.has(this.confirmed + 1)
    ) {
      this.states.delete(this.confirmed);
      own.delete(this.confirmed);
      remote.delete(this.confirmed);
      this.used.delete(this.confirmed);
      this.confirmed += 1;
      if (this.confirmed % HASH_EVERY === 0) {
        const state = this.states.get(this.confirmed);
        if (state) this.out.sendHash(this.confirmed, hashMatch(state));
      }
    }
  }

  // How many ticks we run ahead of the other player, once the time their inputs take to arrive
  // (`lagTicks`) is counted. Above 1 the runner slows down a little so neither side keeps
  // rolling back.
  advantage(lagTicks: number): number {
    return this.match.tick - (this.remoteMax - INPUT_DELAY + lagTicks);
  }

  // Waiting for the other player: too far past the last tick both agreed on.
  get stalled(): boolean {
    return this.match.tick - this.confirmed >= MAX_AHEAD;
  }

  // One tick of our own: takes this tick's keys for a later tick, fixes any wrong guess, steps.
  // Returns the tick's events, or null when it has to wait.
  advance(keys: Input): GameEvent[] | null {
    this.rollback();
    this.confirm();
    if (this.stalled) return null;
    const ahead = this.match.tick + 1 + INPUT_DELAY;
    if (ahead > this.ownMax) this.setOwn(ahead, keys);
    const events = this.stepOnce();
    this.confirm();
    return events;
  }

  // Fixes guesses without stepping on, for frames where we wait.
  settle(): void {
    this.rollback();
    this.confirm();
  }
}
