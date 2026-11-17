import { GameEvent } from './engine/types';

// A number short enough to read in a fight: 950, 1.2k, 34k, 5.6M.
export const shortNumber = (value: number): string => {
  const n = Math.round(value);
  if (n < 1000) return String(n);
  const units = ['k', 'M', 'B', 'T'];
  let scaled = n / 1000;
  let unit = 0;
  while (scaled >= 999.5 && unit < units.length - 1) {
    scaled /= 1000;
    unit += 1;
  }
  return `${scaled < 99.95 ? Number(scaled.toFixed(1)) : Math.round(scaled)}${units[unit]}`;
};

export type DamageNumber = { id: number; x: number; z: number; amount: number; crit: boolean };

// The hits of one frame added up per enemy, biggest first: one number per enemy instead of a
// pile of them when the aura and the urns hit the same body many times.
export const groupHits = (events: GameEvent[]): DamageNumber[] => {
  const byEnemy = new Map<number, DamageNumber>();
  events.forEach((event) => {
    if (event.type !== 'hit') return;
    const seen = byEnemy.get(event.id);
    if (seen) {
      seen.amount += event.amount;
      seen.crit = seen.crit || event.crit;
      seen.x = event.x;
      seen.z = event.z;
    } else {
      const { id, x, z, amount, crit } = event;
      byEnemy.set(id, { id, x, z, amount, crit });
    }
  });
  return [...byEnemy.values()].sort((a, b) => b.amount - a.amount);
};
