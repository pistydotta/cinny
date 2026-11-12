import { Rng } from './rng';

export type WeaponId = 'missile' | 'card' | 'aura' | 'urns' | 'nova' | 'bolt' | 'axe' | 'trail';
// The run's passives, called Boletos in the game; each raises one stat (`BOLETOS` in stats.ts).
export type PassiveId =
  | 'might'
  | 'haste'
  | 'reach'
  | 'swift'
  | 'vigor'
  | 'magnet'
  | 'multi'
  | 'regen'
  | 'overheal'
  | 'shield'
  | 'armor'
  | 'evasion'
  | 'lifesteal'
  | 'thorns'
  | 'crit'
  | 'critdmg'
  | 'ricochet'
  | 'velocity'
  | 'duration'
  | 'hunter'
  | 'knockback'
  | 'extrajump'
  | 'jump'
  | 'luck'
  | 'curse'
  | 'xp'
  | 'gold'
  | 'elites'
  | 'power'
  | 'fortune';
export type EnemyKind =
  | 'husk'
  | 'runner'
  | 'brute'
  | 'spitter'
  | 'boss'
  // Stops, marks a line on the ground, then charges along it.
  | 'charger'
  // Runs at the hero and blows up next to it (and when it dies), after a warning circle.
  | 'bomber'
  // Only area damage and hits from behind get through its shield.
  | 'shield'
  // Stays back and calls swarms.
  | 'summoner'
  // Tiny, fast and many.
  | 'swarm'
  // Things on the map, not enemies: weapons break them. Barrels blow up, pots drop gold.
  | 'barrel'
  | 'pot';

// What makes an elite different, shown over its head.
export type EliteMod = 'fast' | 'giant' | 'regen' | 'burning';

export type ShrineKind = 'blessing' | 'curse' | 'gold' | 'heal' | 'challenge';

export type HordeEventKind = 'ring' | 'stampede' | 'rain';

// Something an enemy is doing that takes a moment: aiming a charge, charging, a boss attack.
export type EnemyAct = {
  kind: 'aim' | 'charge' | 'stomp' | 'fan' | 'summon' | 'rain' | 'rush';
  // Seconds left of this part.
  t: number;
  // The direction it is set on.
  dx: number;
  dz: number;
};

// Danger on the ground, always shown before it hurts: a circle that blows up when its time runs
// out, burning ground, or the lane a stampede will run down.
export type Hazard = {
  id: number;
  kind: 'blast' | 'fire' | 'lane';
  x: number;
  z: number;
  // Lanes run from (x, z) to (x2, z2).
  x2?: number;
  z2?: number;
  radius: number;
  // Seconds until a blast goes off, and how long its warning was in all.
  delay: number;
  total: number;
  // Seconds a fire or lane lasts.
  life: number;
  damage: number;
  tickCd: number;
  fromBoss?: boolean;
};
export type CharacterId = 'eneas' | 'lula' | 'janja' | 'bolsonaro';
export type MetaUpgradeId =
  | 'vigor'
  | 'might'
  | 'swift'
  | 'wisdom'
  | 'greed'
  | 'reroll'
  | 'regen'
  | 'armor'
  | 'crit'
  | 'hunter'
  | 'luck'
  | 'banish'
  | 'skip';

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
  // Seconds until the orbiting ballot boxes can hit it again.
  urnCd: number;
  // Seconds until the hero's thorns can hurt it again.
  touchCd?: number;
  // Seconds left burning from the fire trail; lightning hits burning enemies harder.
  burn?: number;
  act?: EnemyAct;
  // Seconds until it can start its next act.
  actCd?: number;
  mod?: EliteMod;
  // A boss under half health fights harder.
  phase2?: boolean;
  // Barrels and pots: not enemies, no kill, no experience, weapons don't aim at them.
  prop?: boolean;
  // Knockback still to play out, in units per second.
  pushX: number;
  pushZ: number;
  // Seconds left of the white flash after a hit. Only the renderer reads it.
  flash: number;
};

export type ShotKind = 'card' | 'missile' | 'axe' | 'spit';

