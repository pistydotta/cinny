/* eslint-disable no-param-reassign */
import {
  CHARACTERS,
  ENEMIES,
  MAX_ENEMIES,
  MAX_PASSIVES,
  MAX_PICKUPS,
  MAX_WEAPONS,
  MID_BOSS_AT,
  MOVE,
  BOSS_PIERCE,
  BUFF_SECONDS,
  ELITE_EVERY,
  LIFESTEAL_PER_SECOND,
  OVERHEAL_FADE,
  POWERUP_CHANCE,
  POWERUPS,
  SHIELD_FILL,
  SHIELD_WAIT,
  SKIP_GOLD,
  ABILITY_COOLDOWN,
  CHALLENGE_SECONDS,
  CURSE_DIFFICULTY,
  CURSE_SECONDS,
  HORDE_EVENTS,
  TIER_DIFFICULTY,
  RUN_SECONDS,
  SHRINE_RADIUS,
  SHRINE_SECONDS,
  MAP_CHESTS,
  MAP_CHEST_RADIUS,
  MAP_CHEST_SECONDS,
  chestPrice,
  SHOT_HEIGHT,
  WEAPON_IDS,
  WEAPON_MAX_LEVEL,
  enemyScale,
  spawnRate,
  xpToNext,
} from './data';
import { datan2, dcos, dhypot, dsin, sq } from './dmath';
import { createRng } from './rng';
import {
  BOLETOS,
  BOLETO_IDS,
  Bonus,
  Stats,
  armorShare,
  computeStats,
  evasionChance,
  luckShare,
} from './stats';
import { MAP_HALF, clampToMap, createMap, groundSpot, heightAt, mesaTops } from './terrain';
import { EVOLUTIONS, cooldownOf, weaponSpec } from './weapons';
import {
  CharacterId,
  Choice,
  EliteMod,
  Enemy,
  EnemyKind,
  GameEvent,
  Input,
  MetaBonuses,
  OwnedWeapon,
  PassiveId,
  PickupKind,
  RunState,
  Shot,
  ShrineKind,
  ShotKind,
  WeaponId,
} from './types';

const PLAYER_RADIUS = 0.5;

// Drops what fails `ok` from a list in place, keeping the order. The engine runs this on its
// lists every tick; making new arrays each time showed up as garbage-collection hitches.
const keep = <T>(list: T[], ok: (item: T) => boolean) => {
  let n = 0;
  for (let i = 0; i < list.length; i += 1) {
    if (ok(list[i])) {
      // eslint-disable-next-line no-param-reassign
      list[n] = list[i];
      n += 1;
    }
  }
  // eslint-disable-next-line no-param-reassign
  list.length = n;
};
// What gets through a shielded enemy's shield from the front.
export const SHIELD_FRONT = 0.2;
const ELITE_MODS: EliteMod[] = ['fast', 'giant', 'regen', 'burning'];
// Bolsonaro's sprint multiplies his speed by this.
const SPRINT_SPEED = 1.6;
// Lightning on a burning enemy does this many times its damage.
export const BURN_BOLT = 1.5;
// Seconds an enemy keeps burning after leaving the fire.
const BURN_SECONDS = 1.2;
// An enemy knocked into the arena's wall faster than this takes damage from the blow.
const SLAM_SPEED = 8;
// Pulled gems start slow and speed up towards the hero.
const PULL_START = 8;
const PULL_ACCEL = 70;
const PULL_MAX = 45;
// Seconds the horde thins out when a boss arrives.
const BOSS_CALM = 6;
const CELL = 3;

export const NO_META: MetaBonuses = {
  vigor: 0,
  might: 0,
  swift: 0,
  wisdom: 0,
  greed: 0,
  reroll: 0,
  regen: 0,
  armor: 0,
  crit: 0,
  hunter: 0,
  luck: 0,
  banish: 0,
  skip: 0,
};

export const passiveLevel = (state: RunState, id: PassiveId): number =>
  state.passives.find((p) => p.id === id)?.level ?? 0;

// The hero's stats right now: hero, permanent upgrades, Boletos, blessings and powerups.
export const runStats = (state: RunState): Stats => {
  const char = CHARACTERS[state.character];
  const temporary: Bonus[] = [];
  if (state.buffs.rage > 0) temporary.push({ stat: 'damage', mult: 2 });
  if (state.buffs.sprint > 0) temporary.push({ stat: 'moveSpeed', mult: SPRINT_SPEED });
  if (state.tier > 0) temporary.push({ stat: 'difficulty', flat: state.tier * TIER_DIFFICULTY });
  if (state.mastery > 0) {
    temporary.push({ stat: 'damage', mult: 1 + 0.01 * state.mastery });
    temporary.push({ stat: 'maxHp', flat: 2 * state.mastery });
  }
  if (state.time < (state.curseUntil ?? 0)) {
    temporary.push({ stat: 'difficulty', flat: CURSE_DIFFICULTY });
  }
  return computeStats({
    character: state.character,
    hp: char.hp,
    speed: char.speed,
    meta: state.meta,
    passives: state.passives,
    blessings: state.blessings,
    temporary,
  });
};

// Difficulty pays: more experience and gold for the tougher horde.
const xpMult = (stats: Stats): number => stats.xpGain * (1 + stats.difficulty);
const goldMult = (stats: Stats): number => stats.goldGain * (1 + stats.difficulty);

export { auraRadius, novaRadius, urnCount, urnOrbit } from './weapons';

const newId = (state: RunState): number => {
  state.nextId += 1;
  return state.nextId;
};

// A barrel or a pot somewhere on the open ground, away from the middle where the run starts.
function placeProp(state: RunState, kind: 'barrel' | 'pot') {
  const spot = groundSpot(state.map, state.rng);
  if (!spot) return;
  const def = ENEMIES[kind];
  state.enemies.push({
    id: newId(state),
    kind,
    elite: false,
    x: spot.x,
    z: spot.z,
    hp: def.hp,
    maxHp: def.hp,
    speed: 0,
    radius: def.radius,
    damage: 0,
    xp: 0,
    shootCd: 0,
    urnCd: 0,
    pushX: 0,
    pushZ: 0,
    flash: 0,
    prop: true,
  });
}

export const createRun = (
  seed: number,
  character: CharacterId,
  meta: MetaBonuses = NO_META,
  tier = 0,
  extra: { locked?: string[]; mastery?: number; daily?: string } = {}
): RunState => {
  const rng = createRng(seed);
  const map = createMap(rng);
  const state: RunState = {
    seed,
    rng,
    character,
    // A copy: the run must not share (or change) the caller's object.
    meta: { ...meta },
    tick: 0,
    time: 0,
    phase: 'playing',
    player: {
      x: 0,
      y: heightAt(map, 0, 0),
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      grounded: true,
      groundTime: 1,
      jumpBuffer: 0,
      coyote: 0,
      airJumps: 0,
      dirX: 0,
      dirZ: 1,
      moving: false,
      hp: 0,
      maxHp: 0,
      overHp: 0,
      shield: 0,
      shieldWait: 0,
      level: 1,
      xp: 0,
      invuln: 0,
      dashCd: 0,
      dashTime: 0,
      dashKeep: 0,
      abilityCd: 0,
    },
    weapons: [{ id: CHARACTERS[character].weapon, level: 1, cooldown: 0.5, angle: 0 }],
    passives: [],
    blessings: {},
    buffs: { rage: 0, freeze: 0, star: 0, sprint: 0 },
    stealBudget: 0,
    damageBy: {},
    enemies: [],
    shots: [],
    zones: [],
    pickups: [],
    shrines: [],
    map,
    chests: [],
    chestsBought: 0,
    choices: undefined,
    pendingChoices: 0,
    pendingBlessings: 0,
    rerolls: meta.reroll,
    banishes: meta.banish ?? 0,
    skips: meta.skip ?? 0,
    banned: [],
    kills: 0,
    gold: 0,
    nextId: 1,
    spawnBudget: 4,
    nextEliteAt: 60,
    bossesSpawned: 0,
    bossAlive: false,
    hazards: [],
    nextHordeEvent: 0,
    tier,
    nextPotsAt: 45,
    locked: extra.locked ?? [],
    mastery: extra.mastery ?? 0,
    daily: extra.daily,
  };
  const stats = runStats(state);
  state.player.maxHp = stats.maxHp;
  state.player.hp = stats.maxHp;
  state.player.shield = stats.shield;
  // The best rewards sit on the high tops: blessing totems first, then chests. The rest of the
  // shrines and chests go on the open ground.
  const tops = mesaTops(map);
  const onTop = () => {
    const m = tops.shift();
    return m && { x: m.x, z: m.z };
  };
  const kinds: ShrineKind[] = ['curse', 'gold', 'gold', 'heal', 'heal', 'challenge'];
  for (let i = 0; i < 4; i += 1) kinds.unshift('blessing');
  kinds.forEach((kind, id) => {
    const spot = (kind === 'blessing' && id < 3 && onTop()) || groundSpot(map, rng, 16);
    if (spot) state.shrines.push({ id, x: spot.x, z: spot.z, charge: 0, used: false, kind });
  });
  for (let id = 0; id < MAP_CHESTS; id += 1) {
    const spot = (id < 4 && onTop()) || groundSpot(map, rng, 20);
    if (spot) state.chests.push({ id, x: spot.x + 2.5, z: spot.z, charge: 0, opened: false });
  }
  for (let i = 0; i < 12; i += 1) placeProp(state, 'barrel');
  for (let i = 0; i < 18; i += 1) placeProp(state, 'pot');
  return state;
};

// --- Choices -------------------------------------------------------------------------------

// Max health follows the stat; growing it heals the difference, so a new level isn't empty.
const syncMaxHp = (state: RunState, stats: Stats) => {
  const { player } = state;
  const grew = stats.maxHp - player.maxHp;
  player.maxHp = stats.maxHp;
  player.hp = Math.min(player.maxHp, player.hp + Math.max(0, grew));
  player.shield = Math.min(player.shield, stats.shield);
};

