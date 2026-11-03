/* eslint-disable no-param-reassign */
import { getClass } from './classes';
import { generateItem } from './items';
import { createRng } from './rng';
import { advance, gainXp, newItemId, stash } from './progress';
import { offlineHours } from './prestige';
import { GameEvent, GameState } from './types';

export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MAX_OFFLINE_ITEMS = 40;
/** Up to this much, time away is simply played out, fight by fight. */
export const REPLAY_MS = 2 * 60 * 1000;
const SAMPLE_MS = 3 * 60 * 1000;

export type OfflineReport = {
  elapsedMs: number;
  gold: number;
  xp: number;
  kills: number;
  levels: number;
  items: number;
  /** Drops turned into stones (auto-salvage or no room). */
  salvaged: number;
  stones: number;
  cores: number;
};

/**
 * Time the app was closed. Short gaps are played out. Long ones are estimated from a sample:
 * a copy plays a few minutes at the current stage and the rates are applied to the whole gap.
 * The hero doesn't climb stages while away, so coming back is never a surprise wall.
 */
export const catchUp = (s: GameState, elapsedMs: number): OfflineReport => {
  const elapsed = Math.min(Math.max(0, elapsedMs), offlineHours(s.prestige) * HOUR_MS);
  const before = {
    stones: s.materials.stones,
    cores: s.materials.cores,
    gold: s.gold,
    level: s.hero.level,
    kills: s.lifetime.kills,
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
    const bossStones = sampleEvents.reduce((n, e) => (e.t === 'materials' ? n + e.stones : n), 0);
    const bossCores = sampleEvents.reduce((n, e) => (e.t === 'materials' ? n + e.cores : n), 0);

    s.gold += Math.round(gold * ratio);
    s.lifetime.goldEarned += Math.round(gold * ratio);
    s.materials.stones += Math.round(bossStones * ratio);
    s.materials.cores += Math.floor(bossCores * ratio);
    s.lifetime.kills += Math.round(kills * ratio);
    s.lifetime.playMs += elapsed;
    xp = Math.round(xpSample * ratio);
    gainXp(s, xp, events);

    const rng = createRng(s.rngState);
    const cls = getClass(s.hero.classId);
    const total = Math.round(drops * ratio);
    const count = Math.min(MAX_OFFLINE_ITEMS, total);
    for (let i = 0; i < count; i += 1) {
      stash(s, generateItem(rng, cls, newItemId(s), { level: s.stage }), events);
    }
    // Past the cap, the rest is broken down into stones, roughly what common drops give.
    s.materials.stones += Math.floor((total - count) * 1.5 * (1 + s.stage / 40));
    s.rngState = rng.state();
    s.battle = null;
  }

  return {
    elapsedMs: elapsed,
    gold: s.gold - before.gold,
    xp,
    kills: s.lifetime.kills - before.kills,
    levels: s.hero.level - before.level,
    items: events.filter((e) => e.t === 'loot' && e.entry.fate === 'kept').length,
    salvaged: events.filter((e) => e.t === 'loot' && e.entry.fate !== 'kept').length,
    stones: s.materials.stones - before.stones,
    cores: s.materials.cores - before.cores,
  };
};
