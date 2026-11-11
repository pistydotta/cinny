import { CHARACTER_IDS, META_IDS, META_UPGRADES, metaCost } from './data';
import { NO_META } from './run';
import { CharacterId, MetaBonuses, MetaUpgradeId, RunState } from './types';

// What stays between runs: gold, what it bought and the records.
export type MetaSave = {
  version: 1;
  gold: number;
  upgrades: MetaBonuses;
  character: CharacterId;
  runs: number;
  wins: number;
  bestTime: number;
  bestKills: number;
  bestLevel: number;
};

export const newMeta = (): MetaSave => ({
  version: 1,
  gold: 0,
  upgrades: { ...NO_META },
  character: 'eneas',
  runs: 0,
  wins: 0,
  bestTime: 0,
  bestKills: 0,
  bestLevel: 0,
});

const count = (value: unknown, max = Number.MAX_SAFE_INTEGER): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(0, Math.floor(value)))
    : 0;

// Reads a save from storage, dropping anything that isn't what the game wrote.
export const parseMeta = (text: string | null | undefined): MetaSave => {
  const meta = newMeta();
  if (!text) return meta;
  try {
    const raw = JSON.parse(text);
    if (typeof raw !== 'object' || raw === null || raw.version !== 1) return meta;
    meta.gold = count(raw.gold);
    META_IDS.forEach((id) => {
      meta.upgrades[id] = count(raw.upgrades?.[id], META_UPGRADES[id].max);
    });
    if (CHARACTER_IDS.includes(raw.character)) meta.character = raw.character;
    meta.runs = count(raw.runs);
    meta.wins = count(raw.wins);
    meta.bestTime = count(raw.bestTime);
    meta.bestKills = count(raw.bestKills);
    meta.bestLevel = count(raw.bestLevel);
  } catch {
    // A broken save starts over.
  }
  return meta;
};

export const buyMeta = (meta: MetaSave, id: MetaUpgradeId): MetaSave | undefined => {
  const level = meta.upgrades[id];
  const cost = metaCost(id, level);
  if (level >= META_UPGRADES[id].max || meta.gold < cost) return undefined;
  return { ...meta, gold: meta.gold - cost, upgrades: { ...meta.upgrades, [id]: level + 1 } };
};

// Gold a finished run pays: what was picked up, a little for surviving, and a prize for winning.
export const runGold = (run: RunState): number =>
  run.gold + Math.floor(run.time / 20) + (run.phase === 'won' ? 100 : 0);

export const finishRun = (meta: MetaSave, run: RunState): MetaSave => ({
  ...meta,
  gold: meta.gold + runGold(run),
  runs: meta.runs + 1,
  wins: meta.wins + (run.phase === 'won' ? 1 : 0),
  bestTime: Math.max(meta.bestTime, Math.floor(run.time)),
  bestKills: Math.max(meta.bestKills, run.kills),
  bestLevel: Math.max(meta.bestLevel, run.player.level),
});