// Picks `count` of `pool` without repeats, each as likely as its weight.
const pickWeighted = <T>(state: RunState, pool: { item: T; weight: number }[], count: number) => {
  const left = [...pool];
  const picked: T[] = [];
  while (picked.length < count && left.length > 0) {
    let roll = state.rng.next() * left.reduce((sum, p) => sum + p.weight, 0);
    let index = left.length - 1;
    for (let i = 0; i < left.length; i += 1) {
      roll -= left[i].weight;
      if (roll < 0) {
        index = i;
        break;
      }
    }
    picked.push(left.splice(index, 1)[0].item);
  }
  return picked;
};

// Chance that an offer is rare (two levels at once) or epic (three).
export const rareChance = (stats: Stats): number => 0.08 + luckShare(stats.luck) * 0.4;
export const epicChance = (stats: Stats): number => 0.02 + luckShare(stats.luck) * 0.1;

const banKey = (choice: Choice): string => `${choice.kind}:${'id' in choice ? choice.id : ''}`;

// Weapons at max level whose Boleto is in the build, not evolved yet.
export const evolutionsReady = (state: RunState): WeaponId[] =>
  state.weapons
    .filter(
      (w) =>
        !w.evolved &&
        w.level >= WEAPON_MAX_LEVEL &&
        state.passives.some((p) => p.id === EVOLUTIONS[w.id])
    )
    .map((w) => w.id);

// Everything that can be offered now, with how likely each is. `ownedOnly` leaves out new
// weapons and Boletos (what a chest gives).
const offerPool = (state: RunState, ownedOnly = false): { item: Choice; weight: number }[] => {
  const pool: { item: Choice; weight: number }[] = [];
  evolutionsReady(state).forEach((id) => pool.push({ item: { kind: 'evolve', id }, weight: 12 }));
  WEAPON_IDS.forEach((id) => {
    const owned = state.weapons.find((w) => w.id === id);
    if (owned) {
      if (owned.level < WEAPON_MAX_LEVEL) {
        pool.push({ item: { kind: 'weapon', id, level: owned.level + 1 }, weight: 5 });
      }
    } else if (!ownedOnly && state.weapons.length < MAX_WEAPONS) {
      pool.push({ item: { kind: 'weapon', id, level: 1 }, weight: 2 });
    }
  });
  // There are many more Boletos than weapons, so a new one weighs less.
  BOLETO_IDS.forEach((id) => {
    const level = passiveLevel(state, id);
    if (level > 0) {
      if (level < BOLETOS[id].max) {
        pool.push({ item: { kind: 'passive', id, level: level + 1 }, weight: 2.5 });
      }
    } else if (!ownedOnly && state.passives.length < MAX_PASSIVES) {
      pool.push({ item: { kind: 'passive', id, level: 1 }, weight: 0.35 });
    }
  });
  return pool.filter(
    (p) => !state.banned.includes(banKey(p.item)) && !state.locked.includes(banKey(p.item))
  );
};

// Luck may turn an offer rare or epic: more levels at once, up to the max.
const withRarity = (state: RunState, stats: Stats, choice: Choice): Choice => {
  if (choice.kind !== 'weapon' && choice.kind !== 'passive') return choice;
  const max = choice.kind === 'weapon' ? WEAPON_MAX_LEVEL : BOLETOS[choice.id].max;
  const roll = state.rng.next();
  let extra = 0;
  if (roll < epicChance(stats)) extra = 2;
  else if (roll < epicChance(stats) + rareChance(stats)) extra = 1;
  const level = Math.min(max, choice.level + extra);
  if (level === choice.level) return choice;
  return { ...choice, level, rarity: level - choice.level >= 2 ? 'epic' : 'rare' };
};

const rollChoices = (state: RunState): Choice[] => {
  const stats = runStats(state);
  const picked = pickWeighted(state, offerPool(state), 3).map((c) => withRarity(state, stats, c));
  if (picked.length < 3) picked.push({ kind: 'heal' });
  if (picked.length < 3) picked.push({ kind: 'gold' });
  return picked;
};

// A totem's offer: a level of any three Boletos, outside the four slots. Totems are generous: each
// option may be rare (two levels) or epic (three), more often with luck.
const rollBlessings = (state: RunState): Choice[] => {
  const stats = runStats(state);
  return pickWeighted(
    state,
    BOLETO_IDS.filter((id) => !state.locked.includes(`passive:${id}`)).map((id) => ({
      item: id,
      weight: 1,
    })),
    3
  ).map((id): Choice => {
    const roll = state.rng.next();
    const epic = 0.06 + epicChance(stats);
    const rare = 0.22 + rareChance(stats);
    if (roll < epic) return { kind: 'blessing', id, rarity: 'epic' };
    if (roll < epic + rare) return { kind: 'blessing', id, rarity: 'rare' };
    return { kind: 'blessing', id };
  });
};

export const blessingLevels = (choice: Choice): number => {
  if (choice.kind !== 'blessing') return 0;
  if (choice.rarity === 'epic') return 3;
  return choice.rarity === 'rare' ? 2 : 1;
};

const openChoices = (state: RunState) => {
  if (state.phase !== 'playing') return;
  if (state.pendingBlessings > 0) state.choices = rollBlessings(state);
  else if (state.pendingChoices > 0) state.choices = rollChoices(state);
  else return;
  state.phase = 'choosing';
};

const applyChoice = (state: RunState, choice: Choice) => {
  if (choice.kind === 'weapon') {
    const owned = state.weapons.find((w) => w.id === choice.id);
    if (owned) owned.level = choice.level;
    else state.weapons.push({ id: choice.id, level: choice.level, cooldown: 0.3, angle: 0 });
  } else if (choice.kind === 'passive') {
    const owned = state.passives.find((p) => p.id === choice.id);
    if (owned) owned.level = choice.level;
    else state.passives.push({ id: choice.id, level: choice.level });
  } else if (choice.kind === 'evolve') {
    const owned = state.weapons.find((w) => w.id === choice.id);
    if (owned) owned.evolved = true;
  } else if (choice.kind === 'blessing') {
    state.blessings[choice.id] = (state.blessings[choice.id] ?? 0) + blessingLevels(choice);
  } else if (choice.kind === 'heal') {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.maxHp * 0.3);
  } else {
    state.gold += 25;
  }
  syncMaxHp(state, runStats(state));
};

const closeOffer = (state: RunState, wasBlessing: boolean) => {
  if (wasBlessing) state.pendingBlessings -= 1;
  else state.pendingChoices -= 1;
  state.choices = undefined;
  state.phase = 'playing';
  openChoices(state);
};

export const choose = (state: RunState, index: number): boolean => {
  const choice = state.phase === 'choosing' ? state.choices?.[index] : undefined;
  if (!choice) return false;
  applyChoice(state, choice);
  closeOffer(state, choice.kind === 'blessing');
  return true;
};

// Takes an offered weapon or Boleto out of the run for good, and puts something else in its place.
export const banish = (state: RunState, index: number): boolean => {
  const choices = state.phase === 'choosing' ? state.choices : undefined;
  const choice = choices?.[index];
  if (!choices || !choice || state.banishes <= 0) return false;
  if (choice.kind !== 'weapon' && choice.kind !== 'passive') return false;
  state.banishes -= 1;
  state.banned.push(banKey(choice));
  const shown = new Set(choices.map(banKey));
  const stats = runStats(state);
  const [fresh] = pickWeighted(
    state,
    offerPool(state).filter((p) => !shown.has(banKey(p.item))),
    1
  );
  choices[index] = fresh ? withRarity(state, stats, fresh) : { kind: 'heal' };
  return true;
};

// Passes on this offer for a little gold.
export const skip = (state: RunState): boolean => {
  if (state.phase !== 'choosing' || state.skips <= 0 || !state.choices) return false;
  state.skips -= 1;
  state.gold += SKIP_GOLD;
  closeOffer(state, state.choices[0]?.kind === 'blessing');
  return true;
};

// How many upgrades a chest gives: usually one, sometimes three or five. Luck tilts it.
const chestCount = (state: RunState, stats: Stats): number => {
  const luck = luckShare(stats.luck);
  const five = 0.02 + luck * 0.15;
  const three = 0.12 + luck * 0.3;
  const roll = state.rng.next();
  if (roll < five) return 5;
  if (roll < five + three) return 3;
  return 1;
};

// Opens a chest: its upgrades go in at once (an evolution first, when one is ready), and the run
// waits on the 'chest' phase while the screen shows what came out.
const openChest = (state: RunState, stats: Stats, events: GameEvent[]) => {
  const count = chestCount(state, stats);
  const rewards: Choice[] = [];
  for (let i = 0; i < count; i += 1) {
    const pool = offerPool(state, true);
    const evolution = pool.find((p) => p.item.kind === 'evolve');
    const reward: Choice = evolution?.item ?? pickWeighted(state, pool, 1)[0] ?? { kind: 'gold' };
    applyChoice(state, reward);
    rewards.push(reward);
    if (reward.kind === 'evolve') events.push({ type: 'evolve', id: reward.id });
  }
  state.chest = rewards;
  state.phase = 'chest';
  events.push({ type: 'chest', count });
};

// Back to the run after looking at what a chest gave.
export const closeChest = (state: RunState): boolean => {
  if (state.phase !== 'chest') return false;
  state.chest = undefined;
  state.phase = 'playing';
  openChoices(state);
  return true;
};

export const reroll = (state: RunState): boolean => {
  if (state.phase !== 'choosing' || state.rerolls <= 0) return false;
  state.rerolls -= 1;
  state.choices =
    state.choices?.[0]?.kind === 'blessing' ? rollBlessings(state) : rollChoices(state);
  return true;
};

