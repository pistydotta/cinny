import { TICK } from './data';
import { choose, step } from './run';
import { Input, RunState } from './types';

// A simple player for tests and balance: it runs from whatever is close, picks up gems and
// takes the first upgrade offered. `skill` 0 stands still; 1 dodges well.
export const botInput = (state: RunState, skill: number): Input => {
  const { player } = state;
  let awayX = 0;
  let awayZ = 0;
  state.enemies.forEach((e) => {
    const dx = player.x - e.x;
    const dz = player.z - e.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < 30) {
      awayX += dx / (d2 + 0.5);
      awayZ += dz / (d2 + 0.5);
    }
  });
  state.shots.forEach((s) => {
    if (!s.hostile) return;
    const dx = player.x - s.x;
    const dz = player.z - s.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < 36) {
      awayX += (dx / (d2 + 0.5)) * 2;
      awayZ += (dz / (d2 + 0.5)) * 2;
    }
  });
  // With nothing pressing, go for the nearest gem; otherwise drift around the middle.
  let goX = -player.z;
  let goZ = player.x;
  let best = 400;
  state.pickups.forEach((p) => {
    const d2 = (p.x - player.x) ** 2 + (p.z - player.z) ** 2;
    if (d2 < best) {
      best = d2;
      goX = p.x - player.x;
      goZ = p.z - player.z;
    }
  });
  const goLen = Math.hypot(goX, goZ) || 1;
  const dist = Math.hypot(player.x, player.z);
  const pull = dist > 40 ? 0.8 : 0;
  const circleX = goX / goLen - (player.x / (dist || 1)) * pull;
  const circleZ = goZ / goLen - (player.z / (dist || 1)) * pull;
  return {
    moveX: (awayX * 4 + circleX) * skill,
    moveZ: (awayZ * 4 + circleZ) * skill,
    jump: false,
    jumpHeld: false,
    dash: false,
  };
};

// Plays a run to its end, or to `maxSeconds`.
export const playBot = (state: RunState, skill: number, maxSeconds = 900): RunState => {
  while ((state.phase === 'playing' || state.phase === 'choosing') && state.time < maxSeconds) {
    if (state.phase === 'choosing') choose(state, 0);
    else step(state, botInput(state, skill), TICK);
  }
  return state;
};
