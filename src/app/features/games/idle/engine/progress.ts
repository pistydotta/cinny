/* eslint-disable no-param-reassign */
// advance() mutates the GameState it is given: the runner owns one state and steps it ten times
// a second. Player actions (actions.ts) go the other way and return a new state.
import { getClass, getSpec, looksOf, skillsOf } from './classes';
import { STEP_MS, makeFighter, outcomeOf, stepBattle } from './combat';
import { salvageValue } from './forge';
import { generateItem, itemMods, rarityRank, starterWeapon } from './items';
import { altarMods, altarMore, bonusTalentPoints } from './prestige';
import { createRng, Rng, rollInt } from './rng';
import { computeStats, powerOf, sumMods } from './stats';
import { talentMods } from './talents';
import {
  ClassId,
  Equipment,
  GameEvent,
  GameState,
  Item,
  LootEntry,
  Mods,
  SAVE_VERSION,
  Stats,
  UpgradeId,
} from './types';
import { BOSS_TIME_MS, KILLS_PER_STAGE, isBossStage, makeEnemy, rewardsFor } from './zones';

export const RESPAWN_MS = 3000;
export const MAX_LEVEL = 200;
export const LOOT_LOG_SIZE = 60;
export const BASE_CAPACITY = 60;
export const CAPACITY_PER_SATCHEL = 20;

type UpgradeDef = {
  id: UpgradeId;
  icon: string;
  baseCost: number;
  growth: number;
  max?: number;
  mods: (level: number) => Mods;
};

// Gold sinks. Costs grow faster than the bonus, which is what makes an idle game's curve.
// They reset on a rebirth, except the satchel.
export const UPGRADES: UpgradeDef[] = [
  { id: 'might', icon: '💪', baseCost: 25, growth: 1.2, mods: (l) => ({ damagePct: 0.06 * l }) },
  { id: 'vigor', icon: '❤️', baseCost: 25, growth: 1.2, mods: (l) => ({ maxHpPct: 0.06 * l }) },
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
  { id: 'satchel', icon: '🎒', baseCost: 300, growth: 3, max: 7, mods: () => ({}) },
];

export const upgradeCost = (def: UpgradeDef, level: number): number =>
  Math.round(def.baseCost * def.growth ** level);

export const xpToNext = (level: number): number => Math.round(30 * level ** 2.1 + 20 * level);

export const capacityOf = (s: GameState): number =>
  BASE_CAPACITY + CAPACITY_PER_SATCHEL * (s.upgrades.satchel ?? 0);

export const newGame = (name: string, classId: ClassId, seed: number, now: number): GameState => {
  const cls = getClass(classId);
  return {
    version: SAVE_VERSION,
    rngState: Math.floor(Math.abs(seed)) % 4294967296,
    hero: { name, classId, level: 1, xp: 0, talents: {} },
    gold: 0,
    equipment: { weapon: starterWeapon(cls, 'i1') },
    inventory: [],
    materials: { stones: 0, cores: 0 },
    stage: 1,
    maxStage: 1,
    kills: 0,
    autoAdvance: true,
    upgrades: {},
    battle: null,
    respawnMs: 0,
    arena: { rating: 1000, wins: 0, losses: 0 },
    lifetime: {
      kills: 0,
      deaths: 0,
      goldEarned: 0,
      itemsFound: 0,
      playMs: 0,
      bossKills: 0,
      bestStage: 1,
      bestPlus: 0,
    },
    prestige: { rebirths: 0, ashes: 0, ashesEarned: 0, altar: {} },
    settings: { autoSalvage: null },
    loot: [],
    nextItemId: 2,
    lastSeen: now,
  };
};

export const equipmentMods = (equipment: Equipment): Mods[] =>
  Object.values(equipment).map((item) => itemMods(item as Item));

/** Everything that adds to the hero besides level: gear, talents, spec, upgrades, the altar. */
export const heroMods = (s: GameState, equipment: Equipment = s.equipment): Mods[] => [
  ...equipmentMods(equipment),
  ...talentMods(s.hero.talents),
  getSpec(s.hero.specId)?.passive ?? {},
  ...UPGRADES.map((u) => u.mods(s.upgrades[u.id] ?? 0)),
  altarMods(s.prestige),
];

export const heroStats = (s: GameState, equipment: Equipment = s.equipment): Stats =>
  computeStats({
    cls: getClass(s.hero.classId),
    level: s.hero.level,
    mods: heroMods(s, equipment),
    more: altarMore(s.prestige),
  });

