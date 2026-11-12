import { Stats } from './stats';
import { OwnedWeapon, PassiveId, WeaponId } from './types';

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

// Each weapon at max level evolves with one Boleto in the build: a new form, much stronger and
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

export const urnCount = (weapon: OwnedWeapon, stats: Stats): number =>
  2 + Math.floor(weapon.level / 2) + stats.projectiles + (weapon.evolved ? 2 : 0);

export const urnOrbit = (stats: Stats, weapon?: OwnedWeapon): number =>
  3.2 * stats.size * (weapon?.evolved ? 1.6 : 1);

export const auraRadius = (weapon: OwnedWeapon, stats: Stats): number =>
  (2.8 + 0.3 * weapon.level) * stats.size * (weapon.evolved ? 1.25 : 1);

export const novaRadius = (weapon: OwnedWeapon, stats: Stats): number =>
  (4.6 + 0.6 * weapon.level) * stats.size * (weapon.evolved ? 1.3 : 1);

export const weaponSpec = (weapon: OwnedWeapon, stats: Stats): WeaponSpec => {
  const lv = weapon.level;
  const evo = !!weapon.evolved;
  const cd = cooldownOf(stats);
  const dmg = stats.damage;
  switch (weapon.id) {
    case 'missile':
      // Evolved: one huge, slow bomb.
      return {
        damage: (16 + 5 * lv) * dmg * (evo ? 4 : 1),
        cooldown: (evo ? 2.2 : 1.7 - lv * 0.07) * cd,
        count: evo
          ? 1 + Math.floor(stats.projectiles / 2)
          : 1 + Math.floor(lv / 3) + stats.projectiles,
        area: (2 + 0.25 * lv) * stats.size * (evo ? 2.5 : 1),
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
        damage: (6 + 3.5 * lv) * dmg,
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
        area: 1.1 * stats.size,
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
        area: 1.7 * stats.size * (evo ? 1.5 : 1),
        pierce: -1,
        life: (2.4 + 0.3 * lv) * stats.duration * (evo ? 1.3 : 1),
        speed: 0,
      };
  }
};