// --- Enemies -------------------------------------------------------------------------------

type Grid = Map<number, Enemy[]>;

const cellKey = (x: number, z: number): number =>
  Math.floor(x / CELL + 512) * 1024 + Math.floor(z / CELL + 512);

const buildGrid = (enemies: Enemy[]): Grid => {
  const grid: Grid = new Map();
  for (let i = 0; i < enemies.length; i += 1) {
    const e = enemies[i];
    const key = cellKey(e.x, e.z);
    const cell = grid.get(key);
    if (cell) cell.push(e);
    else grid.set(key, [e]);
  }
  return grid;
};

// Every living enemy whose body touches the circle. Bosses are bigger than a cell, so the search
// reaches one cell further than the radius.
const eachNear = (grid: Grid, x: number, z: number, radius: number, fn: (e: Enemy) => void) => {
  const reach = radius + CELL;
  const x0 = Math.floor((x - reach) / CELL + 512);
  const x1 = Math.floor((x + reach) / CELL + 512);
  const z0 = Math.floor((z - reach) / CELL + 512);
  const z1 = Math.floor((z + reach) / CELL + 512);
  for (let cx = x0; cx <= x1; cx += 1) {
    for (let cz = z0; cz <= z1; cz += 1) {
      const cell = grid.get(cx * 1024 + cz);
      if (cell) {
        for (let i = 0; i < cell.length; i += 1) {
          const e = cell[i];
          const dx = e.x - x;
          const dz = e.z - z;
          const r = radius + e.radius;
          if (e.hp > 0 && dx * dx + dz * dz <= r * r) fn(e);
        }
      }
    }
  }
};

const spawnEnemy = (
  state: RunState,
  stats: Stats,
  kind: EnemyKind,
  elite: boolean,
  x: number,
  z: number
): Enemy => {
  const def = ENEMIES[kind];
  const scale = enemyScale(state.time);
  let hp = def.hp * scale * (1 + stats.difficulty);
  let { radius, damage, xp } = def;
  if (kind === 'boss') {
    // The last boss is the elite one.
    if (elite) hp *= 3;
  } else if (elite) {
    hp *= 9;
    radius *= 1.5;
    damage *= 1.5;
    xp *= 8;
  }
  // Elites (not bosses) get one twist, named over their heads.
  const mod: EliteMod | undefined =
    elite && kind !== 'boss'
      ? ELITE_MODS[Math.floor(state.rng.next() * ELITE_MODS.length)]
      : undefined;
  let speed = def.speed * (1 + Math.min(0.25, state.time / 2400));
  if (mod === 'giant') {
    hp *= 1.6;
    radius *= 1.4;
  } else if (mod === 'fast') speed *= 1.6;
  const enemy: Enemy = {
    id: newId(state),
    kind,
    elite,
    x,
    z,
    hp,
    maxHp: hp,
    speed,
    radius,
    damage: damage * (1 + state.time / 500),
    xp,
    shootCd: 2,
    urnCd: 0,
    pushX: 0,
    pushZ: 0,
    flash: 0,
    mod,
    actCd: 2,
  };
  state.enemies.push(enemy);
  return enemy;
};

const spawnPoint = (state: RunState): { x: number; z: number } => {
  const { player, rng } = state;
  let x = 0;
  let z = 0;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const angle = rng.next() * Math.PI * 2;
    const dist = 26 + rng.next() * 6;
    x = player.x + dcos(angle) * dist;
    z = player.z + dsin(angle) * dist;
    if (Math.abs(x) < MAP_HALF - 2 && Math.abs(z) < MAP_HALF - 2) return { x, z };
  }
  return clampToMap(x, z, 2);
};

const rollKind = (state: RunState): EnemyKind => {
  const t = state.time;
  const weights: [EnemyKind, number][] = [
    ['husk', 10],
    ['runner', t > 45 ? 4 : 0],
    ['brute', t > 150 ? 1.2 + t / 400 : 0],
    ['spitter', t > 240 ? 2 : 0],
    ['charger', t > 120 ? 1.5 : 0],
    ['bomber', t > 170 ? 1.5 : 0],
    ['shield', t > 220 ? 1.2 : 0],
    ['summoner', t > 280 ? 0.5 : 0],
  ];
  let roll = state.rng.next() * weights.reduce((sum, [, w]) => sum + w, 0);
  for (let i = 0; i < weights.length; i += 1) {
    roll -= weights[i][1];
    if (roll < 0) return weights[i][0];
  }
  return 'husk';
};

const countProps = (state: RunState): number => {
  let props = 0;
  for (let i = 0; i < state.enemies.length; i += 1) if (state.enemies[i].prop) props += 1;
  return props;
};

// The horde's set pieces: a ring closing in, a stampede down a lane, a rain of blasts.
const hordeEvent = (state: RunState, stats: Stats, kind: string, events: GameEvent[]) => {
  const { player, rng } = state;
  const scale = enemyScale(state.time);
  if (kind === 'ring') {
    for (let i = 0; i < 36; i += 1) {
      const angle = (i / 36) * Math.PI * 2;
      const x = player.x + dcos(angle) * 22;
      const z = player.z + dsin(angle) * 22;
      const at = clampToMap(x, z, 2);
      spawnEnemy(state, stats, 'husk', false, at.x, at.z);
    }
  } else if (kind === 'stampede') {
    // A wall of runners on one side waits 1.5 s on its marked lane, then runs straight across.
    const angle = rng.next() * Math.PI * 2;
    const dx = dcos(angle);
    const dz = dsin(angle);
    const startX = player.x - dx * 28;
    const startZ = player.z - dz * 28;
    state.hazards.push({
      id: newId(state),
      kind: 'lane',
      x: startX,
      z: startZ,
      x2: player.x + dx * 28,
      z2: player.z + dz * 28,
      radius: 9,
      delay: 0,
      total: 1.5,
      life: 1.5,
      damage: 0,
      tickCd: 0,
    });
    for (let i = 0; i < 20; i += 1) {
      const side = (i / 19 - 0.5) * 16;
      const e = spawnEnemy(state, stats, 'runner', false, startX - dz * side, startZ + dx * side);
      e.act = { kind: 'aim', t: 1.5, dx, dz };
      e.actCd = 99;
    }
  } else {
    for (let i = 0; i < 14; i += 1) {
      const angle = rng.next() * Math.PI * 2;
      const dist = 2 + rng.next() * 9;
      const delay = 1 + i * 0.25;
      state.hazards.push({
        id: newId(state),
        kind: 'blast',
        x: player.x + dcos(angle) * dist,
        z: player.z + dsin(angle) * dist,
        radius: 2.2,
        delay,
        total: delay,
        life: 0,
        damage: 12 * scale,
        tickCd: 0,
      });
    }
  }
  events.push({ type: 'horde', kind: kind as 'ring' | 'stampede' | 'rain' });
};

const spawnWave = (state: RunState, stats: Stats, dt: number, events: GameEvent[]) => {
  const next = HORDE_EVENTS[state.nextHordeEvent];
  if (next && state.time >= next.at) {
    state.nextHordeEvent += 1;
    hordeEvent(state, stats, next.kind, events);
  }
  if (state.time >= state.nextPotsAt) {
    state.nextPotsAt += 45;
    if (countProps(state) < 40) for (let i = 0; i < 4; i += 1) placeProp(state, 'pot');
  }
  const calm = state.time < (state.calmUntil ?? 0) ? 0.25 : 1;
  state.spawnBudget += spawnRate(state.time) * (1 + stats.difficulty / 2) * calm * dt;
  const props = countProps(state);
  while (state.spawnBudget >= 1) {
    state.spawnBudget -= 1;
    if (state.enemies.length - props < MAX_ENEMIES) {
      const at = spawnPoint(state);
      spawnEnemy(state, stats, rollKind(state), false, at.x, at.z);
    }
  }
  if (state.time >= state.nextEliteAt) {
    state.nextEliteAt += ELITE_EVERY / stats.eliteRate;
    const at = spawnPoint(state);
    spawnEnemy(state, stats, state.time > 200 ? 'brute' : 'husk', true, at.x, at.z);
  }
  const bossDue =
    (state.bossesSpawned === 0 && state.time >= MID_BOSS_AT) ||
    (state.bossesSpawned === 1 && state.time >= RUN_SECONDS);
  if (bossDue) {
    const at = spawnPoint(state);
    spawnEnemy(state, stats, 'boss', state.bossesSpawned === 1, at.x, at.z);
    state.bossesSpawned += 1;
    state.bossAlive = true;
    state.calmUntil = state.time + BOSS_CALM;
    events.push({ type: 'boss' });
  }
};

const addPickup = (state: RunState, kind: PickupKind, x: number, z: number, value: number) => {
  if (kind === 'xp' && state.pickups.length >= MAX_PICKUPS) {
    // Too many gems on the floor: the newest one grows instead.
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      if (state.pickups[i].kind === 'xp') {
        state.pickups[i].value += value;
        return;
      }
    }
  }
  state.pickups.push({ id: newId(state), kind, x, z, value, pulled: false });
};

// Heals the hero. With overheal, what passes max health becomes extra health that fades.
const healPlayer = (state: RunState, stats: Stats, amount: number) => {
  const { player } = state;
  const room = player.maxHp - player.hp;
  player.hp += Math.min(room, amount);
  const extra = amount - Math.max(0, room);
  if (extra > 0 && stats.overheal > 0) {
    player.overHp = Math.min(player.maxHp * stats.overheal, player.overHp + extra);
  }
};

