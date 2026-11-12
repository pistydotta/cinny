import { TICK } from './data';
import {
  BANISH,
  CHOOSE,
  CLOSE_CHEST,
  INPUT,
  REROLL,
  ReplayStart,
  SKIP,
  decodeLog,
  inputOf,
  runFrom,
} from './replay';
import { banish, choose, closeChest, reroll, skip, step } from './run';
import { Input, RunState } from './types';

// Playing recorded commands back: the server's check of a report, and "watch this run".

export type ReplayResult = { run: RunState; ok: boolean; reason?: string };

const IDLE: Input = { moveX: 0, moveZ: 0, jump: false, jumpHeld: false, dash: false };

// Feeds a run its recorded commands, tick by tick: the server's check and "watch this run" both
// go through it.
export class ReplayPlayer {
  private i = 0;

  private at = 0;

  input: Input = IDLE;

  // Why the commands stopped fitting the run, when they did.
  failed: string | undefined;

  private log: number[];

  constructor(log: number[]) {
    this.log = log;
  }

  get done(): boolean {
    return this.i >= this.log.length;
  }

  // The tick of the next command, or Infinity when none is left.
  private next(): number {
    return this.i < this.log.length ? this.at + this.log[this.i] : Infinity;
  }

  // Applies every command due at the run's tick: choices right away, the input for the coming
  // step. Answers false when they don't fit the run.
  apply(run: RunState): boolean {
    for (;;) {
      const due = this.next();
      if (due < run.tick) {
        this.failed = 'out of order';
        return false;
      }
      if (due !== run.tick) return true;
      const kind = this.log[this.i + 1] % 8;
      const value = Math.floor(this.log[this.i + 1] / 8);
      this.at = due;
      this.i += 2;
      if (kind === INPUT) {
        this.input = inputOf(value);
        // The input is the last command of a tick; the step comes next.
        return true;
      }
      let ok = false;
      if (kind === CHOOSE) ok = choose(run, value);
      else if (kind === REROLL) ok = reroll(run);
      else if (kind === BANISH) ok = banish(run, value);
      else if (kind === SKIP) ok = skip(run);
      else if (kind === CLOSE_CHEST) ok = closeChest(run);
      if (!ok) {
        this.failed = `command ${kind} did nothing`;
        return false;
      }
    }
  }

  // Whether the run waits on a choice that a later command will make.
  waitsForCommand(run: RunState): boolean {
    return this.next() === run.tick;
  }
}

// Plays a run again from its start and its commands, up to `endTick` (where the run stopped: it
// ended, or was left at a choice). `ok` is false when the commands don't fit the run.
export const replayRun = (
  start: ReplayStart,
  log: number[],
  endTick = Infinity,
  maxTicks = 60 * 3600
): ReplayResult => {
  const run = runFrom(start);
  const player = new ReplayPlayer(log);
  const fail = (reason: string): ReplayResult => ({ run, ok: false, reason });
  let guard = 0;
  while (run.phase !== 'dead' && run.phase !== 'won' && run.tick < endTick) {
    guard += 1;
    if (guard > maxTicks * 2 || run.tick > maxTicks) return fail('too long');
    if (!player.apply(run)) return fail(player.failed ?? 'bad commands');
    if (run.phase === 'playing') step(run, player.input, TICK);
    else if (player.done) return { run, ok: true };
    else if (!player.waitsForCommand(run)) return fail('stuck on a choice');
  }
  // Choices made right as the run stopped are fine; anything else past the end is not.
  if (!player.apply(run)) return fail(player.failed ?? 'bad commands');
  if (!player.done) return fail('commands after the end');
  return { run, ok: true };
};

// What a report says about a run, checked against the run its commands give.
export type Claim = {
  seed: number;
  character: string;
  seconds: number;
  kills: number;
  level: number;
  gold: number;
  won: boolean;
  tier: number;
  daily?: string | null;
};

export type ReplayPayload = { start: ReplayStart; log: string; endTick: number };

export const verifyReplay = (
  payload: ReplayPayload,
  claim: Claim
): { ok: boolean; reason?: string } => {
  const { start } = payload;
  if (start.seed !== claim.seed || start.character !== claim.character) {
    return { ok: false, reason: 'start' };
  }
  if (start.tier !== claim.tier || (start.daily ?? null) !== (claim.daily ?? null)) {
    return { ok: false, reason: 'rules' };
  }
  const log = decodeLog(payload.log);
  if (!log) return { ok: false, reason: 'log' };
  const result = replayRun(start, log, payload.endTick);
  if (!result.ok) return { ok: false, reason: result.reason };
  const { run } = result;
  const same =
    Math.floor(run.time) === claim.seconds &&
    run.kills === claim.kills &&
    run.player.level === claim.level &&
    Math.round(run.gold) === claim.gold &&
    (run.phase === 'won') === claim.won;
  return same ? { ok: true } : { ok: false, reason: 'result' };
};
