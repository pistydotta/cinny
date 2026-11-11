/* eslint-disable no-param-reassign */
import {
  ARENA_RADIUS,
  CHARACTERS,
  ENEMIES,
  MAX_ENEMIES,
  MAX_PASSIVES,
  MAX_PICKUPS,
  MAX_WEAPONS,
  MID_BOSS_AT,
  PASSIVE_IDS,
  PASSIVE_MAX,
  RUN_SECONDS,
  SHRINE_RADIUS,
  SHRINE_SECONDS,
  WEAPON_IDS,
  WEAPON_MAX_LEVEL,
  enemyScale,
  spawnRate,
  xpToNext,
} from './data';
import { createRng } from './rng';
import {
  CharacterId,
  Choice,
  Enemy,
  EnemyKind,
  GameEvent,
  Input,
  MetaBonuses,
  OwnedWeapon,
  PassiveId,
  PickupKind,
  RunState,
  ShotKind,
  WeaponId,
} from './types';

const PLAYER_RADIUS = 0.5;
const CELL = 3;
const CRIT_CHANCE = 0.1;
const DASH_SECONDS = 0.18;
const DASH_SPEED = 26;
const DASH_COOLDOWN = 2.2;

export const NO_META: MetaBonuses = {
  vigor: 0,
  might: 0,
  swift: 0,
  wisdom: 0,
  greed: 0,
  reroll: 0,
};

export const passiveLevel = (state: RunState, id: PassiveId): number =>
  state.passives.find((p) => p.id === id)?.level ?? 0;

export const runStats = (state: RunState) => {
  const char = CHARACTERS[state.character];
  return {
    damage: char.damage * (1 + 0.15 * passiveLevel(state, 'might')) * (1 + 0.05 * state.meta.might),
    cooldown: 1 / (1 + 0.12 * passiveLevel(state, 'haste')),
    area: 1 + 0.12 * passiveLevel(state, 'reach'),
    speed: char.speed * (1 + 0.08 * passiveLevel(state, 'swift')) * (1 + 0.03 * state.meta.swift),
    pickup: 3 * (1 + 0.35 * passiveLevel(state, 'magnet')),
    extraShots: passiveLevel(state, 'multi'),
    regen: 0.3 * passiveLevel(state, 'vigor'),
    xp: 1 + 0.05 * state.meta.wisdom,
    gold: 1 + 0.1 * state.meta.greed,
  };
};

type Stats = ReturnType<typeof runStats>;

const maxHpOf = (state: RunState): number =>
  CHARACTERS[state.character].hp + 10 * state.meta.vigor + 20 * passiveLevel(state, 'vigor');

export const urnCount = (weapon: OwnedWeapon, stats: Stats): number =>
  2 + Math.floor(weapon.level / 2) + stats.extraShots;

export const urnOrbit = (stats: Stats): number => 3.2 * stats.area;

export const auraRadius = (weapon: OwnedWeapon, stats: Stats): number =>
  (2.8 + 0.3 * weapon.level) * stats.area;

export const novaRadius = (weapon: OwnedWeapon, stats: Stats): number =>
  (4.6 + 0.6 * weapon.level) * stats.area;

export const createRun = (
  seed: number,
  character: CharacterId,
  meta: MetaBonuses = NO_META
): RunState => {
  const rng = createRng(seed);
  const state: RunState = {
    seed,
    rng,
    character,
    meta,
    tick: 0,
    time: 0,
    phase: 'playing',
    player: {
      x: 0,
      z: 0,
      dirX: 0,
      dirZ: 1,
      moving: false,
      hp: 0,
      maxHp: 0,
      level: 1,
      xp: 0,
      invuln: 0,
      dashCd: 0,
      dashTime: 0,
    },
    weapons: [{ id: CHARACTERS[character].weapon, level: 1, cooldown: 0.5, angle: 0 }],
    passives: [],
    enemies: [],
    shots: [],
    zones: [],
    pickups: [],
    shrines: [],
    choices: undefined,
    pendingChoices: 0,
    rerolls: meta.reroll,
    kills: 0,
    gold: 0,
    nextId: 1,
    spawnBudget: 4,
    nextEliteAt: 60,
    bossesSpawned: 0,
    bossAlive: false,
  };
  state.player.maxHp = maxHpOf(state);
  state.player.hp = state.player.maxHp;
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2 + rng.next() * 0.8;
    const dist = 18 + rng.next() * 36;
    state.shrines.push({
      id: i,
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      charge: 0,
      used: false,
    });
  }
  return state;
};