export type Shot = {
  id: number;
  kind: ShotKind;
  hostile: boolean;
  // Shot by a boss: it pierces part of the hero's defense.
  fromBoss?: boolean;
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  damage: number;
  // How many more enemies it can go through. -1 never stops.
  pierce: number;
  life: number;
  // Missiles: the radius of the explosion where it lands. 0 for everything else.
  blast: number;
  // How many more times it jumps to another enemy instead of stopping.
  bounces?: number;
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

// Powerups are the kinds after `chest`: picked up, they act at once or for a while.
export type PickupKind =
  | 'xp'
  | 'gold'
  | 'heart'
  | 'magnet'
  | 'chest'
  | 'bomb'
  | 'rage'
  | 'freeze'
  | 'star'
  | 'goldrain';

export type BuffId = 'rage' | 'freeze' | 'star' | 'sprint';

// Rare offers give two levels at once, epic ones three. Luck makes them likelier.
export type Rarity = 'rare' | 'epic';

export type Pickup = {
  id: number;
  kind: PickupKind;
  x: number;
  z: number;
  value: number;
  pulled: boolean;
  // Speed while flying to the hero: it speeds up on the way, so gems shoot in at the end.
  pull?: number;
};

export type Shrine = {
  id: number;
  x: number;
  z: number;
  // 0 to 1: how long the player has stood in it.
  charge: number;
  used: boolean;
  kind?: ShrineKind;
};

// The map's raised blocks (engine/terrain.ts): a mesa is a rounded box with a flat top `h` high,
// `w` and `d` its half sizes and `r` its corner radius; a ramp climbs from (x1, z1) at h1 to
// (x2, z2) at h2.
// `kind`: a big mesa, the smaller one on top of it, the step that leads up to that, a ledge low
// enough to jump onto, or a pillar.
export type MesaKind = 'mesa' | 'top' | 'step' | 'ledge' | 'pillar';
export type Mesa = {
  kind: MesaKind;
  x: number;
  z: number;
  w: number;
  d: number;
  r: number;
  h: number;
};
export type Ramp = {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  width: number;
  h1: number;
  h2: number;
};
export type GameMap = { half: number; mesas: Mesa[]; ramps: Ramp[] };

// A chest standing on the map: standing on it opens it for gold, more for each one bought.
export type MapChest = { id: number; x: number; z: number; charge: number; opened: boolean };

export type Choice =
  | { kind: 'weapon'; id: WeaponId; level: number; rarity?: Rarity }
  | { kind: 'passive'; id: PassiveId; level: number; rarity?: Rarity }
  // A weapon at max level with its Boleto in the build turns into its evolved form.
  | { kind: 'evolve'; id: WeaponId }
  // A level of a Boleto that takes no slot, from a shrine (two or three when rare or epic).
  | { kind: 'blessing'; id: PassiveId; rarity?: Rarity }
  | { kind: 'heal' }
  | { kind: 'gold' };

export type OwnedWeapon = {
  id: WeaponId;
  level: number;
  cooldown: number;
  // Ballot boxes only: where the orbit is.
  angle: number;
  // Turned into its evolved form (max level plus its Boleto).
  evolved?: boolean;
};

export type Player = {
  x: number;
  // Height of the feet. On the ground it is the terrain's height there.
  y: number;
  z: number;
  // Velocity in units per second.
  vx: number;
  vy: number;
  vz: number;
  grounded: boolean;
  // Seconds since landing, for the friction-free window of the bunny hop.
  groundTime: number;
  // Seconds left of a jump pressed in the air, and of jumping after leaving the ground.
  jumpBuffer: number;
  coyote: number;
  // Jumps made since leaving the ground, for extra jumps.
  airJumps: number;
  // Unit vector of the last direction moved.
  dirX: number;
  dirZ: number;
  moving: boolean;
  hp: number;
  maxHp: number;
  // Health over the maximum from overheal. Goes first and fades.
  overHp: number;
  // The shield bar, and seconds without a hit before it fills again.
  shield: number;
  shieldWait: number;
  level: number;
  xp: number;
  invuln: number;
  dashCd: number;
  dashTime: number;
  // Seconds until the hero's ability (Q) can be used again.
  abilityCd: number;
  // The horizontal speed when the dash started, given back when it ends.
  dashKeep: number;
};

export type Phase = 'playing' | 'choosing' | 'chest' | 'dead' | 'won';

export type MetaBonuses = Record<MetaUpgradeId, number>;

// A run's recorded commands: tick gap, kind, value, flat; and where the recording stands.
export type ReplayLog = { log: number[]; lastTick: number; lastInput: number };

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
  // Boleto levels from shrines, outside the four slots.
  blessings: Partial<Record<PassiveId, number>>;
  // Seconds left of each powerup that lasts.
  buffs: Record<BuffId, number>;
  // Health lifesteal may still give this second, so area weapons can't make the hero immortal.
  stealBudget: number;
  // Damage dealt by each weapon in this run, for the result screen and balance.
  damageBy: Partial<Record<WeaponId, number>>;
  enemies: Enemy[];
  shots: Shot[];
  zones: Zone[];
  pickups: Pickup[];
  shrines: Shrine[];
  map: GameMap;
  chests: MapChest[];
  // Map chests bought so far: each costs more than the last.
  chestsBought: number;
  choices: Choice[] | undefined;
  // Level-ups and chests still waiting for a choice.
  pendingChoices: number;
  // Shrines still waiting for a blessing to be picked.
  pendingBlessings: number;
  rerolls: number;
  // Offers that can still be banished (gone for the run) or skipped (for a little gold).
  banishes: number;
  skips: number;
  // What was banished, as "weapon:card" or "passive:might".
  banned: string[];
  // What an open chest gave, shown while the phase is 'chest'.
  chest?: Choice[];
  kills: number;
  gold: number;
  nextId: number;
  spawnBudget: number;
  nextEliteAt: number;
  bossesSpawned: number;
  bossAlive: boolean;
  // The horde thins out until this time, so a boss's arrival gets the stage.
  calmUntil?: number;
  hazards: Hazard[];
  // The next of HORDE_EVENTS still to happen.
  nextHordeEvent: number;
  // A cursed shrine: tougher horde until then, and a chest when it ends.
  curseUntil?: number;
  // A challenge shrine: kill `need` more enemies before `until`.
  challenge?: { until: number; need: number; from: number };
  // Difficulty tier picked before the run (unlocked by winning).
  tier: number;
  // Content this player hasn't unlocked yet ("weapon:axe"), never offered.
  locked: string[];
  // The hero's mastery level: a little damage and health.
  mastery: number;
  // The daily challenge's day, when this run is one.
  daily?: string;
  // Picked up again after the page was closed: it pays, but stays out of the rankings.
  resumed?: boolean;
  // The commands of the run so far, when they are being recorded (engine/replay.ts).
  replay?: ReplayLog;
  nextPotsAt: number;
};