const hurtEnemy = (
  state: RunState,
  stats: Stats,
  e: Enemy,
  amount: number,
  events: GameEvent[],
  push?: number,
  weapon?: WeaponId,
  // Where a single hit came from. Shielded enemies block what comes from the front.
  from?: { x: number; z: number }
): void => {
  if (e.hp <= 0) return;
  const crit = state.rng.next() < stats.critChance;
  let dealt = crit ? amount * stats.critDamage : amount;
  if (e.kind === 'shield' && from) {
    // It faces the hero; a hit from that side mostly bounces off.
    const facing =
      (state.player.x - e.x) * (from.x - e.x) + (state.player.z - e.z) * (from.z - e.z);
    if (facing > 0) dealt *= SHIELD_FRONT;
  }
  if (e.elite || e.kind === 'boss') dealt *= stats.eliteDamage;
  if (weapon) state.damageBy[weapon] = (state.damageBy[weapon] ?? 0) + Math.min(dealt, e.hp);
  e.hp -= dealt;
  e.flash = 0.12;
  if (push && e.kind !== 'boss') {
    const dx = e.x - state.player.x;
    const dz = e.z - state.player.z;
    const len = dhypot(dx, dz) || 1;
    e.pushX += (dx / len) * push * stats.knockback;
    e.pushZ += (dz / len) * push * stats.knockback;
  }
  events.push({ type: 'hit', id: e.id, x: e.x, z: e.z, amount: Math.round(dealt), crit });
  // Lifesteal is a chance per hit to heal 1, with a budget a second: area weapons hit hundreds.
  if (stats.lifesteal > 0 && state.stealBudget >= 1 && state.rng.next() < stats.lifesteal) {
    state.stealBudget -= 1;
    healPlayer(state, stats, 1);
  }
};

// A warning circle that blows up after `delay` seconds.
const blastAt = (
  state: RunState,
  x: number,
  z: number,
  radius: number,
  damage: number,
  delay: number,
  fromBoss = false
) => {
  state.hazards.push({
    id: newId(state),
    ...{ kind: 'blast', x, z, radius, delay, total: delay, life: 0, damage, tickCd: 0, fromBoss },
  });
};

// A barrel blows up on the enemies around it; a pot spills gold.
const breakProp = (state: RunState, stats: Stats, prop: Enemy, events: GameEvent[]) => {
  if (prop.kind === 'barrel') {
    const radius = 4.5;
    const damage = 60 * enemyScale(state.time);
    state.enemies.forEach((e) => {
      if (!e.prop && e.hp > 0 && sq(e.x - prop.x) + sq(e.z - prop.z) < radius * radius) {
        hurtEnemy(state, stats, e, damage, events, 10);
      }
    });
    events.push({ type: 'blast', x: prop.x, z: prop.z, radius });
  } else {
    const coins = 2 + Math.floor(state.rng.next() * 3);
    for (let c = 0; c < coins; c += 1) {
      addPickup(state, 'gold', prop.x + (c - 1) * 0.5, prop.z, Math.ceil(goldMult(stats)));
    }
    if (state.rng.next() < 0.15) addPickup(state, 'heart', prop.x, prop.z + 0.6, 0);
  }
};

const reapEnemies = (state: RunState, stats: Stats, events: GameEvent[]) => {
  const { rng } = state;
  let anyDead = false;
  for (let i = 0; i < state.enemies.length; i += 1) {
    const e = state.enemies[i];
    if (e.hp <= 0 && e.prop) {
      anyDead = true;
      breakProp(state, stats, e, events);
    } else if (e.hp <= 0) {
      anyDead = true;
      state.kills += 1;
      // A bomber that dies before reaching the hero still goes off, a bit weaker.
      if (e.kind === 'bomber' && !e.act) blastAt(state, e.x, e.z, 2.4, e.damage * 0.6, 0.6);
      events.push({ type: 'kill', x: e.x, z: e.z, kind: e.kind, elite: e.elite });
      addPickup(state, 'xp', e.x, e.z, e.xp);
      const roll = rng.next();
      if (roll < 0.1) {
        addPickup(state, 'gold', e.x + 0.6, e.z, Math.ceil((1 + rng.next() * 2) * goldMult(stats)));
      } else if (roll < 0.108) addPickup(state, 'heart', e.x + 0.6, e.z, 0);
      else if (roll < 0.111) addPickup(state, 'magnet', e.x + 0.6, e.z, 0);
      const powerup = POWERUP_CHANCE * stats.powerupChance * (1 + luckShare(stats.luck));
      if (rng.next() < powerup) {
        addPickup(state, POWERUPS[Math.floor(rng.next() * POWERUPS.length)], e.x - 0.6, e.z, 0);
      }
      if (e.kind === 'boss') {
        state.bossAlive = false;
        state.gold += Math.round(40 * goldMult(stats));
        // Every gem and coin on the map comes at once: the payoff of a boss.
        state.pickups.forEach((p) => {
          if (p.kind === 'xp' || p.kind === 'gold') p.pulled = true;
        });
        addPickup(state, 'chest', e.x, e.z + 1, 0);
        if (e.elite) state.phase = 'won';
      } else if (e.elite) addPickup(state, 'chest', e.x, e.z + 0.8, 0);
    }
  }
  if (anyDead) keep(state.enemies, (e) => e.hp > 0);
};

const fireHostile = (state: RunState, e: Enemy, angle: number, speed: number, damage: number) => {
  state.shots.push({
    id: newId(state),
    kind: 'spit',
    hostile: true,
    fromBoss: e.kind === 'boss',
    x: e.x,
    z: e.z,
    vx: dcos(angle) * speed,
    vz: dsin(angle) * speed,
    radius: 0.45,
    damage,
    pierce: 0,
    life: 4,
    blast: 0,
    hit: [],
  });
};

// How high the hero's feet are over the ground under them.
const playerLift = (state: RunState): number =>
  state.player.y - heightAt(state.map, state.player.x, state.player.z);

// A hit on the hero, in this order: evasion may dodge it, armor makes it smaller, then the shield,
// the extra health from overheal and finally health take it. Bosses pierce part of the defense.
const hurtPlayer = (
  state: RunState,
  stats: Stats,
  amount: number,
  events: GameEvent[],
  fromBoss = false
) => {
  const { player } = state;
  if (player.invuln > 0 || player.dashTime > 0 || state.buffs.star > 0) return;
  if (state.phase !== 'playing') return;
  const defense = fromBoss ? 1 - BOSS_PIERCE : 1;
  if (stats.evasion > 0 && state.rng.next() < evasionChance(stats.evasion * defense)) {
    // A dodge also gives the short blink of a hit, or a crowd would just roll again next tick.
    player.invuln = 0.4;
    events.push({ type: 'evade' });
    return;
  }
  let left = amount * (1 - armorShare(stats.armor * defense));
  const shown = left;
  player.shieldWait = SHIELD_WAIT;
  if (player.shield > 0) {
    const taken = Math.min(player.shield, left);
    player.shield -= taken;
    left -= taken;
    if (player.shield <= 0) events.push({ type: 'shieldBreak' });
  }
  const over = Math.min(player.overHp, left);
  player.overHp -= over;
  left -= over;
  player.hp -= left;
  player.invuln = 0.6;
  events.push({ type: 'hurt', amount: Math.round(shown) });
  if (player.hp <= 0) {
    player.hp = 0;
    state.phase = 'dead';
  }
};

// A boss's attacks, one after another, each shown before it lands. Under half health it gets
// faster and its attacks bigger.
const bossAct = (
  state: RunState,
  stats: Stats,
  e: Enemy,
  dx: number,
  dz: number,
  dist: number,
  events: GameEvent[]
): number => {
  if (!e.phase2 && e.hp < e.maxHp / 2) {
    e.phase2 = true;
    e.speed *= 1.25;
    state.hazards.push({
      id: newId(state),
      ...{ kind: 'blast', x: e.x, z: e.z, radius: 4, delay: 0.8, total: 0.8, life: 0 },
      ...{ damage: e.damage, tickCd: 0, fromBoss: true },
    });
    events.push({ type: 'bossPhase' });
  }
  if ((e.actCd ?? 0) > 0 || dist > 30) return 1;
  const attacks = e.elite
    ? (['charge', 'stomp', 'fan', 'rain', 'summon'] as const)
    : (['charge', 'stomp', 'fan', 'summon'] as const);
  const attack = attacks[Math.floor(state.rng.next() * attacks.length)];
  e.actCd = (e.phase2 ? 0.65 : 1) * 2.8;
  const len = dist || 1;
  if (attack === 'charge') {
    e.act = { kind: 'aim', t: 1, dx: dx / len, dz: dz / len };
    state.hazards.push({
      id: newId(state),
      ...{ kind: 'lane', x: e.x, z: e.z, x2: e.x + (dx / len) * 18, z2: e.z + (dz / len) * 18 },
      ...{ radius: e.radius, delay: 0, total: 1, life: 1, damage: 0, tickCd: 0 },
    });
  } else if (attack === 'stomp') {
    e.act = { kind: 'stomp', t: 1, dx: 0, dz: 0 };
    blastAt(state, e.x, e.z, e.phase2 ? 9 : 7, e.damage * 1.5, 1, true);
  } else if (attack === 'fan') {
    e.act = { kind: 'fan', t: 0.6, dx: 0, dz: 0 };
  } else if (attack === 'rain') {
    e.act = { kind: 'rain', t: 0.5, dx: 0, dz: 0 };
    const { player, rng } = state;
    for (let i = 0; i < (e.phase2 ? 14 : 10); i += 1) {
      const angle = rng.next() * Math.PI * 2;
      const r = rng.next() * 9;
      blastAt(
        state,
        player.x + dcos(angle) * r,
        player.z + dsin(angle) * r,
        2.2,
        e.damage * 0.8,
        1.2 + i * 0.08,
        true
      );
    }
  } else {
    e.act = { kind: 'summon', t: 0.5, dx: 0, dz: 0 };
    const count = e.phase2 ? 8 : 6;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      spawnEnemy(state, stats, 'runner', false, e.x + dcos(angle) * 3, e.z + dsin(angle) * 3);
    }
  }
  return 0;
};

