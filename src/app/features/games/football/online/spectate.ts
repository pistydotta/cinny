import { step } from '../engine/match';
import { PackedInput, unpackInput } from '../engine/net';
import { GameEvent, MatchState } from '../engine/types';

// Watching from the stands: the API sends the match once (or its setup at kick-off) and then
// both players' confirmed inputs in small batches; we step the same engine with them. A small
// buffer keeps it smooth: it plays a little behind, catches up when the buffer grows and waits
// when it runs dry. Nothing here guesses, so it never rolls back.

// Ticks to gather before playing (again), and the buffer above which it plays faster.
const START_AT = 8;
const CATCH_UP = 24;

export class SpectatorFeed {
  match: MatchState;

  private frames: [PackedInput, PackedInput][] = [];

  private waiting = true;

  constructor(state: MatchState) {
    this.match = structuredClone(state);
  }

  reset(state: MatchState): void {
    this.match = structuredClone(state);
    this.frames = [];
    this.waiting = true;
  }

  // Inputs for ticks `from`, from + 1, ...; ticks we already have are skipped.
  push(from: number, frames: [PackedInput, PackedInput][]): void {
    const next = this.match.tick + this.frames.length + 1;
    const skip = next - from;
    if (skip < 0) return;
    this.frames.push(...frames.slice(skip));
  }

  get buffered(): number {
    return this.frames.length;
  }

  // One tick of the screen's clock: zero, one or two ticks of the match.
  advance(): GameEvent[] | null {
    if (this.waiting) {
      if (this.frames.length < START_AT) return null;
      this.waiting = false;
    }
    if (this.frames.length === 0) {
      this.waiting = true;
      return null;
    }
    const steps = this.frames.length > CATCH_UP ? 2 : 1;
    const events: GameEvent[] = [];
    for (let k = 0; k < steps && this.frames.length > 0; k += 1) {
      const [a, b] = this.frames.shift() as [PackedInput, PackedInput];
      step(this.match, [unpackInput(a), unpackInput(b)]);
      events.push(...this.match.events);
    }
    return events;
  }
}
