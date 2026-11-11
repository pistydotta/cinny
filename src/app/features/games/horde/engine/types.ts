import { Rng } from './rng';

export type WeaponId = 'ember' | 'blades' | 'nova' | 'bolt' | 'axe' | 'trail';
export type PassiveId = 'might' | 'haste' | 'reach' | 'swift' | 'vigor' | 'magnet' | 'multi';
export type EnemyKind = 'husk' | 'runner' | 'brute' | 'spitter' | 'boss';
export type CharacterId = 'eneas' | 'lula' | 'janja' | 'bolsonaro';
export type MetaUpgradeId = 'vigor' | 'might' | 'swift' | 'wisdom' | 'greed' | 'reroll';

export type Enemy = {
  id: number;
  kind: EnemyKind;
  elite: boolean;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  damage: number;
  xp: number;
  // Seconds until it can shoot again (spitters and bosses).
  shootCd: number;
  // Seconds until the orbiting blades can hit it again.
  bladeCd: number;
  // Knockback still to play out, in units per second.
  pushX: number;
  pushZ: number;
  // Seconds left of the white flash after a hit. Only the renderer reads it.
  flash: number;
};

export type ShotKind = 'ember' | 'axe' | 'spit';

export type Shot = {
  id: number;
  kind: ShotKind;
  hostile: boolean;
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  damage: number;
  // How many more enemies it can go through. -1 never stops.
  pierce: number;
  life: number;
  hit: number[];
};

export type Zone = {
  id: number;
  x: number;
  z: number;
  radius: number;
  life: number;
  tickCd: number;
  damage: number;
};

export type PickupKind = 'xp' | 'gold' | 'heart' | 'magnet' | 'chest';

export type Pickup = {
  id: number;
  kind: PickupKind;
  x: number;
  z: number;
  value: number;
  pulled: boolean;
};

export type Shrine = {
  id: number;
  x: number;
  z: number;
  // 0 to 1: how long the player has stood in it.
  charge: number;
  used: boolean;
};

export type Choice =
  | { kind: 'weapon'; id: WeaponId; level: number }
  | { kind: 'passive'; id: PassiveId; level: number }
  | { kind: 'heal' }
  | { kind: 'gold' };

export type OwnedWeapon = {
  id: WeaponId;
  level: number;
  cooldown: number;
  // Blades only: where the orbit is.
  angle: number;
};

export type Player = {
  x: number;
  z: number;
  // Unit vector of the last direction moved.
  dirX: number;
  dirZ: number;
  moving: boolean;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  invuln: number;
  dashCd: number;
  dashTime: number;
};

export type Phase = 'playing' | 'choosing' | 'dead' | 'won';

export type MetaBonuses = Record<MetaUpgradeId, number>;

export type RunState = {
  seed: number;
  rng: Rng;
  character: CharacterId;
  meta: MetaBonuses;
  tick: number;
  time: number;
  phase: Phase;
  player: Player;
  weapons: OwnedWeapon[];
  passives: { id: PassiveId; level: number }[];
  enemies: Enemy[];
  shots: Shot[];
  zones: Zone[];
  pickups: Pickup[];
  shrines: Shrine[];
  choices: Choice[] | undefined;
  // Level-ups and chests still waiting for a choice.
  pendingChoices: number;
  rerolls: number;
  kills: number;
  gold: number;
  nextId: number;
  spawnBudget: number;
  nextEliteAt: number;
  bossesSpawned: number;
  bossAlive: boolean;
};

export type Input = {
  // Any length; the engine clamps it to 1.
  moveX: number;
  moveZ: number;
  dash: boolean;
};

// What happened in a step, for the renderer and sounds. Nothing in the engine reads them.
export type GameEvent =
  | { type: 'hit'; x: number; z: number; amount: number; crit: boolean }
  | { type: 'kill'; x: number; z: number; kind: EnemyKind; elite: boolean }
  | { type: 'hurt'; amount: number }
  | { type: 'nova'; x: number; z: number; radius: number }
  | { type: 'bolt'; points: { x: number; z: number }[] }
  | { type: 'pickup'; kind: PickupKind; x: number; z: number }
  | { type: 'levelup' }
  | { type: 'dash' }
  | { type: 'boss' }
  | { type: 'shrine'; x: number; z: number };