// What each kind of enemy does this tick, besides walking at the hero.
const enemyAct = (
  state: RunState,
  stats: Stats,
  e: Enemy,
  dx: number,
  dz: number,
  dist: number,
  dt: number,
  events: GameEvent[]
): number => {
  e.actCd = (e.actCd ?? 0) - dt;
  if (e.act) {
    e.act.t -= dt;
    const { act } = e;
    if (act.kind === 'charge' || act.kind === 'rush') {
      const speed = act.kind === 'rush' ? 15 : 20;
      e.x += act.dx * speed * dt;
      e.z += act.dz * speed * dt;
    }
    if (act.t <= 0) {
      e.act = undefined;
      if (act.kind === 'aim' && (e.kind === 'charger' || e.kind === 'boss')) {
        e.act = { kind: 'charge', t: e.kind === 'boss' ? 0.9 : 0.6, dx: act.dx, dz: act.dz };
      } else if (act.kind === 'aim' && e.kind === 'runner') {
        e.act = { kind: 'rush', t: 4.5, dx: act.dx, dz: act.dz };
      } else if (act.kind === 'aim' && e.kind === 'bomber') {
        e.hp = 0;
        e.xp = 0;
      } else if (act.kind === 'fan') {
        const shots = e.phase2 ? 18 : 12;
        const aim = datan2(dz, dx);
        for (let s = 0; s < shots; s += 1) {
          fireHostile(state, e, aim + (s / (shots - 1) - 0.5) * 1.7, 10, e.damage * 0.5);
        }
      }
    }
    // Busy: no walking at the hero.
    return 0;
  }
  if (e.kind === 'charger' && e.actCd <= 0 && dist < 12) {
    const len = dist || 1;
    e.act = { kind: 'aim', t: 0.8, dx: dx / len, dz: dz / len };
    e.actCd = 3.5;
    state.hazards.push({
      id: newId(state),
      ...{ kind: 'lane', x: e.x, z: e.z, x2: e.x + (dx / len) * 14, z2: e.z + (dz / len) * 14 },
      ...{ radius: 0.9, delay: 0, total: 0.8, life: 0.8, damage: 0, tickCd: 0 },
    });
    return 0;
  }
  if (e.kind === 'bomber' && dist < 2.2) {
    e.act = { kind: 'aim', t: 0.6, dx: 0, dz: 0 };
    blastAt(state, e.x, e.z, 2.6, e.damage, 0.6);
    return 0;
  }
  if (e.kind === 'summoner') {
    if (e.actCd <= 0) {
      e.actCd = 6;
      // On the hero's side, so the swarm doesn't shove its caller forward.
      const ux = dx / (dist || 1);
      const uz = dz / (dist || 1);
      for (let n = 0; n < 5; n += 1) {
        const side = (n - 2) * 0.8;
        spawnEnemy(
          state,
          stats,
          'swarm',
          false,
          e.x + ux * 1.6 - uz * side,
          e.z + uz * 1.6 + ux * side
        );
      }
    }
    // Stays back.
    if (dist < 12) return -0.6;
    if (dist < 15) return 0;
  }
  if (e.kind === 'boss') return bossAct(state, stats, e, dx, dz, dist, events);
  if (e.kind === 'spitter') {
    e.shootCd -= dt;
    if (e.shootCd <= 0 && dist < 18) {
      e.shootCd = 2.6;
      fireHostile(state, e, datan2(dz, dx), 9, e.damage * 1.6);
    }
    // Keeps its distance and shoots.
    if (dist < 8) return -0.6;
    if (dist < 11) return 0;
  }
  if (e.mod === 'regen') e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.02 * dt);
  if (e.mod === 'burning') {
    e.shootCd -= dt;
    if (e.shootCd <= 0) {
      e.shootCd = 1;
      state.hazards.push({
        id: newId(state),
        ...{ kind: 'fire', x: e.x, z: e.z, radius: 1.6, delay: 0, total: 0, life: 3 },
        ...{ damage: 6 * enemyScale(state.time), tickCd: 0 },
      });
    }
  }
  return 1;
};

const moveEnemies = (
  state: RunState,
  stats: Stats,
  grid: Grid,
  dt: number,
  events: GameEvent[]
) => {
  const { player, enemies } = state;
  // Frozen by a powerup: nothing walks, shoots or bites.
  const frozen = state.buffs.freeze > 0;
  for (let i = 0; i < enemies.length; i += 1) {
    const e = enemies[i];
    e.flash = Math.max(0, e.flash - dt);
    e.urnCd = Math.max(0, e.urnCd - dt);
    e.touchCd = Math.max(0, (e.touchCd ?? 0) - dt);
    if (e.burn) e.burn = Math.max(0, e.burn - dt);
    // eslint-disable-next-line no-continue
    if (frozen || e.prop) continue;
    const dx = player.x - e.x;
    const dz = player.z - e.z;
    const dist = dhypot(dx, dz) || 1;
    const walk = enemyAct(state, stats, e, dx, dz, dist, dt, events);
    const fromX = e.x;
    const fromZ = e.z;
    e.x += ((dx / dist) * e.speed * walk + e.pushX) * dt;
    e.z += ((dz / dist) * e.speed * walk + e.pushZ) * dt;
    // Enemies climb cliffs, but one thrown hard against a cliff stops there and is hurt by it.
    if (e.kind !== 'boss' && dhypot(e.pushX, e.pushZ) > SLAM_SPEED) {
      const rise = heightAt(state.map, e.x, e.z) - heightAt(state.map, fromX, fromZ);
      if (rise > 1.2) {
        e.x = fromX;
        e.z = fromZ;
        hurtEnemy(state, stats, e, dhypot(e.pushX, e.pushZ) * 1.5 * stats.damage, events);
        e.pushX = 0;
        e.pushZ = 0;
      }
    }
    e.pushX *= 0.86;
    e.pushZ *= 0.86;

    // Touching means close, and at the same height: an enemy at the foot of a cliff can't bite
    // the hero on top (until it climbs up).
    const lift = dist < e.radius + PLAYER_RADIUS ? player.y - heightAt(state.map, e.x, e.z) : 0;
    if (
      dist < e.radius + PLAYER_RADIUS &&
      lift > -1.5 &&
      lift < ENEMIES[e.kind].height * (e.radius / ENEMIES[e.kind].radius)
    ) {
      hurtPlayer(state, stats, e.damage, events, e.kind === 'boss');
      if (stats.thorns > 0 && e.touchCd <= 0) {
        e.touchCd = 0.5;
        hurtEnemy(state, stats, e, stats.thorns * stats.damage, events);
      }
    }
  }

  // Push overlapping enemies apart so the horde spreads instead of stacking on one spot.
  for (let i = 0; i < enemies.length; i += 1) {
    const e = enemies[i];
    if (e.kind !== 'boss' && !e.prop) {
      eachNear(grid, e.x, e.z, e.radius * 0.8, (other) => {
        if (other.id <= e.id || other.kind === 'boss' || other.prop) return;
        const dx = other.x - e.x;
        const dz = other.z - e.z;
        const dist = dhypot(dx, dz) || 0.01;
        const overlap = (e.radius + other.radius) * 0.9 - dist;
        if (overlap > 0) {
          const push = (overlap / dist) * 0.5;
          e.x -= dx * push;
          e.z -= dz * push;
          other.x += dx * push;
          other.z += dz * push;
        }
      });
    }
    const inside = clampToMap(e.x, e.z, 0.5);
    if (inside.x !== e.x || inside.z !== e.z) {
      e.x = inside.x;
      e.z = inside.z;
      // Knocked into the edge of the map: the blow hurts.
      const blow = dhypot(e.pushX, e.pushZ);
      if (blow > SLAM_SPEED && e.kind !== 'boss') {
        hurtEnemy(state, stats, e, blow * 1.5 * stats.damage, events);
        e.pushX = 0;
        e.pushZ = 0;
      }
    }
  }
};

// --- Weapons -------------------------------------------------------------------------------

const nearestEnemies = (state: RunState, count: number, range: number): Enemy[] => {
  const { player, enemies } = state;
  const found: { e: Enemy; d: number }[] = [];
  for (let i = 0; i < enemies.length; i += 1) {
    const e = enemies[i];
    const d = sq(e.x - player.x) + sq(e.z - player.z);
    if (e.hp > 0 && !e.prop && d < range * range) {
      if (found.length < count) {
        found.push({ e, d });
        found.sort((a, b) => a.d - b.d);
      } else if (d < found[count - 1].d) {
        found[count - 1] = { e, d };
        found.sort((a, b) => a.d - b.d);
      }
    }
  }
  return found.map((f) => f.e);
};

// Speed and life come from the weapon's spec, with Projectile Speed and Duration already in.
// Bombs don't bounce, the rest take Ricochet.
const firePlayerShot = (
  state: RunState,
  stats: Stats,
  kind: ShotKind,
  angle: number,
  speed: number,
  shot: { radius: number; damage: number; pierce: number; life: number; blast?: number },
  from: { x: number; z: number } = state.player
) => {
  state.shots.push({
    id: newId(state),
    kind,
    hostile: false,
    x: from.x,
    z: from.z,
    vx: dcos(angle) * speed,
    vz: dsin(angle) * speed,
    hit: [],
    blast: 0,
    bounces: kind === 'missile' ? 0 : stats.ricochet,
    ...shot,
  });
};

// The weapon each player shot belongs to, for the damage count.
const SHOT_WEAPON: Record<ShotKind, WeaponId | undefined> = {
  card: 'card',
  missile: 'missile',
  axe: 'axe',
  spit: undefined,
};

