import { BOLETOS } from './stats';
import { TICK } from './data';
import { auraRadius, choose, closeChest, step, urnOrbit, runStats } from './run';
import { Choice, Input, PassiveId, RunState, WeaponId } from './types';

// A bot that plays like a person who knows the game, for balance: it keeps the distance its
// weapons want (close for the aura and the ballot boxes, back for bombs and cards), circles
// instead of backing into a wall, dodges shots, uses the dodge when cornered and picks upgrades
// with some sense. The old runaway bot (`bot.ts`) stays as the floor to compare with.

const RANGED: WeaponId[] = ['missile', 'card', 'bolt', 'axe'];

// How far from the nearest enemy the bot wants to be.
const wantedRange = (state: RunState): number => {
  const stats = runStats(state);
  if (state.weapons.some((w) => RANGED.includes(w.id))) return 7;
  const aura = state.weapons.find((w) => w.id === 'aura');
  if (aura) return auraRadius(aura, stats) * 0.6;
  if (state.weapons.some((w) => w.id === 'urns')) return urnOrbit(stats);
  return 4;
};

export const fighterInput = (state: RunState, skill = 1): Input => {
  const { player } = state;
  const stats = runStats(state);
  // Close-range builds have to let enemies come within reach, so only the ones nearer than that
  // push them away.
  const range = wantedRange(state);
  const danger = range < 7 ? Math.max(1.6, range * 0.8) : 6;
  let near: { x: number; z: number; d: number } | undefined;
  let crowdX = 0;
  let crowdZ = 0;
  for (let i = 0; i < state.enemies.length; i += 1) {
    const e = state.enemies[i];
    // eslint-disable-next-line no-continue
    if (e.prop) continue;
    const dx = e.x - player.x;
    const dz = e.z - player.z;
    const d = Math.hypot(dx, dz) - e.radius;
    if (!near || d < near.d) near = { x: dx, z: dz, d };
    // Everything close pushes the bot away, harder the closer it is: the crowd decides the path,
    // the wanted range only nudges it.
    const d2 = dx * dx + dz * dz;
    if (d2 < danger * danger) {
      crowdX -= dx / (d2 + 0.5);
      crowdZ -= dz / (d2 + 0.5);
    }
  }
  let dodgeX = 0;
  let dodgeZ = 0;
  // Out of every marked circle and lane.
  state.hazards.forEach((h) => {
    let cx = h.x;
    let cz = h.z;
    if (h.kind === 'lane' && h.x2 !== undefined && h.z2 !== undefined) {
      // The nearest point of the lane.
      const lx = h.x2 - h.x;
      const lz = h.z2 - h.z;
      const t = Math.max(
        0,
        Math.min(1, ((player.x - h.x) * lx + (player.z - h.z) * lz) / (lx * lx + lz * lz || 1))
      );
      cx = h.x + lx * t;
      cz = h.z + lz * t;
    }
    const dx = player.x - cx;
    const dz = player.z - cz;
    const d = Math.hypot(dx, dz) || 0.01;
    const margin = h.radius + 1.5 - d;
    if (margin > 0) {
      dodgeX += (dx / d) * margin;
      dodgeZ += (dz / d) * margin;
    }
  });
  state.shots.forEach((s) => {
    if (!s.hostile) return;
    const dx = player.x - s.x;
    const dz = player.z - s.z;
    const d2 = dx * dx + dz * dz;
    // Coming this way: step sideways to it.
    if (d2 < 30 && s.vx * dx + s.vz * dz > 0) {
      dodgeX += -s.vz / (d2 + 1);
      dodgeZ += s.vx / (d2 + 1);
    }
  });

  let moveX = 0;
  let moveZ = 0;
  if (near) {
    const len = Math.hypot(near.x, near.z) || 1;
    const towardX = near.x / len;
    const towardZ = near.z / len;
    const boss = state.enemies.some((e) => e.kind === 'boss');
    const want = boss ? Math.max(7, range) : range;
    // In or out to the wanted range, and always circling so the horde trails behind.
    const radial = Math.max(-1, Math.min(1, (near.d - want) / 3)) * 0.6;
    moveX = towardX * radial - towardZ * 0.3;
    moveZ = towardZ * radial + towardX * 0.3;
  }
  // Gems pull too, the nearest one, gently.
  let best = 400;
  let gemX = 0;
  let gemZ = 0;
  state.pickups.forEach((p) => {
    const d2 = (p.x - player.x) ** 2 + (p.z - player.z) ** 2;
    if (d2 < best) {
      best = d2;
      gemX = p.x - player.x;
      gemZ = p.z - player.z;
    }
  });
  const gemLen = Math.hypot(gemX, gemZ) || 1;
  moveX += (gemX / gemLen) * 0.5;
  moveZ += (gemZ / gemLen) * 0.5;
  // Stay away from the arena's wall, where circling turns into being cornered.
  const fromCenter = Math.hypot(player.x, player.z);
  if (fromCenter > 45) {
    moveX -= (player.x / fromCenter) * ((fromCenter - 45) / 10);
    moveZ -= (player.z / fromCenter) * ((fromCenter - 45) / 10);
  }
  moveX += crowdX * 4 + dodgeX * 6;
  moveZ += crowdZ * 4 + dodgeZ * 6;

  const cornered = near !== undefined && near.d < 0.8 && player.hp < player.maxHp * 0.5;
  // The ability when it's worth it: a crowd around, a boss, or a tight spot.
  let close = 0;
  state.enemies.forEach((e) => {
    if (!e.prop && (e.x - player.x) ** 2 + (e.z - player.z) ** 2 < 49) close += 1;
  });
  const ability =
    player.abilityCd <= 0 &&
    (close >= 12 || cornered || state.enemies.some((e) => e.kind === 'boss'));
  return {
    moveX: moveX * skill,
    moveZ: moveZ * skill,
    jump: false,
    jumpHeld: false,
    dash: cornered && player.dashCd <= 0 && stats.moveSpeed > 0,
    ability,
  };
};

