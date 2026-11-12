import { dcos, dsin } from './dmath';
import { createRun } from './run';
import { Input, MetaBonuses, ReplayLog, RunState } from './types';

// A run's commands, so the server (or anyone) can play it again and get the same result: the seed
// and starting conditions, then every change of input and every choice, by tick. Directions are
// one of DIRECTIONS sectors and lengths one of 16 steps, the same rounding the live game uses
// (controls.ts), so a replay sends the engine the very numbers the player's game did.

export const DIRECTIONS = 1024;
export const POWER_STEPS = 16;

// The move a sector and length stand for. The live game and every replay go through this.
export const moveOf = (sector: number, power: number): { moveX: number; moveZ: number } => {
  if (power <= 0) return { moveX: 0, moveZ: 0 };
  const angle = (sector / DIRECTIONS) * Math.PI * 2;
  const size = power / POWER_STEPS;
  return { moveX: dsin(angle) * size, moveZ: dcos(angle) * size };
};

// What a run starts from: enough to make the same first state again.
export type ReplayStart = {
  seed: number;
  character: RunState['character'];
  meta: MetaBonuses;
  tier: number;
  locked: string[];
  mastery: number;
  daily?: string;
};

export const startOf = (run: RunState): ReplayStart => ({
  seed: run.seed,
  character: run.character,
  meta: run.meta,
  tier: run.tier,
  locked: run.locked,
  mastery: run.mastery,
  ...(run.daily ? { daily: run.daily } : {}),
});

export const runFrom = (start: ReplayStart): RunState =>
  createRun(start.seed, start.character, start.meta, start.tier, {
    locked: start.locked,
    mastery: start.mastery,
    daily: start.daily,
  });

// Entry kinds. An input is packed as sector (10 bits), power (5 bits) and four flags.
export const INPUT = 0;
export const CHOOSE = 1;
export const REROLL = 2;
export const BANISH = 3;
export const SKIP = 4;
export const CLOSE_CHEST = 5;

const FLAG_JUMP = 1;
const FLAG_HELD = 2;
const FLAG_DASH = 4;
const FLAG_ABILITY = 8;

export type PackedInput = { sector: number; power: number; flags: number };

export const packInput = (sector: number, power: number, input: Input): PackedInput => ({
  sector: power > 0 ? sector : 0,
  power,
  flags:
    (input.jump ? FLAG_JUMP : 0) +
    (input.jumpHeld ? FLAG_HELD : 0) +
    (input.dash ? FLAG_DASH : 0) +
    (input.ability ? FLAG_ABILITY : 0),
});

export const inputOf = (code: number): Input => {
  const flags = code % 16;
  const power = Math.floor(code / 16) % 32;
  const sector = Math.floor(code / 512);
  return {
    ...moveOf(sector, power),
    jump: (flags & FLAG_JUMP) !== 0, // eslint-disable-line no-bitwise
    jumpHeld: (flags & FLAG_HELD) !== 0, // eslint-disable-line no-bitwise
    dash: (flags & FLAG_DASH) !== 0, // eslint-disable-line no-bitwise
    ability: (flags & FLAG_ABILITY) !== 0, // eslint-disable-line no-bitwise
  };
};

// Writes a run's commands as they happen, into the run itself (`run.replay`), so a run kept in
// the browser and picked up later still has all of them. `log` is flat pairs: the tick gap, then
// kind + 8 * value.
export class ReplayRecorder {
  private target: ReplayLog;

  constructor(run: RunState) {
    // eslint-disable-next-line no-param-reassign
    run.replay ??= { log: [], lastTick: 0, lastInput: -1 };
    this.target = run.replay;
  }

  // Called before each step with what the engine is about to get.
  input(tick: number, packed: PackedInput) {
    const code = (packed.sector * 32 + packed.power) * 16 + packed.flags;
    if (code === this.target.lastInput) return;
    this.target.lastInput = code;
    this.push(tick, INPUT, code);
  }

  choose(tick: number, index: number) {
    this.push(tick, CHOOSE, index);
  }

  reroll(tick: number) {
    this.push(tick, REROLL, 0);
  }

  banish(tick: number, index: number) {
    this.push(tick, BANISH, index);
  }

  skip(tick: number) {
    this.push(tick, SKIP, 0);
  }

  closeChest(tick: number) {
    this.push(tick, CLOSE_CHEST, 0);
  }

  private push(tick: number, kind: number, value: number) {
    this.target.log.push(tick - this.target.lastTick, kind + 8 * value);
    this.target.lastTick = tick;
  }
}

// Unsigned numbers as base64 varints: a ten-minute run fits in a few tens of kB.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export const encodeLog = (log: number[]): string => {
  let out = '';
  log.forEach((value) => {
    let v = value;
    // Six bits per character, the top one saying more follow.
    do {
      const chunk = v % 32;
      v = Math.floor(v / 32);
      out += B64[chunk + (v > 0 ? 32 : 0)];
    } while (v > 0);
  });
  return out;
};

export const decodeLog = (text: string): number[] | undefined => {
  const log: number[] = [];
  let value = 0;
  let scale = 1;
  for (let i = 0; i < text.length; i += 1) {
    const digit = B64.indexOf(text[i]);
    if (digit < 0) return undefined;
    value += (digit % 32) * scale;
    if (digit >= 32) scale *= 32;
    else {
      log.push(value);
      value = 0;
      scale = 1;
    }
  }
  return scale === 1 ? log : undefined;
};