// Fires one weapon. Answers the seconds until it fires again, or 0 when it had nothing to hit.
const fireWeapon = (
  state: RunState,
  weapon: OwnedWeapon,
  stats: Stats,
  grid: Grid,
  events: GameEvent[]
): number => {
  const { player, rng } = state;
  const spec = weaponSpec(weapon, stats);
  const evo = !!weapon.evolved;

  if (weapon.id === 'missile') {
    const targets = nearestEnemies(state, spec.count, 20);
    if (targets.length === 0) return 0;
    for (let i = 0; i < spec.count; i += 1) {
      const target = targets[i % targets.length];
      const spread = i >= targets.length ? (rng.next() - 0.5) * 0.5 : 0;
      firePlayerShot(
        state,
        stats,
        'missile',
        datan2(target.z - player.z, target.x - player.x) + spread,
        spec.speed,
        {
          radius: evo ? 0.9 : 0.45,
          damage: spec.damage,
          pierce: 0,
          life: spec.life,
          blast: spec.area,
        }
      );
    }
    return spec.cooldown;
  }

  if (weapon.id === 'aura') {
    let touched = 0;
    eachNear(grid, player.x, player.z, spec.area, (e) => {
      touched += 1;
      hurtEnemy(state, stats, e, spec.damage, events, 0, 'aura');
    });
    // Evolved: the tears heal a little for every enemy in them.
    if (evo && touched > 0) healPlayer(state, stats, Math.min(1.5, touched * 0.25));
    return spec.cooldown;
  }

  if (weapon.id === 'card') {
    const targets = nearestEnemies(state, evo ? 1 : spec.count, 22);
    if (targets.length === 0) return 0;
    for (let i = 0; i < spec.count; i += 1) {
      const target = targets[i % targets.length];
      const aim = datan2(target.z - player.z, target.x - player.x);
      // Evolved: a fan towards the nearest enemy.
      let spread = 0;
      if (evo) spread = (i / Math.max(1, spec.count - 1) - 0.5) * 1.2;
      else if (i >= targets.length) spread = (rng.next() - 0.5) * 0.4;
      firePlayerShot(state, stats, 'card', aim + spread, spec.speed, {
        radius: spec.area,
        damage: spec.damage,
        pierce: spec.pierce,
        life: spec.life,
      });
    }
    return spec.cooldown;
  }

  if (weapon.id === 'axe') {
    // Thrown at the nearest enemy, or ahead when there is none.
    const [near] = nearestEnemies(state, 1, 14);
    const base = near
      ? datan2(near.z - player.z, near.x - player.x)
      : datan2(player.dirZ, player.dirX);
    for (let i = 0; i < spec.count; i += 1) {
      firePlayerShot(state, stats, 'axe', base + (i - (spec.count - 1) / 2) * 0.32, spec.speed, {
        radius: spec.area,
        damage: spec.damage,
        pierce: -1,
        life: spec.life,
      });
    }
    return spec.cooldown;
  }

  if (weapon.id === 'nova') {
    eachNear(grid, player.x, player.z, spec.area, (e) =>
      hurtEnemy(state, stats, e, spec.damage, events, 14, 'nova')
    );
    events.push({ type: 'nova', x: player.x, z: player.z, radius: spec.area });
    // Evolved: each wave fills half the shield.
    if (evo) player.shield = Math.min(stats.shield, player.shield + stats.shield * 0.5);
    return spec.cooldown;
  }

  if (weapon.id === 'bolt') {
    const candidates: Enemy[] = [];
    eachNear(grid, player.x, player.z, spec.area, (e) => {
      if (!e.prop) candidates.push(e);
    });
    if (candidates.length === 0) return 0;
    for (let s = 0; s < spec.count; s += 1) {
      let target: Enemy | undefined = candidates[Math.floor(rng.next() * candidates.length)];
      const points = [{ x: player.x, z: player.z }];
      const struck: number[] = [];
      for (let jump = 0; jump < spec.pierce && target; jump += 1) {
        const from: Enemy = target;
        // Burning enemies take more from lightning.
        const amount = (from.burn ?? 0) > 0 ? spec.damage * BURN_BOLT : spec.damage;
        hurtEnemy(state, stats, from, amount, events, 0, 'bolt', points[points.length - 1]);
        struck.push(from.id);
        points.push({ x: from.x, z: from.z });
        let next: Enemy | undefined;
        let best = Infinity;
        eachNear(grid, from.x, from.z, 7, (e) => {
          const d = sq(e.x - from.x) + sq(e.z - from.z);
          if (d < best && !struck.includes(e.id)) {
            best = d;
            next = e;
          }
        });
        target = next;
      }
      events.push({ type: 'bolt', points });
    }
    return spec.cooldown;
  }

  if (weapon.id === 'urns') {
    // Only the evolved ring shoots: every box at the enemy nearest to it.
    const count = Math.min(12, spec.count);
    const orbit = spec.area;
    let fired = false;
    for (let b = 0; b < count; b += 1) {
      const angle = weapon.angle + (b / count) * Math.PI * 2;
      const from = { x: player.x + dcos(angle) * orbit, z: player.z + dsin(angle) * orbit };
      let target: Enemy | undefined;
      let best = 14 * 14;
      eachNear(grid, from.x, from.z, 14, (e) => {
        const d = sq(e.x - from.x) + sq(e.z - from.z);
        if (d < best) {
          best = d;
          target = e;
        }
      });
      if (target) {
        fired = true;
        const aim = datan2(target.z - from.z, target.x - from.x);
        firePlayerShot(
          state,
          stats,
          'card',
          aim,
          spec.speed,
          { radius: 0.35, damage: spec.damage * 0.6, pierce: 0, life: spec.life },
          from
        );
      }
    }
    return fired ? spec.cooldown : 0;
  }

  // The fire trail.
  state.zones.push({
    id: newId(state),
    x: player.x,
    z: player.z,
    radius: spec.area,
    life: spec.life,
    tickCd: 0,
    damage: spec.damage,
  });
  return spec.cooldown;
};

const runWeapons = (state: RunState, stats: Stats, grid: Grid, dt: number, events: GameEvent[]) => {
  const { player } = state;
  for (let i = 0; i < state.weapons.length; i += 1) {
    const weapon = state.weapons[i];
    if (weapon.id === 'urns') {
      const spec = weaponSpec(weapon, stats);
      weapon.angle += (2.8 / cooldownOf(stats)) * dt;
      for (let b = 0; b < spec.count; b += 1) {
        const angle = weapon.angle + (b / spec.count) * Math.PI * 2;
        const box = {
          x: player.x + dcos(angle) * spec.area,
          z: player.z + dsin(angle) * spec.area,
        };
        eachNear(grid, box.x, box.z, 0.8, (e) => {
          if (e.urnCd > 0) return;
          e.urnCd = 0.4;
          hurtEnemy(state, stats, e, spec.damage, events, 6, 'urns', box);
        });
      }
      if (weapon.evolved) {
        weapon.cooldown -= dt;
        if (weapon.cooldown <= 0) weapon.cooldown = fireWeapon(state, weapon, stats, grid, events);
      }
    } else {
      weapon.cooldown -= dt;
      if (weapon.cooldown <= 0) weapon.cooldown = fireWeapon(state, weapon, stats, grid, events);
    }
  }
};

// Turns a shot towards the nearest enemy it hasn't hit yet. Answers whether there was one.
const bounce = (grid: Grid, shot: Shot): boolean => {
  let next: Enemy | undefined;
  let best = Infinity;
  eachNear(grid, shot.x, shot.z, 10, (e) => {
    const d = sq(e.x - shot.x) + sq(e.z - shot.z);
    if (d < best && !shot.hit.includes(e.id)) {
      best = d;
      next = e;
    }
  });
  if (!next) return false;
  const speed = dhypot(shot.vx, shot.vz);
  const len = Math.sqrt(best) || 1;
  shot.vx = ((next.x - shot.x) / len) * speed;
  shot.vz = ((next.z - shot.z) / len) * speed;
  shot.life = Math.max(shot.life, 0.8);
  shot.bounces = (shot.bounces ?? 0) - 1;
  return true;
};

const moveShots = (state: RunState, stats: Stats, grid: Grid, dt: number, events: GameEvent[]) => {
  const { player } = state;
  for (let i = 0; i < state.shots.length; i += 1) {
    const shot = state.shots[i];
    shot.x += shot.vx * dt;
    shot.z += shot.vz * dt;
    shot.life -= dt;
    if (shot.hostile) {
      const r = shot.radius + PLAYER_RADIUS;
      if (
        sq(shot.x - player.x) + sq(shot.z - player.z) < r * r &&
        playerLift(state) < SHOT_HEIGHT + shot.radius &&
        player.dashTime <= 0
      ) {
        hurtPlayer(state, stats, shot.damage, events, shot.fromBoss);
        shot.life = 0;
      }
    } else if (shot.blast > 0) {
      // A missile goes off on the first enemy it touches, or where it runs out of fuel.
      let touched = shot.life <= 0;
      eachNear(grid, shot.x, shot.z, shot.radius, () => {
        touched = true;
      });
      if (touched) {
        shot.life = 0;
        eachNear(grid, shot.x, shot.z, shot.blast, (e) =>
          hurtEnemy(state, stats, e, shot.damage, events, 8, 'missile')
        );
        events.push({ type: 'blast', x: shot.x, z: shot.z, radius: shot.blast });
      }
    } else {
      const ending = shot.life <= 0;
      let stopped = false;
      eachNear(grid, shot.x, shot.z, shot.radius, (e) => {
        if (stopped || shot.life <= 0 || shot.hit.includes(e.id)) return;
        shot.hit.push(e.id);
        hurtEnemy(
          state,
          stats,
          e,
          shot.damage,
          events,
          shot.kind === 'axe' ? 5 : 2,
          SHOT_WEAPON[shot.kind],
          shot
        );
        if (shot.pierce === 0) stopped = true;
        else if (shot.pierce > 0) shot.pierce -= 1;
      });
      // Where it would stop (a hit it can't go through, or the end of its flight), Ricochet
      // sends it on to the next enemy instead.
      if (stopped || ending) {
        if (!((shot.bounces ?? 0) > 0 && bounce(grid, shot))) shot.life = 0;
      }
    }
  }
  keep(state.shots, (s) => s.life > 0);

  for (let i = 0; i < state.zones.length; i += 1) {
    const zone = state.zones[i];
    zone.life -= dt;
    zone.tickCd -= dt;
    if (zone.tickCd <= 0) {
      zone.tickCd = 0.4;
      eachNear(grid, zone.x, zone.z, zone.radius, (e) => {
        e.burn = BURN_SECONDS;
        hurtEnemy(state, stats, e, zone.damage, events, 0, 'trail');
      });
    }
  }
  keep(state.zones, (z) => z.life > 0);
};

