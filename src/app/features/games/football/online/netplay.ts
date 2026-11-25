import { step } from '../engine/match';
import { PackedInput, hashMatch, packInput, sameInput, unpackInput } from '../engine/net';
import { GameEvent, Input, MatchState, NO_INPUT } from '../engine/types';

// One person's copy of an online match, with rollback (the GGPO way): every tick all the
// people's inputs go into the engine, ours read a few ticks ahead and the others' guessed (the
// last one we got from each) until they arrive. When one arrives different from the guess,
// the match goes back to the last state everyone agreed on and steps forward again with the
// real inputs, all within a frame.
//
// Ticks: a match's `tick` is the last one stepped; stepping tick t needs every slot's input
// for t. `confirmed` is the last tick stepped with real inputs from everyone, so nothing up to
// it can change; states after it are kept to roll back to.

// Ticks between pressing a key and the engine using it: the others' inputs usually arrive
// within this, so most ticks need no guess.
export const INPUT_DELAY = 3;
// How far we may step past the confirmed tick before waiting for the others.
export const MAX_AHEAD = 15;
// A hash of the confirmed match goes to the API every this many ticks.
export const HASH_EVERY = 60;

export type NetOut = {
  sendInput: (t: number, input: PackedInput) => void;
  sendHash: (t: number, hash: number) => void;
};

// Inputs the API holds past a state: [slot, tick, input].
export type Pending = [number, number, PackedInput][];

export class Netplay {
  match: MatchState;

  confirmed: number;

  private inputs: Map<number, Input>[] = [];

  // Each tick's inputs as played, guessed or real.
  private used = new Map<number, Input[]>();

  // The match after each tick from `confirmed` on.
  private states = new Map<number, MatchState>();

  private ownMax = 0;

  // Each slot's newest real input and its tick.
  private latest: { t: number; input: Input }[] = [];

  private rollbackFrom: number | undefined;

  // For the netcode tests: how many ticks were stepped again.
  resteps = 0;

  constructor(
    // Our slot in setup.slots.
    readonly slot: number,
    state: MatchState,
    private out: NetOut,
    pending: Pending = []
  ) {
    this.match = structuredClone(state);
    this.confirmed = state.tick;
    this.reset(state, pending);
  }

  private get slots(): number {
    return this.match.setup.slots.length;
  }

  // Starts again from a state the API sent (joining late, back from a reconnection, or after a
  // copy drifted), with the inputs the API holds past it.
  reset(state: MatchState, pending: Pending): void {
    // Inputs of ours already sent past that state stay ours: some may still be on their way to
    // the API, which will play them.
    const sent = [...(this.inputs[this.slot]?.entries() ?? [])].filter(([t]) => t > state.tick);
    this.match = structuredClone(state);
    this.confirmed = state.tick;
    const n = state.setup.slots.length;
    this.inputs = Array.from({ length: n }, (_, s) => new Map(s === this.slot ? sent : []));
    this.latest = Array.from({ length: n }, (_, s) => ({
      t: state.tick,
      input: state.people[s]?.prev ?? NO_INPUT,
    }));
    this.used.clear();
    this.states.clear();
    this.states.set(state.tick, structuredClone(state));
    this.rollbackFrom = undefined;
    this.ownMax = Math.max(state.tick, ...sent.map(([t]) => t));
    pending.forEach(([s, t, packed]) => {
      if (t <= state.tick || s < 0 || s >= n) return;
      const input = unpackInput(packed);
      this.inputs[s].set(t, input);
      if (s === this.slot) this.ownMax = Math.max(this.ownMax, t);
      else if (t > this.latest[s].t) this.latest[s] = { t, input };
    });
    // Our first ticks are already late for real input: they are played standing still.
    for (let t = this.ownMax + 1; t <= state.tick + INPUT_DELAY; t += 1) this.setOwn(t, NO_INPUT);
  }

  private setOwn(t: number, input: Input) {
    this.inputs[this.slot].set(t, input);
    this.ownMax = t;
    this.out.sendInput(t, packInput(input));
  }

  // Another person's input for tick t, relayed by the API.
  remoteInput(slot: number, t: number, packed: PackedInput): void {
    if (slot === this.slot || slot < 0 || slot >= this.slots) return;
    if (t <= this.confirmed || this.inputs[slot].has(t)) return;
    const input = unpackInput(packed);
    this.inputs[slot].set(t, input);
    if (t > this.latest[slot].t) this.latest[slot] = { t, input };
    const played = this.used.get(t);
    if (t <= this.match.tick && played && !sameInput(played[slot], input))
      this.rollbackFrom = Math.min(this.rollbackFrom ?? t, t);
  }

  private inputsFor(t: number): Input[] {
    return this.inputs.map(
      (known, s) => known.get(t) ?? (s === this.slot ? NO_INPUT : this.latest[s].input)
    );
  }

  private stepOnce(): GameEvent[] {
    const t = this.match.tick + 1;
    const inputs = this.inputsFor(t);
    this.used.set(t, inputs);
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
    while (
      this.confirmed < this.match.tick &&
      this.inputs.every((known) => known.has(this.confirmed + 1))
    ) {
      this.states.delete(this.confirmed);
      this.inputs.forEach((known) => known.delete(this.confirmed));
      this.used.delete(this.confirmed);
      this.confirmed += 1;
      if (this.confirmed % HASH_EVERY === 0) {
        const state = this.states.get(this.confirmed);
        if (state) this.out.sendHash(this.confirmed, hashMatch(state));
      }
    }
  }

  // How many ticks we run ahead of the slowest other person, once the time their inputs take
  // to arrive (`lagTicks`) is counted. Above 1 the runner slows down a little so nobody keeps
  // rolling back.
  advantage(lagTicks: number): number {
    const others = this.latest.filter((_, s) => s !== this.slot).map((l) => l.t);
    if (others.length === 0) return 0;
    return this.match.tick - (Math.min(...others) - INPUT_DELAY + lagTicks);
  }

  // Waiting for the others: too far past the last tick everyone agreed on.
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
