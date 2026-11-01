/* eslint-disable no-param-reassign */
// advance() mutates the GameState it is given: the runner owns one state and steps it ten times
// a second. Player actions (actions.ts) go the other way and return a new state.
import { addItem, BASE_COLS, BASE_ROWS, charmMods } from './backpack';
import { getClass } from './classes';
import { STEP_MS, makeFighter, outcomeOf, stepBattle } from './combat';
import { generateItem, starterWeapon } from './items';
import { createRng, Rng } from './rng';
import { computeStats, sumMods } from './stats';
import {
  Attributes,
  ClassId,
  GameEvent,
  GameState,
  Item,
  Mods,
  SAVE_VERSION,
  Stats,
  UpgradeId,
} from './types';
import { BOSS_TIME_MS, KILLS_PER_STAGE, isBossStage, makeEnemy, rewardsFor } from './zones';

export const RESPAWN_MS = 3000;
export const MAX_LEVEL = 200;

type UpgradeDef = {
  id: UpgradeId;
  icon: string;
  baseCost: number;
  growth: number;
  max?: number;
  mods: (level: number) => Mods;
};

// Gold sinks. Costs grow faster than the bonus, which is what makes an idle game's curve.
export const UPGRADES: UpgradeDef[] = [
  { id: 'might', icon: '💪', baseCost: 25, growth: 1.15, mods: (l) => ({ damagePct: 0.06 * l }) },
  { id: 'vigor', icon: '❤️', baseCost: 25, growth: 1.15, mods: (l) => ({ maxHpPct: 0.06 * l }) },
  {
    id: 'swiftness',
    icon: '💨',
    baseCost: 60,
    growth: 1.2,
    max: 50,
    mods: (l) => ({ attackSpeedPct: 0.02 * l }),
  },
  { id: 'fortune', icon: '💰', baseCost: 80, growth: 1.18, mods: (l) => ({ goldFind: 0.08 * l }) },
  { id: 'wisdom', icon: '📜', baseCost: 80, growth: 1.18, mods: (l) => ({ xpGain: 0.08 * l }) },
  { id: 'satchel', icon: '🎒', baseCost: 400, growth: 4, max: 3, mods: () => ({}) },
];

export const upgradeCost = (def: UpgradeDef, level: number): number =>
  Math.round(def.baseCost * def.growth ** level);

export const xpToNext = (level: number): number => Math.round(30 * level ** 2.1 + 20 * level);

const ZERO: Attributes = { str: 0, agi: 0, int: 0, vit: 0 };

export const newGame = (name: string, classId: ClassId, seed: number, now: number): GameState => {
  const cls = getClass(classId);
  return {
    version: SAVE_VERSION,
    rngState: Math.floor(Math.abs(seed)) % 4294967296,
    hero: { name, classId, level: 1, xp: 0, allocated: { ...ZERO }, freePoints: 0 },
    gold: 0,
    equipment: { weapon: starterWeapon(cls, 'i1') },
    backpack: { cols: BASE_COLS, rows: BASE_ROWS, items: [] },
    stage: 1,
    maxStage: 1,
    kills: 0,
    autoAdvance: true,
    upgrades: {},
    battle: null,
    respawnMs: 0,
    arena: { rating: 1000, wins: 0, losses: 0 },
    lifetime: { kills: 0, deaths: 0, goldEarned: 0, itemsFound: 0, playMs: 0 },
    nextItemId: 2,
    lastSeen: now,
  };
};

/** Everything that adds to the hero besides level and points: gear, charms, upgrades. */
export const heroMods = (s: GameState): Mods[] => [
  ...Object.values(s.equipment).map((item) => (item as Item).mods),
  charmMods(s.backpack),
  ...UPGRADES.map((u) => u.mods(s.upgrades[u.id] ?? 0)),
];

export const heroStats = (s: GameState): Stats =>
  computeStats({
    cls: getClass(s.hero.classId),
    level: s.hero.level,
    allocated: s.hero.allocated,
    mods: heroMods(s),
  });

export const economy = (s: GameState): { gold: number; xp: number } => {
  const m = sumMods(heroMods(s));
  return { gold: 1 + (m.goldFind ?? 0), xp: 1 + (m.xpGain ?? 0) };
};

