import { EVOLVE_LEVEL } from './data';
import { Stats } from './stats';
import { OwnedWeapon, PassiveId, Rarity, WeaponBonus, WeaponId, WeaponStat } from './types';

// The numbers of each weapon at its level, with the hero's stats applied. The engine fires from
// these and the build screen shows them, so what the screen says is what the weapon does.

export type WeaponSpec = {
  // Damage of one hit.
  damage: number;
  // Seconds between attacks; 0 for weapons that act all the time (the orbiting ballot boxes).
  cooldown: number;
  // Projectiles, strikes or boxes each time.
  count: number;
  // The size that matters for this weapon: blast, aura, wave, fire, axe or orbit radius.
  area: number;
  // Enemies a shot goes through (-1 is all of them); chain jumps for lightning.
  pierce: number;
  // Seconds a shot or a patch of fire lasts.
  life: number;
  // Speed of the shots.
  speed: number;
};

// What each weapon's level-ups can raise. Two different ones are drawn for every level after the
// first; weapons that fire once (the aura, the wave, the trail) have no projectiles to add.
export const WEAPON_ROLLS: Record<WeaponId, WeaponStat[]> = {
  missile: ['damage', 'critChance', 'critDamage', 'projectiles', 'attackSpeed', 'size'],
  card: ['damage', 'critChance', 'critDamage', 'projectiles', 'attackSpeed', 'pierce'],
  aura: ['damage', 'critChance', 'critDamage', 'attackSpeed', 'size'],
  urns: ['damage', 'critChance', 'critDamage', 'projectiles', 'attackSpeed', 'size'],
  nova: ['damage', 'critChance', 'critDamage', 'attackSpeed', 'size'],
  bolt: ['damage', 'critChance', 'critDamage', 'projectiles', 'attackSpeed', 'pierce'],
  axe: ['damage', 'critChance', 'critDamage', 'projectiles', 'attackSpeed', 'size', 'duration'],
  trail: ['damage', 'critChance', 'critDamage', 'attackSpeed', 'size', 'duration'],
};

// How much one roll gives, before rarity. Projectiles and pierce are whole numbers.
export const ROLL_VALUES: Record<WeaponStat, number> = {
  damage: 0.12,
  critChance: 0.04,
  critDamage: 0.15,
  projectiles: 1,
  attackSpeed: 0.08,
  size: 0.12,
  duration: 0.1,
  pierce: 1,
};

// A rare level gives half again as much, an epic one twice (whole stats: one more on epic).
export const rollValue = (stat: WeaponStat, rarity?: Rarity): number => {
  const base = ROLL_VALUES[stat];
  if (stat === 'projectiles' || stat === 'pierce') return base + (rarity === 'epic' ? 1 : 0);
  if (rarity === 'epic') return base * 2;
  return rarity === 'rare' ? base * 1.5 : base;
};

export const weaponBonus = (weapon: OwnedWeapon, stat: WeaponStat): number =>
  weapon.bonus?.[stat] ?? 0;

export const addBonuses = (weapon: OwnedWeapon, bonuses: WeaponBonus[]) => {
  const bonus = { ...weapon.bonus };
  bonuses.forEach((b) => {
    bonus[b.stat] = (bonus[b.stat] ?? 0) + b.value;
  });
  // eslint-disable-next-line no-param-reassign
  weapon.bonus = bonus;
};

// Shots in one volley at most, so a long run stays playable.
const MAX_VOLLEY = 40;
export const MAX_URNS = 24;

// Each weapon at EVOLVE_LEVEL evolves with one Boleto in the build: a new form, much stronger and
// different to look at.
export const EVOLUTIONS: Record<WeaponId, PassiveId> = {
  missile: 'reach',
  card: 'multi',
  aura: 'vigor',
  urns: 'haste',
  nova: 'shield',
  bolt: 'crit',
  axe: 'duration',
  trail: 'swift',
};

export const cooldownOf = (stats: Stats): number => 1 / (1 + stats.attackSpeed);

// The level that sets a weapon's own numbers; levels past it only add their rolls.
const baseLevel = (weapon: OwnedWeapon): number => Math.min(weapon.level, EVOLVE_LEVEL);

const sizeOf = (weapon: OwnedWeapon, stats: Stats): number =>
  stats.size * (1 + weaponBonus(weapon, 'size'));

export const urnCount = (weapon: OwnedWeapon, stats: Stats): number =>
  Math.min(
    MAX_URNS,
    2 +
      Math.floor(baseLevel(weapon) / 2) +
      stats.projectiles +
      weaponBonus(weapon, 'projectiles') +
      (weapon.evolved ? 2 : 0)
  );

export const urnOrbit = (stats: Stats, weapon?: OwnedWeapon): number =>
  3.2 * (weapon ? sizeOf(weapon, stats) : stats.size) * (weapon?.evolved ? 1.6 : 1);

export const auraRadius = (weapon: OwnedWeapon, stats: Stats): number =>
  (2.8 + 0.3 * baseLevel(weapon)) * sizeOf(weapon, stats) * (weapon.evolved ? 1.25 : 1);

export const novaRadius = (weapon: OwnedWeapon, stats: Stats): number =>
  (4.6 + 0.6 * baseLevel(weapon)) * sizeOf(weapon, stats) * (weapon.evolved ? 1.3 : 1);