const newId = (state: RunState): number => {
  state.nextId += 1;
  return state.nextId;
};

// --- Choices -------------------------------------------------------------------------------

const rollChoices = (state: RunState): Choice[] => {
  const pool: Choice[] = [];
  WEAPON_IDS.forEach((id) => {
    const owned = state.weapons.find((w) => w.id === id);
    if (owned) {
      if (owned.level < WEAPON_MAX_LEVEL) pool.push({ kind: 'weapon', id, level: owned.level + 1 });
    } else if (state.weapons.length < MAX_WEAPONS) pool.push({ kind: 'weapon', id, level: 1 });
  });
  PASSIVE_IDS.forEach((id) => {
    const level = passiveLevel(state, id);
    if (level > 0) {
      if (level < PASSIVE_MAX[id]) pool.push({ kind: 'passive', id, level: level + 1 });
    } else if (state.passives.length < MAX_PASSIVES) pool.push({ kind: 'passive', id, level: 1 });
  });
  const picked: Choice[] = [];
  while (picked.length < 3 && pool.length > 0) {
    picked.push(pool.splice(Math.floor(state.rng.next() * pool.length), 1)[0]);
  }
  if (picked.length < 3) picked.push({ kind: 'heal' });
  if (picked.length < 3) picked.push({ kind: 'gold' });
  return picked;
};

const openChoices = (state: RunState) => {
  if (state.phase !== 'playing' || state.pendingChoices <= 0) return;
  state.choices = rollChoices(state);
  state.phase = 'choosing';
};

export const choose = (state: RunState, index: number): boolean => {
  const choice = state.phase === 'choosing' ? state.choices?.[index] : undefined;
  if (!choice) return false;
  if (choice.kind === 'weapon') {
    const owned = state.weapons.find((w) => w.id === choice.id);
    if (owned) owned.level = choice.level;
    else state.weapons.push({ id: choice.id, level: 1, cooldown: 0.3, angle: 0 });
  } else if (choice.kind === 'passive') {
    const owned = state.passives.find((p) => p.id === choice.id);
    if (owned) owned.level = choice.level;
    else state.passives.push({ id: choice.id, level: 1 });
    if (choice.id === 'vigor') {
      state.player.maxHp = maxHpOf(state);
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 20);
    }
  } else if (choice.kind === 'heal') {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.maxHp * 0.3);
  } else {
    state.gold += 25;
  }
  state.pendingChoices -= 1;
  state.choices = undefined;
  state.phase = 'playing';
  openChoices(state);
  return true;
};

export const reroll = (state: RunState): boolean => {
  if (state.phase !== 'choosing' || state.rerolls <= 0) return false;
  state.rerolls -= 1;
  state.choices = rollChoices(state);
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
  kind: EnemyKind,
  elite: boolean,
  x: number,
  z: number
): Enemy => {
  const def = ENEMIES[kind];
  const scale = enemyScale(state.time);
  let hp = def.hp * scale;
  let { radius, damage, xp } = def;
  if (kind === 'boss') {
    // The last boss is the elite one.
    if (elite) hp *= 2.2;
  } else if (elite) {
    hp *= 9;
    radius *= 1.5;
    damage *= 1.5;
    xp *= 8;
  }
  const enemy: Enemy = {
    id: newId(state),
    kind,
    elite,
    x,
    z,
    hp,
    maxHp: hp,
    speed: def.speed * (1 + Math.min(0.25, state.time / 2400)),
    radius,
    damage: damage * (1 + state.time / 500),
    xp,
    shootCd: 2,
    urnCd: 0,
    pushX: 0,
    pushZ: 0,
    flash: 0,
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
    x = player.x + Math.cos(angle) * dist;
    z = player.z + Math.sin(angle) * dist;
    if (Math.hypot(x, z) < ARENA_RADIUS - 1) return { x, z };
  }
  const len = Math.hypot(x, z);
  const fit = (ARENA_RADIUS - 1) / len;
  return { x: x * fit, z: z * fit };
};