/** The hero's power with `item` in its slot instead of what's there now. */
export const powerWith = (s: GameState, item: Item): number =>
  powerOf(heroStats(s, { ...s.equipment, [item.kind]: item }));

/** How much `item` would change the hero's power if equipped. */
export const powerDelta = (s: GameState, item: Item): number => {
  const now = powerOf(heroStats(s));
  return powerWith(s, item) - now;
};

export const totalMods = (s: GameState): Mods => sumMods(heroMods(s));

export const economy = (s: GameState): { gold: number; xp: number; drop: number } => {
  const m = totalMods(s);
  return { gold: 1 + (m.goldFind ?? 0), xp: 1 + (m.xpGain ?? 0), drop: 1 + (m.dropRate ?? 0) };
};

export const availableTalentPoints = (s: GameState): number => {
  const spent = Object.values(s.hero.talents).reduce((sum, n) => sum + n, 0);
  return s.hero.level - 1 + bonusTalentPoints(s.prestige) - spent;
};

export const gainXp = (s: GameState, amount: number, events: GameEvent[]) => {
  s.hero.xp += amount;
  while (s.hero.level < MAX_LEVEL && s.hero.xp >= xpToNext(s.hero.level)) {
    s.hero.xp -= xpToNext(s.hero.level);
    s.hero.level += 1;
    events.push({ t: 'level', level: s.hero.level });
  }
  if (s.hero.level >= MAX_LEVEL) s.hero.xp = 0;
};

export const newItemId = (s: GameState): string => {
  const id = `i${s.nextItemId}`;
  s.nextItemId += 1;
  return id;
};

export const pushLoot = (s: GameState, entry: LootEntry) => {
  s.loot.push(entry);
  if (s.loot.length > LOOT_LOG_SIZE) s.loot.splice(0, s.loot.length - LOOT_LOG_SIZE);
};

/**
 * A drop goes into the inventory, unless the player asked to salvage drops of its rarity and
 * it isn't an upgrade, or there's no room: then it becomes ember stones on the spot.
 */
export const stash = (s: GameState, item: Item, events: GameEvent[]) => {
  s.lifetime.itemsFound += 1;
  const better = powerDelta(s, item) > 0;
  const auto =
    s.settings.autoSalvage !== null &&
    !better &&
    rarityRank(item.rarity) <= rarityRank(s.settings.autoSalvage);
  const full = s.inventory.length >= capacityOf(s);
  let fate: LootEntry['fate'] = 'kept';
  if (auto || full) {
    const got = salvageValue(item, totalMods(s).salvageYield ?? 0);
    s.materials.stones += got.stones;
    s.materials.cores += got.cores;
    fate = 'salvaged';
  } else {
    s.inventory.push(item);
  }
  const entry: LootEntry = { item: { ...item }, at: s.lifetime.playMs, fate, better };
  pushLoot(s, entry);
  events.push({ t: 'loot', entry });
};

const startFight = (s: GameState, rng: Rng, events: GameEvent[]) => {
  const cls = getClass(s.hero.classId);
  const boss = isBossStage(s.stage);
  const { icon } = looksOf(cls, s.hero.specId);
  const hero = makeFighter(
    s.hero.name,
    icon,
    s.hero.level,
    heroStats(s),
    skillsOf(cls, s.hero.specId)
  );
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
  if (boss) s.lifetime.bossKills += 1;
  events.push({ t: 'kill', foe, gold, xp, boss });
  gainXp(s, xp, events);
  if (rng.next() < Math.min(1, r.dropChance * eco.drop)) {
    stash(
      s,
      generateItem(rng, getClass(s.hero.classId), newItemId(s), { level: s.stage, boss }),
      events
    );
  }
  // Bosses also leave forge materials.
  if (boss) {
    const stones = rollInt(rng, 2, 4) + Math.floor(s.stage / 10);
    const cores = rng.next() < 0.35 ? 1 : 0;
    s.materials.stones += stones;
    s.materials.cores += cores;
    events.push({ t: 'materials', stones, cores });
  }
  s.kills += 1;
  if (s.autoAdvance && (boss || s.kills >= KILLS_PER_STAGE)) {
    s.stage += 1;
    s.kills = 0;
    s.maxStage = Math.max(s.maxStage, s.stage);
    s.lifetime.bestStage = Math.max(s.lifetime.bestStage, s.stage);
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