// --- Player --------------------------------------------------------------------------------

// Quake's acceleration: pushes along `dir` only while the speed along it is under `cap`.
const accelerate = (
  player: RunState['player'],
  dirX: number,
  dirZ: number,
  cap: number,
  accel: number,
  dt: number
) => {
  const room = cap - (player.vx * dirX + player.vz * dirZ);
  if (room <= 0) return;
  const push = Math.min(room, accel * dt);
  player.vx += dirX * push;
  player.vz += dirZ * push;
};

// Ground steeper than this (rise over run) is a wall: it stops the hero unless already above it.
// Ground falling away as steeply under a walking hero is an edge to fall from.
const WALL_SLOPE = 1.1;

// Whether the hero, with feet at `y`, can go from (x0, z0) to (x1, z1): not into ground that rises
// like a wall above its feet.
const canStep = (state: RunState, y: number, x0: number, z0: number, x1: number, z1: number) => {
  const to = heightAt(state.map, x1, z1);
  if (to <= y + 0.05) return true;
  const run = dhypot(x1 - x0, z1 - z0);
  if (run < 1e-6) return true;
  return (to - heightAt(state.map, x0, z0)) / run < WALL_SLOPE;
};

// Moves the hero towards (x, z), sliding along walls and the edge of the map, and drops the part of
// the speed that goes into them.
const moveAcross = (state: RunState, x: number, z: number) => {
  const { player } = state;
  const to = clampToMap(x, z);
  if (to.x !== x) player.vx = 0;
  if (to.z !== z) player.vz = 0;
  const { x: x0, z: z0, y } = player;
  if (canStep(state, y, x0, z0, to.x, to.z)) {
    player.x = to.x;
    player.z = to.z;
  } else if (canStep(state, y, x0, z0, to.x, z0)) {
    player.x = to.x;
    player.vz = 0;
  } else if (canStep(state, y, x0, z0, x0, to.z)) {
    player.z = to.z;
    player.vx = 0;
  } else {
    player.vx = 0;
    player.vz = 0;
  }
};

const movePlayer = (
  state: RunState,
  input: Input,
  stats: Stats,
  dt: number,
  events: GameEvent[]
) => {
  const { player } = state;
  const len = Math.min(1, dhypot(input.moveX, input.moveZ));
  player.moving = len > 0.05;
  const wishX = player.moving ? input.moveX / dhypot(input.moveX, input.moveZ) : 0;
  const wishZ = player.moving ? input.moveZ / dhypot(input.moveX, input.moveZ) : 0;
  if (player.moving) {
    player.dirX = wishX;
    player.dirZ = wishZ;
  }
  const wishSpeed = stats.moveSpeed * len;
  player.invuln = Math.max(0, player.invuln - dt);
  player.dashCd = Math.max(0, player.dashCd - dt);
  player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
  player.coyote = Math.max(0, player.coyote - dt);
  if (player.grounded) player.groundTime += dt;

  // Jumping: only a press jumps, early presses wait for the landing, and a press in the air with
  // no ground to use spends an extra jump.
  if (input.jump) {
    if (!player.grounded && player.coyote <= 0 && player.airJumps < stats.extraJumps) {
      player.airJumps += 1;
      player.vy = MOVE.jumpSpeed * stats.jumpHeight;
      events.push({ type: 'jump', air: true });
    } else player.jumpBuffer = MOVE.jumpBuffer;
  }
  if (player.jumpBuffer > 0 && (player.grounded || player.coyote > 0)) {
    player.vy = MOVE.jumpSpeed * stats.jumpHeight;
    player.grounded = false;
    player.jumpBuffer = 0;
    player.coyote = 0;
    events.push({ type: 'jump', air: false });
  }

  if (input.dash && player.dashCd <= 0) {
    player.dashCd = MOVE.dashCooldown;
    player.dashTime = MOVE.dashSeconds;
    player.dashKeep = dhypot(player.vx, player.vz);
    player.vy = Math.max(0, player.vy);
    events.push({ type: 'dash' });
  }

  if (player.dashTime > 0) {
    player.dashTime -= dt;
    player.vx = player.dirX * MOVE.dashSpeed;
    player.vz = player.dirZ * MOVE.dashSpeed;
    if (player.dashTime <= 0) {
      // The dash gives no speed of its own: it ends at the speed it started with.
      const back = Math.max(wishSpeed, player.dashKeep);
      player.vx = player.dirX * back;
      player.vz = player.dirZ * back;
    }
  } else if (player.grounded) {
    if (player.groundTime > MOVE.hopWindow) {
      const speed = dhypot(player.vx, player.vz);
      if (speed > 0) {
        const drop = Math.max(speed, MOVE.stopSpeed) * MOVE.friction * dt;
        const scale = Math.max(0, speed - drop) / speed;
        player.vx *= scale;
        player.vz *= scale;
      }
    }
    if (player.moving)
      accelerate(player, wishX, wishZ, wishSpeed, MOVE.groundAccel * wishSpeed, dt);
  } else if (player.moving) {
    accelerate(
      player,
      wishX,
      wishZ,
      Math.min(wishSpeed, MOVE.airCap),
      MOVE.airAccel * wishSpeed,
      dt
    );
  }

  if (player.dashTime <= 0) {
    const speed = dhypot(player.vx, player.vz);
    const cap = stats.moveSpeed * MOVE.maxSpeed;
    if (speed > cap) {
      player.vx *= cap / speed;
      player.vz *= cap / speed;
    }
  }

  // Rising with the key let go falls back sooner, so a tap is a small hop.
  const lift = player.vy > 0 && !input.jumpHeld ? MOVE.jumpCut : 1;
  if (!player.grounded) player.vy -= MOVE.gravity * lift * dt;
  const fromX = player.x;
  const fromZ = player.z;
  moveAcross(state, player.x + player.vx * dt, player.z + player.vz * dt);
  player.y += player.vy * dt;

  const ground = heightAt(state.map, player.x, player.z);
  if (player.grounded) {
    const drop = player.y - ground;
    const moved = dhypot(player.x - fromX, player.z - fromZ);
    if (drop > 0.05 && drop > moved * WALL_SLOPE) {
      // Walked off an edge: falling, with a moment left to jump.
      player.grounded = false;
      player.coyote = MOVE.coyote;
    } else {
      // Walking follows the hills and the ramps.
      player.y = ground;
      player.vy = 0;
    }
  } else if (player.y <= ground) {
    player.y = ground;
    player.vy = 0;
    player.grounded = true;
    player.groundTime = 0;
    player.airJumps = 0;
    events.push({ type: 'land', speed: dhypot(player.vx, player.vz) });
    if (player.jumpBuffer > 0) {
      // Pressed just before landing: off again on the same tick, with all the speed.
      player.vy = MOVE.jumpSpeed * stats.jumpHeight;
      player.grounded = false;
      player.jumpBuffer = 0;
      events.push({ type: 'jump', air: false });
    }
  }
  if (stats.regen > 0) healPlayer(state, stats, (stats.regen / 60) * dt);
};

const gainXp = (state: RunState, amount: number, events: GameEvent[]) => {
  const { player } = state;
  player.xp += amount;
  while (player.xp >= xpToNext(player.level)) {
    player.xp -= xpToNext(player.level);
    player.level += 1;
    state.pendingChoices += 1;
    events.push({ type: 'levelup' });
  }
};

// What a powerup does when picked up.
const applyPowerup = (
  state: RunState,
  stats: Stats,
  kind: PickupKind,
  grid: Grid,
  events: GameEvent[]
) => {
  const { player } = state;
  events.push({ type: 'powerup', kind });
  if (kind === 'rage' || kind === 'freeze' || kind === 'star') {
    state.buffs[kind] = Math.max(state.buffs[kind], BUFF_SECONDS[kind] * stats.powerupPower);
  } else if (kind === 'bomb') {
    // Clears the horde around the hero; a boss only loses a slice.
    eachNear(grid, player.x, player.z, 24, (e) => {
      const amount = e.kind === 'boss' ? e.maxHp * 0.05 * stats.powerupPower : e.hp + 1;
      e.hp -= amount;
      e.flash = 0.12;
    });
    events.push({ type: 'nova', x: player.x, z: player.z, radius: 24 });
  } else if (kind === 'goldrain') {
    const coins = Math.round(10 * stats.powerupPower);
    for (let c = 0; c < coins; c += 1) {
      const angle = (c / coins) * Math.PI * 2;
      addPickup(
        state,
        'gold',
        player.x + dcos(angle) * 4,
        player.z + dsin(angle) * 4,
        Math.ceil(2 * goldMult(stats))
      );
    }
  }
};