const rollKind = (state: RunState): EnemyKind => {
  const t = state.time;
  const weights: [EnemyKind, number][] = [
    ['husk', 10],
    ['runner', t > 45 ? 4 : 0],
    ['brute', t > 150 ? 1.2 + t / 400 : 0],
    ['spitter', t > 240 ? 2 : 0],
  ];
  let roll = state.rng.next() * weights.reduce((sum, [, w]) => sum + w, 0);
  for (let i = 0; i < weights.length; i += 1) {
    roll -= weights[i][1];
    if (roll < 0) return weights[i][0];
  }
  return 'husk';
};

const spawnWave = (state: RunState, dt: number, events: GameEvent[]) => {
  state.spawnBudget += spawnRate(state.time) * dt;
  while (state.spawnBudget >= 1) {
    state.spawnBudget -= 1;
    if (state.enemies.length < MAX_ENEMIES) {
      const at = spawnPoint(state);
      spawnEnemy(state, rollKind(state), false, at.x, at.z);
    }
  }
  if (state.time >= state.nextEliteAt) {
    state.nextEliteAt += 45;
    const at = spawnPoint(state);
    spawnEnemy(state, state.time > 200 ? 'brute' : 'husk', true, at.x, at.z);
  }
  const bossDue =
    (state.bossesSpawned === 0 && state.time >= MID_BOSS_AT) ||
    (state.bossesSpawned === 1 && state.time >= RUN_SECONDS);
  if (bossDue) {
    const at = spawnPoint(state);
    spawnEnemy(state, 'boss', state.bossesSpawned === 1, at.x, at.z);
    state.bossesSpawned += 1;
    state.bossAlive = true;
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

const hurtEnemy = (
  state: RunState,
  e: Enemy,
  amount: number,
  events: GameEvent[],
  push = 0
): void => {
  if (e.hp <= 0) return;
  const crit = state.rng.next() < CRIT_CHANCE;
  const dealt = crit ? amount * 2 : amount;
  e.hp -= dealt;
  e.flash = 0.12;
  if (push > 0 && e.kind !== 'boss') {
    const dx = e.x - state.player.x;
    const dz = e.z - state.player.z;
    const len = Math.hypot(dx, dz) || 1;
    e.pushX += (dx / len) * push;
    e.pushZ += (dz / len) * push;
  }
  events.push({ type: 'hit', x: e.x, z: e.z, amount: Math.round(dealt), crit });
};

const reapEnemies = (state: RunState, stats: Stats, events: GameEvent[]) => {
  const { rng } = state;
  let anyDead = false;
  for (let i = 0; i < state.enemies.length; i += 1) {
    const e = state.enemies[i];
    if (e.hp <= 0) {
      anyDead = true;
      state.kills += 1;
      events.push({ type: 'kill', x: e.x, z: e.z, kind: e.kind, elite: e.elite });
      addPickup(state, 'xp', e.x, e.z, e.xp);
      const roll = rng.next();
      if (roll < 0.1) {
        addPickup(state, 'gold', e.x + 0.6, e.z, Math.ceil((1 + rng.next() * 2) * stats.gold));
      } else if (roll < 0.108) addPickup(state, 'heart', e.x + 0.6, e.z, 0);
      else if (roll < 0.111) addPickup(state, 'magnet', e.x + 0.6, e.z, 0);
      if (e.kind === 'boss') {
        state.bossAlive = false;
        state.gold += Math.round(40 * stats.gold);
        addPickup(state, 'chest', e.x, e.z + 1, 0);
        if (e.elite) state.phase = 'won';
      } else if (e.elite) addPickup(state, 'chest', e.x, e.z + 0.8, 0);
    }
  }
  if (anyDead) state.enemies = state.enemies.filter((e) => e.hp > 0);
};

const fireHostile = (state: RunState, e: Enemy, angle: number, speed: number, damage: number) => {
  state.shots.push({
    id: newId(state),
    kind: 'spit',
    hostile: true,
    x: e.x,
    z: e.z,
    vx: Math.cos(angle) * speed,
    vz: Math.sin(angle) * speed,
    radius: 0.45,
    damage,
    pierce: 0,
    life: 4,
    blast: 0,
    hit: [],
  });
};

const hurtPlayer = (state: RunState, amount: number, events: GameEvent[]) => {
  const { player } = state;
  if (player.invuln > 0 || player.dashTime > 0 || state.phase !== 'playing') return;
  player.hp -= amount;
  player.invuln = 0.6;
  events.push({ type: 'hurt', amount: Math.round(amount) });
  if (player.hp <= 0) {
    player.hp = 0;
    state.phase = 'dead';
  }
};

const moveEnemies = (state: RunState, grid: Grid, dt: number, events: GameEvent[]) => {
  const { player, enemies } = state;
  for (let i = 0; i < enemies.length; i += 1) {
    const e = enemies[i];
    const dx = player.x - e.x;
    const dz = player.z - e.z;
    const dist = Math.hypot(dx, dz) || 1;
    let walk = 1;
    if (e.kind === 'spitter') {
      // Keeps its distance and shoots.
      if (dist < 8) walk = -0.6;
      else if (dist < 11) walk = 0;
    }
    e.x += ((dx / dist) * e.speed * walk + e.pushX) * dt;
    e.z += ((dz / dist) * e.speed * walk + e.pushZ) * dt;
    e.pushX *= 0.86;
    e.pushZ *= 0.86;
    e.flash = Math.max(0, e.flash - dt);
    e.urnCd = Math.max(0, e.urnCd - dt);

    if (e.kind === 'spitter' || e.kind === 'boss') {
      e.shootCd -= dt;
      if (e.shootCd <= 0 && dist < 18) {
        if (e.kind === 'boss') {
          e.shootCd = 3.5;
          const base = state.rng.next() * Math.PI * 2;
          for (let s = 0; s < 12; s += 1) {
            fireHostile(state, e, base + (s / 12) * Math.PI * 2, 8, e.damage * 0.5);
          }
        } else {
          e.shootCd = 2.6;
          fireHostile(state, e, Math.atan2(dz, dx), 9, e.damage * 1.6);
        }
      }
    }

    if (dist < e.radius + PLAYER_RADIUS) hurtPlayer(state, e.damage, events);
  }

  // Push overlapping enemies apart so the horde spreads instead of stacking on one spot.
  for (let i = 0; i < enemies.length; i += 1) {
    const e = enemies[i];
    if (e.kind !== 'boss') {
      eachNear(grid, e.x, e.z, e.radius * 0.8, (other) => {
        if (other.id <= e.id || other.kind === 'boss') return;
        const dx = other.x - e.x;
        const dz = other.z - e.z;
        const dist = Math.hypot(dx, dz) || 0.01;
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
    const len = Math.hypot(e.x, e.z);
    if (len > ARENA_RADIUS) {
      e.x *= ARENA_RADIUS / len;
      e.z *= ARENA_RADIUS / len;
    }
  }
};

// --- Weapons -------------------------------------------------------------------------------

const nearestEnemies = (state: RunState, count: number, range: number): Enemy[] => {
  const { player, enemies } = state;
  const found: { e: Enemy; d: number }[] = [];
  for (let i = 0; i < enemies.length; i += 1) {
    const e = enemies[i];
    const d = (e.x - player.x) ** 2 + (e.z - player.z) ** 2;
    if (e.hp > 0 && d < range * range) {
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

const firePlayerShot = (
  state: RunState,
  kind: ShotKind,
  angle: number,
  speed: number,
  shot: { radius: number; damage: number; pierce: number; life: number; blast?: number }
) => {
  state.shots.push({
    id: newId(state),
    kind,
    hostile: false,
    x: state.player.x,
    z: state.player.z,
    vx: Math.cos(angle) * speed,
    vz: Math.sin(angle) * speed,
    hit: [],
    blast: 0,
    ...shot,
  });
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
  const lv = weapon.level;
  const cooldowns: Record<WeaponId, number> = {
    missile: 1.7 - lv * 0.07,
    card: 0.85,
    aura: 0.5,
    urns: 0,
    nova: 3.2 - lv * 0.15,
    bolt: 1.7 - lv * 0.08,
    axe: 1.5 - lv * 0.06,
    trail: 0.45,
  };
  const wait = cooldowns[weapon.id] * stats.cooldown;

  if (weapon.id === 'missile') {
    const count = 1 + Math.floor(lv / 3) + stats.extraShots;
    const targets = nearestEnemies(state, count, 20);
    if (targets.length === 0) return 0;
    for (let i = 0; i < count; i += 1) {
      const target = targets[i % targets.length];
      const spread = i >= targets.length ? (rng.next() - 0.5) * 0.5 : 0;
      firePlayerShot(
        state,
        'missile',
        Math.atan2(target.z - player.z, target.x - player.x) + spread,
        16,
        {
          radius: 0.45,
          damage: (16 + 7 * lv) * stats.damage,
          pierce: 0,
          life: 1.5,
          blast: (2 + 0.25 * lv) * stats.area,
        }
      );
    }
    return wait;
  }

  if (weapon.id === 'aura') {
    const damage = (3 + 2 * lv) * stats.damage;
    eachNear(grid, player.x, player.z, auraRadius(weapon, stats), (e) =>
      hurtEnemy(state, e, damage, events)
    );
    return wait;
  }

  if (weapon.id === 'card') {
    const count = 1 + Math.floor(lv / 3) + stats.extraShots;
    const targets = nearestEnemies(state, count, 22);
    if (targets.length === 0) return 0;
    for (let i = 0; i < count; i += 1) {
      const target = targets[i % targets.length];
      const spread = i >= targets.length ? (rng.next() - 0.5) * 0.4 : 0;
      firePlayerShot(
        state,
        'card',
        Math.atan2(target.z - player.z, target.x - player.x) + spread,
        24,
        {
          radius: 0.4,
          damage: (9 + 4 * lv) * stats.damage,
          pierce: lv >= 4 ? 1 : 0,
          life: 1.2,
        }
      );
    }
    return wait;
  }

  if (weapon.id === 'axe') {
    const count = 1 + (lv >= 3 ? 1 : 0) + (lv >= 6 ? 1 : 0) + stats.extraShots;
    // Thrown at the nearest enemy, or ahead when there is none.
    const [near] = nearestEnemies(state, 1, 14);
    const base = near
      ? Math.atan2(near.z - player.z, near.x - player.x)
      : Math.atan2(player.dirZ, player.dirX);
    for (let i = 0; i < count; i += 1) {
      firePlayerShot(state, 'axe', base + (i - (count - 1) / 2) * 0.32, 17, {
        radius: 1.1 * stats.area,
        damage: (14 + 6 * lv) * stats.damage,
        pierce: -1,
        life: 1.1,
      });
    }
    return wait;
  }

  if (weapon.id === 'nova') {
    const radius = novaRadius(weapon, stats);
    const damage = (12 + 7 * lv) * stats.damage;
    eachNear(grid, player.x, player.z, radius, (e) => hurtEnemy(state, e, damage, events, 14));
    events.push({ type: 'nova', x: player.x, z: player.z, radius });
    return wait;
  }

  if (weapon.id === 'bolt') {
    const candidates: Enemy[] = [];
    eachNear(grid, player.x, player.z, 15, (e) => candidates.push(e));
    if (candidates.length === 0) return 0;
    const strikes = 1 + stats.extraShots;
    const damage = (11 + 6 * lv) * stats.damage;
    for (let s = 0; s < strikes; s += 1) {
      let target: Enemy | undefined = candidates[Math.floor(rng.next() * candidates.length)];
      const points = [{ x: player.x, z: player.z }];
      const struck: number[] = [];
      for (let jump = 0; jump < 2 + Math.floor(lv / 2) && target; jump += 1) {
        const from: Enemy = target;
        hurtEnemy(state, from, damage, events);
        struck.push(from.id);
        points.push({ x: from.x, z: from.z });
        let next: Enemy | undefined;
        let best = Infinity;
        eachNear(grid, from.x, from.z, 7, (e) => {
          const d = (e.x - from.x) ** 2 + (e.z - from.z) ** 2;
          if (d < best && !struck.includes(e.id)) {
            best = d;
            next = e;
          }
        });
        target = next;
      }
      events.push({ type: 'bolt', points });
    }
    return wait;
  }

  if (weapon.id === 'trail') {
    state.zones.push({
      id: newId(state),
      x: player.x,
      z: player.z,
      radius: 1.7 * stats.area,
      life: 2.4 + 0.3 * lv,
      tickCd: 0,
      damage: (3 + 2.4 * lv) * stats.damage,
    });
    return wait;
  }

  return 0;
};

const runWeapons = (state: RunState, stats: Stats, grid: Grid, dt: number, events: GameEvent[]) => {
  const { player } = state;
  for (let i = 0; i < state.weapons.length; i += 1) {
    const weapon = state.weapons[i];
    if (weapon.id === 'urns') {
      weapon.angle += (2.8 / stats.cooldown) * dt;
      const count = urnCount(weapon, stats);
      const orbit = urnOrbit(stats);
      const damage = (6 + 3.5 * weapon.level) * stats.damage;
      for (let b = 0; b < count; b += 1) {
        const angle = weapon.angle + (b / count) * Math.PI * 2;
        eachNear(
          grid,
          player.x + Math.cos(angle) * orbit,
          player.z + Math.sin(angle) * orbit,
          0.8,
          (e) => {
            if (e.urnCd > 0) return;
            e.urnCd = 0.4;
            hurtEnemy(state, e, damage, events, 6);
          }
        );
      }
    } else {
      weapon.cooldown -= dt;
      if (weapon.cooldown <= 0) weapon.cooldown = fireWeapon(state, weapon, stats, grid, events);
    }
  }
};

const moveShots = (state: RunState, grid: Grid, dt: number, events: GameEvent[]) => {
  const { player } = state;
  for (let i = 0; i < state.shots.length; i += 1) {
    const shot = state.shots[i];
    shot.x += shot.vx * dt;
    shot.z += shot.vz * dt;
    shot.life -= dt;
    if (shot.hostile) {
      const r = shot.radius + PLAYER_RADIUS;
      if ((shot.x - player.x) ** 2 + (shot.z - player.z) ** 2 < r * r && player.dashTime <= 0) {
        hurtPlayer(state, shot.damage, events);
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
          hurtEnemy(state, e, shot.damage, events, 8)
        );
        events.push({ type: 'blast', x: shot.x, z: shot.z, radius: shot.blast });
      }
    } else {
      eachNear(grid, shot.x, shot.z, shot.radius, (e) => {
        if (shot.life <= 0 || shot.hit.includes(e.id)) return;
        shot.hit.push(e.id);
        hurtEnemy(state, e, shot.damage, events, shot.kind === 'axe' ? 5 : 2);
        if (shot.pierce === 0) shot.life = 0;
        else if (shot.pierce > 0) shot.pierce -= 1;
      });
    }
  }
  state.shots = state.shots.filter((s) => s.life > 0);

  for (let i = 0; i < state.zones.length; i += 1) {
    const zone = state.zones[i];
    zone.life -= dt;
    zone.tickCd -= dt;
    if (zone.tickCd <= 0) {
      zone.tickCd = 0.4;
      eachNear(grid, zone.x, zone.z, zone.radius, (e) => hurtEnemy(state, e, zone.damage, events));
    }
  }
  state.zones = state.zones.filter((z) => z.life > 0);
};

// --- Player --------------------------------------------------------------------------------

const movePlayer = (
  state: RunState,
  input: Input,
  stats: Stats,
  dt: number,
  events: GameEvent[]
) => {
  const { player } = state;
  const len = Math.hypot(input.moveX, input.moveZ);
  player.moving = len > 0.05;
  if (player.moving) {
    player.dirX = input.moveX / len;
    player.dirZ = input.moveZ / len;
  }
  player.invuln = Math.max(0, player.invuln - dt);
  player.dashCd = Math.max(0, player.dashCd - dt);
  if (input.dash && player.dashCd <= 0) {
    player.dashCd = DASH_COOLDOWN;
    player.dashTime = DASH_SECONDS;
    events.push({ type: 'dash' });
  }
  let speed = player.moving ? stats.speed * Math.min(1, len) : 0;
  if (player.dashTime > 0) {
    player.dashTime -= dt;
    speed = DASH_SPEED;
  }
  player.x += player.dirX * speed * dt;
  player.z += player.dirZ * speed * dt;
  const dist = Math.hypot(player.x, player.z);
  if (dist > ARENA_RADIUS - 1) {
    player.x *= (ARENA_RADIUS - 1) / dist;
    player.z *= (ARENA_RADIUS - 1) / dist;
  }
  if (stats.regen > 0) player.hp = Math.min(player.maxHp, player.hp + stats.regen * dt);
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

const collectPickups = (state: RunState, stats: Stats, dt: number, events: GameEvent[]) => {
  const { player } = state;
  let taken = false;
  let magnet = false;
  for (let i = 0; i < state.pickups.length; i += 1) {
    const p = state.pickups[i];
    const dx = player.x - p.x;
    const dz = player.z - p.z;
    const dist = Math.hypot(dx, dz) || 0.01;
    if (dist < stats.pickup) p.pulled = true;
    if (p.pulled) {
      const step = Math.min(dist, 22 * dt);
      p.x += (dx / dist) * step;
      p.z += (dz / dist) * step;
    }
    if (dist < 0.9) {
      taken = true;
      events.push({ type: 'pickup', kind: p.kind, x: p.x, z: p.z });
      if (p.kind === 'xp') gainXp(state, p.value * stats.xp, events);
      else if (p.kind === 'gold') state.gold += p.value;
      else if (p.kind === 'heart') {
        player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.25);
      } else if (p.kind === 'magnet') magnet = true;
      else state.pendingChoices += 1;
      p.value = -1;
    }
  }
  if (taken) state.pickups = state.pickups.filter((p) => p.value >= 0);
  if (magnet) {
    state.pickups.forEach((p) => {
      if (p.kind === 'xp' || p.kind === 'gold') p.pulled = true;
    });
  }

  for (let i = 0; i < state.shrines.length; i += 1) {
    const shrine = state.shrines[i];
    if (!shrine.used) {
      const inside =
        (shrine.x - player.x) ** 2 + (shrine.z - player.z) ** 2 < SHRINE_RADIUS * SHRINE_RADIUS;
      shrine.charge = inside
        ? shrine.charge + dt / SHRINE_SECONDS
        : Math.max(0, shrine.charge - dt / SHRINE_SECONDS);
      if (shrine.charge >= 1) {
        shrine.used = true;
        state.pendingChoices += 1;
        events.push({ type: 'shrine', x: shrine.x, z: shrine.z });
      }
    }
  }
};

// Advances the run by one tick. The same state and the same inputs always give the same result.
export const step = (state: RunState, input: Input, dt: number): GameEvent[] => {
  const events: GameEvent[] = [];
  if (state.phase !== 'playing') return events;
  state.tick += 1;
  state.time += dt;
  const stats = runStats(state);

  movePlayer(state, input, stats, dt, events);
  spawnWave(state, dt, events);
  const grid = buildGrid(state.enemies);
  moveEnemies(state, grid, dt, events);
  runWeapons(state, stats, grid, dt, events);
  moveShots(state, grid, dt, events);
  reapEnemies(state, stats, events);
  collectPickups(state, stats, dt, events);
  openChoices(state);
  return events;
};
