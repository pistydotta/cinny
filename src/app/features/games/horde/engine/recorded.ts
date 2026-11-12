import { TICK } from './data';
import { fighterInput, pickChoice } from './fighter';
import {
  DIRECTIONS,
  POWER_STEPS,
  ReplayRecorder,
  encodeLog,
  moveOf,
  packInput,
  startOf,
} from './replay';
import { choose, closeChest, createRun, step } from './run';
import { CharacterId, MetaBonuses, RunState } from './types';

// Plays a run with the fighter bot the way the live game does (moves rounded, every command
// recorded), for tests here and in the API that need a real replay.
export const playRecorded = (run: RunState, seconds: number): RunState => {
  const recorder = new ReplayRecorder(run);
  while (
    (run.phase === 'playing' || run.phase === 'choosing' || run.phase === 'chest') &&
    run.time < seconds
  ) {
    if (run.phase === 'choosing') {
      const index = pickChoice(run);
      recorder.choose(run.tick, index);
      choose(run, index);
    } else if (run.phase === 'chest') {
      recorder.closeChest(run.tick);
      closeChest(run);
    } else {
      const raw = fighterInput(run);
      const length = Math.min(1, Math.hypot(raw.moveX, raw.moveZ));
      const power = Math.round(length * POWER_STEPS);
      const turn = Math.round((Math.atan2(raw.moveX, raw.moveZ) / (Math.PI * 2)) * DIRECTIONS);
      const sector = ((turn % DIRECTIONS) + DIRECTIONS) % DIRECTIONS;
      const input = { ...raw, ...moveOf(sector, power) };
      recorder.input(run.tick, packInput(sector, power, input));
      step(run, input, TICK);
    }
  }
  return run;
};

// A finished (or stopped) bot run as the game would report it, with its replay.
export const recordedReport = (
  seed: number,
  character: CharacterId,
  seconds: number,
  meta?: MetaBonuses
) => {
  const run = createRun(seed, character, meta);
  const start = startOf(run);
  playRecorded(run, seconds);
  return {
    seed,
    character,
    seconds: Math.floor(run.time),
    kills: run.kills,
    level: run.player.level,
    gold: Math.round(run.gold),
    won: run.phase === 'won',
    tier: 0,
    replay: { start, log: encodeLog(run.replay?.log ?? []), endTick: run.tick },
  };
};

// A run driven by fixed commands, no bot (the bot uses the platform's own math), and a short
// fingerprint of where it ends: the same number on every device, or the replay check can't work.
export const scriptedFingerprint = (seconds = 180): string => {
  const run = createRun(2026, 'lula');
  // Untouchable, so the whole stretch plays out: more enemies, events and choices covered.
  run.buffs.star = 1e9;
  while (
    (run.phase === 'playing' || run.phase === 'choosing' || run.phase === 'chest') &&
    run.time < seconds
  ) {
    if (run.phase === 'choosing') choose(run, run.tick % 3);
    else if (run.phase === 'chest') closeChest(run);
    else {
      const sector = (run.tick * 37) % DIRECTIONS;
      step(
        run,
        {
          ...moveOf(sector, POWER_STEPS),
          jump: run.tick % 90 === 0,
          jumpHeld: run.tick % 90 < 20,
          dash: run.tick % 300 === 0,
          ability: run.tick % 600 === 0,
        },
        TICK
      );
    }
  }
  const { rng, ...state } = run;
  const text = `${JSON.stringify(state)}|${rng.state()}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    // eslint-disable-next-line no-bitwise
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  }
  return `${h.toString(16)}:${run.tick}:${run.kills}`;
};