// Danger on the ground: blasts go off when their warning runs out, fire burns while you stand
// in it, lanes only warn (the stampede itself does the damage).
const runHazards = (state: RunState, stats: Stats, dt: number, events: GameEvent[]) => {
  const { player } = state;
  for (let i = 0; i < state.hazards.length; i += 1) {
    const h = state.hazards[i];
    const reach = h.radius + PLAYER_RADIUS;
    const inside = sq(player.x - h.x) + sq(player.z - h.z) < reach * reach;
    if (h.kind === 'blast') {
      h.delay -= dt;
      if (h.delay <= 0) {
        if (inside && playerLift(state) < 2.5) {
          hurtPlayer(state, stats, h.damage, events, h.fromBoss);
        }
        events.push({ type: 'explode', x: h.x, z: h.z, radius: h.radius });
      }
    } else {
      h.life -= dt;
      h.tickCd -= dt;
      if (h.kind === 'fire' && inside && h.tickCd <= 0 && playerLift(state) < 1) {
        h.tickCd = 0.5;
        hurtPlayer(state, stats, h.damage, events);
      }
    }
  }
  keep(state.hazards, (h) => (h.kind === 'blast' ? h.delay > 0 : h.life > 0));
};

// What a shrine does when its charge fills.
const activateShrine = (
  state: RunState,
  stats: Stats,
  kind: ShrineKind,
  grid: Grid,
  events: GameEvent[]
) => {
  const { player } = state;
  if (kind === 'blessing') state.pendingBlessings += 1;
  else if (kind === 'curse') state.curseUntil = state.time + CURSE_SECONDS;
  else if (kind === 'gold') {
    state.gold += Math.round(30 * goldMult(stats));
    applyPowerup(state, stats, 'goldrain', grid, events);
  } else if (kind === 'heal') {
    healPlayer(state, stats, player.maxHp);
  } else {
    state.challenge = {
      until: state.time + CHALLENGE_SECONDS,
      need: 30 + Math.floor(state.time / 60) * 10,
      from: state.kills,
    };
  }
};

// The shrines that last: a curse pays a chest when it ends, a challenge when it's met in time.
const tickShrines = (state: RunState, events: GameEvent[]) => {
  const { player } = state;
  if (state.curseUntil !== undefined && state.time >= state.curseUntil) {
    state.curseUntil = undefined;
    addPickup(state, 'chest', player.x + 1.5, player.z, 0);
    events.push({ type: 'shrineDone', kind: 'curse', ok: true });
  }
  const { challenge } = state;
  if (challenge) {
    if (state.kills - challenge.from >= challenge.need) {
      state.challenge = undefined;
      addPickup(state, 'chest', player.x + 1.5, player.z, 0);
      events.push({ type: 'shrineDone', kind: 'challenge', ok: true });
    } else if (state.time >= challenge.until) {
      state.challenge = undefined;
      events.push({ type: 'shrineDone', kind: 'challenge', ok: false });
    }
  }
};

const collectPickups = (
  state: RunState,
  stats: Stats,
  grid: Grid,
  dt: number,
  events: GameEvent[]
) => {
  const { player } = state;
  let taken = false;
  let magnet = false;
  for (let i = 0; i < state.pickups.length; i += 1) {
    const p = state.pickups[i];
    const dx = player.x - p.x;
    const dz = player.z - p.z;
    const dist = dhypot(dx, dz) || 0.01;
    if (dist < stats.pickupRange) p.pulled = true;
    if (p.pulled) {
      p.pull = Math.min(PULL_MAX, (p.pull ?? PULL_START) + PULL_ACCEL * dt);
      const step = Math.min(dist, p.pull * dt);
      p.x += (dx / dist) * step;
      p.z += (dz / dist) * step;
    }
    if (dist < 0.9) {
      taken = true;
      events.push({ type: 'pickup', kind: p.kind, x: p.x, z: p.z });
      if (p.kind === 'xp') gainXp(state, p.value * xpMult(stats), events);
      else if (p.kind === 'gold') state.gold += p.value;
      else if (p.kind === 'heart') healPlayer(state, stats, player.maxHp * 0.25);
      else if (p.kind === 'magnet') magnet = true;
      else if (p.kind === 'chest') {
        if (state.phase === 'playing') openChest(state, stats, events);
        else state.pendingChoices += 1;
      } else applyPowerup(state, stats, p.kind, grid, events);
      p.value = -1;
    }
  }
  if (taken) keep(state.pickups, (p) => p.value >= 0);
  if (magnet) {
    state.pickups.forEach((p) => {
      if (p.kind === 'xp' || p.kind === 'gold') p.pulled = true;
    });
  }

  for (let i = 0; i < state.shrines.length; i += 1) {
    const shrine = state.shrines[i];
    if (!shrine.used) {
      const inside =
        sq(shrine.x - player.x) + sq(shrine.z - player.z) < SHRINE_RADIUS * SHRINE_RADIUS;
      shrine.charge = inside
        ? shrine.charge + dt / SHRINE_SECONDS
        : Math.max(0, shrine.charge - dt / SHRINE_SECONDS);
      if (shrine.charge >= 1) {
        shrine.used = true;
        activateShrine(state, stats, shrine.kind ?? 'blessing', grid, events);
        events.push({ type: 'shrine', x: shrine.x, z: shrine.z });
      }
    }
  }

  // Map chests: standing on one buys it, when the gold is there.
  const price = chestPrice(state.chestsBought);
  for (let i = 0; i < state.chests.length; i += 1) {
    const chest = state.chests[i];
    if (!chest.opened) {
      const near =
        sq(chest.x - player.x) + sq(chest.z - player.z) < MAP_CHEST_RADIUS * MAP_CHEST_RADIUS &&
        Math.abs(player.y - heightAt(state.map, chest.x, chest.z)) < 2;
      chest.charge = near && state.gold >= price ? chest.charge + dt / MAP_CHEST_SECONDS : 0;
      if (chest.charge >= 1 && state.phase === 'playing') {
        chest.opened = true;
        state.gold -= price;
        state.chestsBought += 1;
        events.push({ type: 'chestBuy', x: chest.x, z: chest.z, price });
        openChest(state, stats, events);
        return;
      }
    }
  }
};

// Timers of the defense stats and powerups: the shield fills after a while without a hit,
// overheal fades, lifesteal's budget comes back.
const tickDefense = (state: RunState, stats: Stats, dt: number) => {
  const { player, buffs } = state;
  buffs.rage = Math.max(0, buffs.rage - dt);
  buffs.freeze = Math.max(0, buffs.freeze - dt);
  buffs.star = Math.max(0, buffs.star - dt);
  buffs.sprint = Math.max(0, buffs.sprint - dt);
  player.abilityCd = Math.max(0, player.abilityCd - dt);
  player.shieldWait = Math.max(0, player.shieldWait - dt);
  if (player.shieldWait <= 0 && player.shield < stats.shield) {
    player.shield = Math.min(stats.shield, player.shield + stats.shield * SHIELD_FILL * dt);
  }
  player.overHp = Math.min(
    player.maxHp * stats.overheal,
    Math.max(0, player.overHp - player.overHp * OVERHEAL_FADE * dt - 0.2 * dt)
  );
  state.stealBudget = Math.min(LIFESTEAL_PER_SECOND, state.stealBudget + LIFESTEAL_PER_SECOND * dt);
};

// Each hero's ability, on Q with a long cooldown. They grow with the hero's level and stats.
const fireAbility = (state: RunState, stats: Stats, grid: Grid, events: GameEvent[]) => {
  const { player, character } = state;
  player.abilityCd = ABILITY_COOLDOWN[character];
  events.push({ type: 'ability', hero: character });
  const lv = player.level;
  if (character === 'eneas') {
    // A rain of bombs on the nearest enemies, or around the hero when there are few.
    const targets = nearestEnemies(state, 10, 24);
    for (let i = 0; i < 10; i += 1) {
      const target = targets[i];
      const angle = target
        ? datan2(target.z - player.z, target.x - player.x)
        : (i / 10) * Math.PI * 2;
      firePlayerShot(state, stats, 'missile', angle, 14 * stats.projectileSpeed, {
        radius: 0.6,
        damage: (40 + 6 * lv) * stats.damage,
        pierce: 0,
        life: 1.6 * stats.duration,
        blast: 3.5 * stats.size,
      });
    }
  } else if (character === 'lula') {
    // Cards in every direction, going through the crowd.
    for (let i = 0; i < 24; i += 1) {
      firePlayerShot(state, stats, 'card', (i / 24) * Math.PI * 2, 24 * stats.projectileSpeed, {
        radius: 0.45,
        damage: (25 + 4 * lv) * stats.damage,
        pierce: 3,
        life: 1.2 * stats.duration,
      });
    }
  } else if (character === 'janja') {
    // Heals, fills the shield and throws everything close away.
    healPlayer(state, stats, player.maxHp * 0.3);
    player.shield = stats.shield;
    eachNear(grid, player.x, player.z, 8 * stats.size, (e) =>
      hurtEnemy(state, stats, e, (10 + 3 * lv) * stats.damage, events, 30)
    );
    events.push({ type: 'nova', x: player.x, z: player.z, radius: 8 * stats.size });
  } else {
    // Bolsonaro: runs much faster for a while, untouchable for the first part of it.
    state.buffs.sprint = BUFF_SECONDS.sprint;
    state.buffs.star = Math.max(state.buffs.star, 2);
  }
};

// Advances the run by one tick. The same state and the same inputs always give the same result.
export const step = (state: RunState, input: Input, dt: number): GameEvent[] => {
  const events: GameEvent[] = [];
  if (state.phase !== 'playing') return events;
  state.tick += 1;
  state.time += dt;
  const stats = runStats(state);
  tickDefense(state, stats, dt);

  movePlayer(state, input, stats, dt, events);
  spawnWave(state, stats, dt, events);
  const grid = buildGrid(state.enemies);
  moveEnemies(state, stats, grid, dt, events);
  if (input.ability && state.player.abilityCd <= 0) fireAbility(state, stats, grid, events);
  runHazards(state, stats, dt, events);
  runWeapons(state, stats, grid, dt, events);
  moveShots(state, stats, grid, dt, events);
  reapEnemies(state, stats, events);
  collectPickups(state, stats, grid, dt, events);
  tickShrines(state, events);
  openChoices(state);
  return events;
};