// Boletos the bot values, best first. Difficulty is a risk it doesn't take.
const GOOD_BOLETOS: PassiveId[] = [
  'might',
  'haste',
  'vigor',
  'armor',
  'multi',
  'reach',
  'regen',
  'crit',
  'shield',
  'evasion',
  'swift',
  'magnet',
];

const scoreChoice = (state: RunState, choice: Choice): number => {
  const { player } = state;
  const hurt = player.hp < player.maxHp * 0.4;
  switch (choice.kind) {
    case 'heal':
      return hurt ? 9 : 0.5;
    case 'gold':
      return 0.4;
    case 'weapon': {
      const owned = state.weapons.some((w) => w.id === choice.id);
      return (owned ? 7 : 6) + (choice.rarity ? 1 : 0) - choice.level * 0.1;
    }
    case 'passive': {
      if (choice.id === 'curse') return 0.1;
      const rank = GOOD_BOLETOS.indexOf(choice.id);
      const owned = state.passives.some((p) => p.id === choice.id);
      const value = rank >= 0 ? 6 - rank * 0.3 : 2;
      return value + (owned ? 1.5 : 0) + (choice.rarity ? 1 : 0);
    }
    case 'evolve':
      return 12;
    default: {
      // A blessing: the same taste, with no slot to spend.
      const rank = GOOD_BOLETOS.indexOf(choice.id);
      return BOLETOS[choice.id].stat === 'difficulty' ? 0 : 5 - Math.max(0, rank) * 0.2;
    }
  }
};

// The index of the choice the bot takes; `allow` can rule some out (a weapon test).
export const pickChoice = (state: RunState, allow: (c: Choice) => boolean = () => true): number => {
  let best = 0;
  let bestScore = -Infinity;
  state.choices?.forEach((c, i) => {
    const score = allow(c) ? scoreChoice(state, c) : -100;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
};

// Plays a run with the fighter to its end, or to `maxSeconds`.
export const playFighter = (
  state: RunState,
  maxSeconds: number,
  allow?: (c: Choice) => boolean,
  skill = 1
): RunState => {
  while (
    (state.phase === 'playing' || state.phase === 'choosing' || state.phase === 'chest') &&
    state.time < maxSeconds
  ) {
    if (state.phase === 'choosing') choose(state, pickChoice(state, allow));
    else if (state.phase === 'chest') closeChest(state);
    else step(state, fighterInput(state, skill), TICK);
  }
  return state;
};