// The weapon's own numbers at its base level, with the hero's stats. Sizes already count the
// weapon's size rolls (they set the radius helpers above); the rest is added in `weaponSpec`.
const baseSpec = (weapon: OwnedWeapon, stats: Stats): WeaponSpec => {
  const lv = baseLevel(weapon);
  const evo = !!weapon.evolved;
  const cd = cooldownOf(stats);
  const dmg = stats.damage;
  const size = sizeOf(weapon, stats);
  switch (weapon.id) {
    case 'missile':
      // Evolved: one huge, slow bomb.
      return {
        damage: (16 + 5 * lv) * dmg * (evo ? 4 : 1),
        cooldown: (evo ? 2.2 : 1.7 - lv * 0.07) * cd,
        count: evo
          ? 1 + Math.floor(stats.projectiles / 2)
          : 1 + Math.floor(lv / 3) + stats.projectiles,
        area: (2 + 0.25 * lv) * size * (evo ? 2.5 : 1),
        pierce: 0,
        life: 1.5 * stats.duration * (evo ? 1.6 : 1),
        speed: (evo ? 10 : 16) * stats.projectileSpeed,
      };
    case 'card':
      // Evolved: a fan of cards.
      return {
        damage: (15 + 5 * lv) * dmg,
        cooldown: (evo ? 0.9 : 0.78) * cd,
        count: (evo ? 7 : 1 + Math.floor(lv / 3)) + stats.projectiles,
        area: 0.4,
        pierce: Math.floor(lv / 3) + (evo ? 1 : 0),
        life: 1.2 * stats.duration,
        speed: 24 * stats.projectileSpeed,
      };
    case 'aura':
      return {
        damage: (4 + 3 * lv) * dmg * (evo ? 1.3 : 1),
        cooldown: 0.5 * cd,
        count: 1,
        area: auraRadius(weapon, stats),
        pierce: -1,
        life: 0,
        speed: 0,
      };
    case 'urns':
      return {
        damage: (8 + 4.5 * lv) * dmg,
        cooldown: evo ? 1 * cd : 0,
        count: urnCount(weapon, stats),
        area: urnOrbit(stats, weapon),
        pierce: -1,
        life: evo ? 1 * stats.duration : 0,
        speed: evo ? 20 * stats.projectileSpeed : 2.8 / cd,
      };
    case 'nova':
      return {
        damage: (12 + 7 * lv) * dmg * (evo ? 1.3 : 1),
        cooldown: (3.2 - lv * 0.15) * cd,
        count: 1,
        area: novaRadius(weapon, stats),
        pierce: -1,
        life: 0,
        speed: 0,
      };
    case 'bolt':
      // Evolved: twice the strikes, harder.
      return {
        damage: (16 + 9 * lv) * dmg * (evo ? 1.6 : 1),
        cooldown: (1.4 - lv * 0.08) * cd,
        count: (1 + stats.projectiles) * (evo ? 2 : 1),
        area: 15,
        pierce: 2 + Math.floor(lv / 2) + stats.ricochet,
        life: 0,
        speed: 0,
      };
    case 'axe':
      return {
        damage: (14 + 6 * lv) * dmg * (evo ? 1.3 : 1),
        cooldown: (1.5 - lv * 0.06) * cd,
        count: 1 + (lv >= 3 ? 1 : 0) + (lv >= 6 ? 1 : 0) + stats.projectiles + (evo ? 2 : 0),
        area: 1.1 * size,
        pierce: -1,
        life: 1.1 * stats.duration * (evo ? 1.6 : 1),
        speed: 17 * stats.projectileSpeed,
      };
    default:
      // The fire trail.
      return {
        damage: (1 + 2.2 * lv) * dmg * (evo ? 1.5 : 1),
        cooldown: 0.45 * cd,
        count: 1,
        area: 1.7 * size * (evo ? 1.5 : 1),
        pierce: -1,
        life: (2.4 + 0.3 * lv) * stats.duration * (evo ? 1.3 : 1),
        speed: 0,
      };
  }
};

export const weaponSpec = (weapon: OwnedWeapon, stats: Stats): WeaponSpec => {
  const spec = baseSpec(weapon, stats);
  const more = weaponBonus(weapon, 'projectiles');
  const fires = weapon.id === 'missile' || weapon.id === 'card' || weapon.id === 'axe';
  return {
    ...spec,
    damage: spec.damage * (1 + weaponBonus(weapon, 'damage')),
    cooldown: spec.cooldown / (1 + weaponBonus(weapon, 'attackSpeed')),
    count: fires || weapon.id === 'bolt' ? Math.min(MAX_VOLLEY, spec.count + more) : spec.count,
    pierce: spec.pierce < 0 ? spec.pierce : spec.pierce + weaponBonus(weapon, 'pierce'),
    life: spec.life * (1 + weaponBonus(weapon, 'duration')),
    // The ballot boxes spin faster with attack speed.
    speed:
      weapon.id === 'urns' && !weapon.evolved
        ? spec.speed * (1 + weaponBonus(weapon, 'attackSpeed'))
        : spec.speed,
  };
};