export const gainXp = (s: GameState, amount: number, events: GameEvent[]) => {
  s.hero.xp += amount;
  while (s.hero.level < MAX_LEVEL && s.hero.xp >= xpToNext(s.hero.level)) {
    s.hero.xp -= xpToNext(s.hero.level);
    s.hero.level += 1;
    s.hero.freePoints += 1;
    events.push({ t: 'level', level: s.hero.level });
  }
  if (s.hero.level >= MAX_LEVEL) s.hero.xp = 0;
};

export const newItemId = (s: GameState): string => {
  const id = `i${s.nextItemId}`;
  s.nextItemId += 1;
  return id;
};

/** Into the bag, or sold on the spot when the bag is full. */
export const stash = (s: GameState, item: Item, events: GameEvent[]) => {
  s.lifetime.itemsFound += 1;
  const bp = addItem(s.backpack, item);
  if (bp) {
    s.backpack = bp;
    events.push({ t: 'loot', item });
  } else {
    s.gold += item.value;
    s.lifetime.goldEarned += item.value;
    events.push({ t: 'sold', item });
  }
};

const startFight = (s: GameState, rng: Rng, events: GameEvent[]) => {
  const cls = getClass(s.hero.classId);
  const boss = isBossStage(s.stage);
  const hero = makeFighter(s.hero.name, cls.icon, s.hero.level, heroStats(s), cls.skill);
  const foe = makeEnemy(s.stage, rng);
  s.battle = { hero, foe, elapsedMs: 0, boss, timeLimitMs: boss ? BOSS_TIME_MS : undefined };
  events.push({ t: 'fight', foe: foe.name, boss });
};

const winFight = (s: GameState, rng: Rng, events: GameEvent[]) => {
  const boss = s.battle?.boss ?? false;
  const foe = s.battle?.foe.name ?? '';
  const r = rewardsFor(s.stage, boss);
  const eco = economy(s);
  const gold = Math.round(r.gold * eco.gold);
  const xp = Math.round(r.xp * eco.xp);
  s.gold += gold;
  s.lifetime.goldEarned += gold;
  s.lifetime.kills += 1;
  events.push({ t: 'kill', foe, gold, xp });
  gainXp(s, xp, events);
  if (rng.next() < r.dropChance) {
    stash(
      s,
      generateItem(rng, getClass(s.hero.classId), newItemId(s), { level: s.stage, boss }),
      events
    );
  }
  s.kills += 1;
  if (s.autoAdvance && (boss || s.kills >= KILLS_PER_STAGE)) {
    s.stage += 1;
    s.kills = 0;
    s.maxStage = Math.max(s.maxStage, s.stage);
    events.push({ t: 'stage', stage: s.stage });
  }
  s.battle = null;
};

const loseFight = (s: GameState, timeout: boolean, events: GameEvent[]) => {
  events.push(timeout ? { t: 'timeout' } : { t: 'death' });
  if (!timeout) s.lifetime.deaths += 1;
  // Back one stage to farm, until the player is ready to try again.
  s.autoAdvance = false;
  if (s.stage > 1) {
    s.stage -= 1;
    s.kills = 0;
    events.push({ t: 'stage', stage: s.stage });
  }
  s.respawnMs = timeout ? STEP_MS : RESPAWN_MS;
  s.battle = null;
};

/**
 * Moves the game forward by `dtMs`, in fixed steps. Returns what happened, for the log.
 * The leftover under one step is the caller's to carry (see runner.ts).
 */
export const advance = (s: GameState, dtMs: number): GameEvent[] => {
  const events: GameEvent[] = [];
  const rng = createRng(s.rngState);
  const steps = Math.floor(dtMs / STEP_MS);
  for (let i = 0; i < steps; i += 1) {
    s.lifetime.playMs += STEP_MS;
    if (s.respawnMs > 0) {
      s.respawnMs = Math.max(0, s.respawnMs - STEP_MS);
    } else {
      if (!s.battle) startFight(s, rng, events);
      const battle = s.battle as NonNullable<GameState['battle']>;
      events.push(...stepBattle(battle, rng));
      const outcome = outcomeOf(battle);
      if (outcome === 'hero') winFight(s, rng, events);
      else if (outcome === 'foe') loseFight(s, false, events);
      else if (outcome === 'timeout') loseFight(s, true, events);
    }
  }
  s.rngState = rng.state();
  return events;
};
