/* eslint-disable no-param-reassign */
import { getClass } from './classes';
import { generateItem } from './items';
import { createRng } from './rng';
import { advance, gainXp, newItemId, stash } from './progress';
import { GameEvent, GameState } from './types';

export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
/** Up to this much, time away is simply played out, fight by fight. */
export const REPLAY_MS = 2 * 60 * 1000;
const SAMPLE_MS = 3 * 60 * 1000;
const MAX_OFFLINE_ITEMS = 25;

export type OfflineReport = {
  elapsedMs: number;
  gold: number;
  xp: number;
  kills: number;
  levels: number;
  items: number;
  sold: number;
};

/**
 * Time the app was closed. Short gaps are played out. Long ones are estimated from a sample:
 * a copy plays a few minutes at the current stage and the rates are applied to the whole gap.
 * The hero doesn't climb stages while away, so coming back is never a surprise wall.
 */
export const catchUp = (s: GameState, elapsedMs: number): OfflineReport => {
  const elapsed = Math.min(Math.max(0, elapsedMs), OFFLINE_CAP_MS);
  const before = {
    gold: s.gold,
    level: s.hero.level,
    kills: s.lifetime.kills,
    items: s.lifetime.itemsFound,
  };
  const events: GameEvent[] = [];
  let xp = 0;

  if (elapsed <= REPLAY_MS) {
    advance(s, elapsed).forEach((e) => {
      if (e.t === 'kill') xp += e.xp;
      events.push(e);
    });
  } else {
    const sample: GameState = structuredClone(s);
    sample.autoAdvance = false;
    const sampleEvents = advance(sample, SAMPLE_MS);
    const ratio = elapsed / SAMPLE_MS;
    const kills = sample.lifetime.kills - s.lifetime.kills;
    const gold = sample.lifetime.goldEarned - s.lifetime.goldEarned;
    const xpSample = sampleEvents.reduce((sum, e) => (e.t === 'kill' ? sum + e.xp : sum), 0);
    const drops = sample.lifetime.itemsFound - s.lifetime.itemsFound;

    // Sold drops are already in the sample's gold, so only the items kept are added back.
    const goldFromSales = sampleEvents.reduce(
      (sum, e) => (e.t === 'sold' ? sum + e.item.value : sum),
      0
    );
    s.gold += Math.round((gold - goldFromSales) * ratio);
    s.lifetime.goldEarned += Math.round((gold - goldFromSales) * ratio);
    s.lifetime.kills += Math.round(kills * ratio);
    s.lifetime.playMs += elapsed;
    xp = Math.round(xpSample * ratio);
    gainXp(s, xp, events);

    const rng = createRng(s.rngState);
    const cls = getClass(s.hero.classId);
    const count = Math.min(MAX_OFFLINE_ITEMS, Math.round(drops * ratio));
    for (let i = 0; i < count; i += 1) {
      stash(s, generateItem(rng, cls, newItemId(s), { level: s.stage }), events);
    }
    s.rngState = rng.state();
    s.battle = null;
  }

  return {
    elapsedMs: elapsed,
    gold: s.gold - before.gold,
    xp,
    kills: s.lifetime.kills - before.kills,
    levels: s.hero.level - before.level,
    items: events.filter((e) => e.t === 'loot').length,
    sold: events.filter((e) => e.t === 'sold').length,
  };
};