export type Input = {
  // The direction to move in the world, already turned by the camera. Any length; the engine
  // clamps it to 1.
  moveX: number;
  moveZ: number;
  // True on the tick the jump key went down. Holding it never jumps again.
  jump: boolean;
  // Whether the jump key is still held: letting go early makes a lower jump.
  jumpHeld: boolean;
  dash: boolean;
  // True on the tick the ability key went down.
  ability?: boolean;
};

// What happened in a step, for the renderer and sounds. Nothing in the engine reads them.
export type GameEvent =
  | { type: 'hit'; id: number; x: number; z: number; amount: number; crit: boolean }
  | { type: 'kill'; x: number; z: number; kind: EnemyKind; elite: boolean }
  | { type: 'hurt'; amount: number }
  | { type: 'evade' }
  | { type: 'shieldBreak' }
  | { type: 'powerup'; kind: PickupKind }
  | { type: 'ability'; hero: CharacterId }
  | { type: 'explode'; x: number; z: number; radius: number }
  | { type: 'horde'; kind: HordeEventKind }
  | { type: 'bossPhase' }
  | { type: 'shrineDone'; kind: ShrineKind; ok: boolean }
  | { type: 'chest'; count: number }
  | { type: 'evolve'; id: WeaponId }
  | { type: 'nova'; x: number; z: number; radius: number }
  | { type: 'blast'; x: number; z: number; radius: number }
  | { type: 'bolt'; points: { x: number; z: number }[] }
  | { type: 'pickup'; kind: PickupKind; x: number; z: number }
  | { type: 'levelup' }
  | { type: 'dash' }
  | { type: 'jump'; air: boolean }
  | { type: 'land'; speed: number }
  | { type: 'boss' }
  | { type: 'shrine'; x: number; z: number }
  // A map chest bought for `price` gold.
  | { type: 'chestBuy'; x: number; z: number; price: number };
