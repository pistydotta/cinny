import { GameEvent } from './engine/types';

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
