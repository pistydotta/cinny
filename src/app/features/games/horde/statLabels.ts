import {
  BOLETOS,
  Bonus,
  STATS,
  StatGroup,
  StatId,
  armorShare,
  evasionChance,
} from './engine/stats';
import { PassiveId } from './engine/types';
import { tr } from '../../translation/tr';

// Names, icons and explanations of the stats, and of the Boletos that raise them.

type StatText = { icon: string; art?: string; name: string; text: string };

const statWords = (id: StatId): StatText => {
  switch (id) {
    case 'maxHp':
      return {
        icon: '❤️',
        name: tr('games.horde.stat_name.maxHp', 'Max HP'),
        text: tr('games.horde.stat_text.maxHp', 'Most health you can have.'),
      };
    case 'regen':
      return {
        icon: '💗',
        name: tr('games.horde.stat_name.regen', 'HP Regen'),
        text: tr('games.horde.stat_text.regen', 'Health that comes back by itself, per minute.'),
      };
    case 'overheal':
      return {
        icon: '💖',
        name: tr('games.horde.stat_name.overheal', 'Overheal'),
        text: tr(
          'games.horde.stat_text.overheal',
          'How far healing can go over max HP. The extra goes first when you are hit and fades.'
        ),
      };
    case 'shield':
      return {
        icon: '🛡️',
        name: tr('games.horde.stat_name.shield', 'Shield'),
        text: tr(
          'games.horde.stat_text.shield',
          'A bar that takes hits before your health and fills again after 3 seconds without a hit.'
        ),
      };
    case 'armor':
      return {
        icon: '🦺',
        name: tr('games.horde.stat_name.armor', 'Armor'),
        text: tr(
          'games.horde.stat_text.armor',
          'Takes a share of every hit. Each point is worth less than the last; never over 75%.'
        ),
      };
    case 'evasion':
      return {
        icon: '💨',
        name: tr('games.horde.stat_name.evasion', 'Evasion'),
        text: tr(
          'games.horde.stat_text.evasion',
          'Chance to dodge a hit completely. Each point is worth less than the last; never over 60%.'
        ),
      };
    case 'lifesteal':
      return {
        icon: '🩸',
        name: tr('games.horde.stat_name.lifesteal', 'Lifesteal'),
        text: tr(
          'games.horde.stat_text.lifesteal',
          'Chance on each hit to heal 1 health, up to 8 a second.'
        ),
      };
    case 'thorns':
      return {
        icon: '🌵',
        name: tr('games.horde.stat_name.thorns', 'Thorns'),
        text: tr('games.horde.stat_text.thorns', 'Damage back to any enemy that touches you.'),
      };
    case 'damage':
      return {
        icon: '💪',
        name: tr('games.horde.stat_name.damage', 'Damage'),
        text: tr('games.horde.stat_text.damage', 'Multiplies the damage of every weapon.'),
      };
    case 'critChance':
      return {
        icon: '🎯',
        name: tr('games.horde.stat_name.critChance', 'Crit Chance'),
        text: tr('games.horde.stat_text.critChance', 'Chance of a hit being critical.'),
      };
    case 'critDamage':
      return {
        icon: '💥',
        name: tr('games.horde.stat_name.critDamage', 'Crit Damage'),
        text: tr('games.horde.stat_text.critDamage', 'How many times a critical hit multiplies.'),
      };
    case 'attackSpeed':
      return {
        icon: '⚡',
        name: tr('games.horde.stat_name.attackSpeed', 'Attack Speed'),
        text: tr('games.horde.stat_text.attackSpeed', 'Weapons fire this much more often.'),
      };
    case 'projectiles':
      return {
        icon: '✨',
        name: tr('games.horde.stat_name.projectiles', 'Projectiles'),
        text: tr(
          'games.horde.stat_text.projectiles',
          'Extra bombs, cards, axes, ballot boxes or lightning strikes each time.'
        ),
      };
    case 'ricochet':
      return {
        icon: '🔁',
        name: tr('games.horde.stat_name.ricochet', 'Ricochet'),
        text: tr(
          'games.horde.stat_text.ricochet',
          'Times a card or axe jumps to another enemy, and extra lightning jumps. Bombs do not bounce.'
        ),
      };
    case 'size':
      return {
        icon: '📏',
        name: tr('games.horde.stat_name.size', 'Size'),
        text: tr(
          'games.horde.stat_text.size',
          'Size of explosions, the aura, the ballot box orbit, fire and axes.'
        ),
      };
    case 'projectileSpeed':
      return {
        icon: '🏹',
        name: tr('games.horde.stat_name.projectileSpeed', 'Projectile Speed'),
        text: tr('games.horde.stat_text.projectileSpeed', 'How fast bombs, cards and axes fly.'),
      };
    case 'duration':
      return {
        icon: '⏳',
        name: tr('games.horde.stat_name.duration', 'Duration'),
        text: tr('games.horde.stat_text.duration', 'How long shots and fire on the ground last.'),
      };
    case 'eliteDamage':
      return {
        icon: '👑',
        name: tr('games.horde.stat_name.eliteDamage', 'Elite Damage'),
        text: tr(
          'games.horde.stat_text.eliteDamage',
          'Multiplies damage against elites and bosses.'
        ),
      };
    case 'knockback':
      return {
        icon: '🥊',
        name: tr('games.horde.stat_name.knockback', 'Knockback'),
        text: tr(
          'games.horde.stat_text.knockback',
          'How far weapons push enemies. Bosses do not move.'
        ),
      };
    case 'moveSpeed':
      return {
        icon: '👟',
        name: tr('games.horde.stat_name.moveSpeed', 'Movement Speed'),
        text: tr(
          'games.horde.stat_text.moveSpeed',
          'How fast you run. The bunny hop can reach up to 2.4 times it.'
        ),
      };
    case 'extraJumps':
      return {
        icon: '🦘',
        name: tr('games.horde.stat_name.extraJumps', 'Extra Jumps'),
        text: tr('games.horde.stat_text.extraJumps', 'Jumps you can make again in the air.'),
      };
    case 'jumpHeight':
      return {
        icon: '⬆️',
        name: tr('games.horde.stat_name.jumpHeight', 'Jump Height'),
        text: tr('games.horde.stat_text.jumpHeight', 'How hard you jump.'),
      };
    case 'luck':
      return {
        icon: '🍀',
        name: tr('games.horde.stat_name.luck', 'Luck'),
        text: tr(
          'games.horde.stat_text.luck',
          'Makes rare offers (two levels at once), chests with two upgrades and powerups likelier.'
        ),
      };
    case 'difficulty':
      return {
        icon: '☠️',
        name: tr('games.horde.stat_name.difficulty', 'Difficulty'),
        text: tr(
          'games.horde.stat_text.difficulty',
          'Tougher enemies and more of them, for the same share more experience and gold.'
        ),
      };
    case 'pickupRange':
      return {
        icon: '🧲',
        name: tr('games.horde.stat_name.pickupRange', 'Pickup Range'),
        text: tr(
          'games.horde.stat_text.pickupRange',
          'Distance from which gems and gold fly to you.'
        ),
      };
    case 'xpGain':
      return {
        icon: '📘',
        name: tr('games.horde.stat_name.xpGain', 'XP Gain'),
        text: tr('games.horde.stat_text.xpGain', 'Multiplies the experience of every gem.'),
      };
    case 'goldGain':
      return {
        icon: '💰',
        name: tr('games.horde.stat_name.goldGain', 'Gold Gain'),
        text: tr('games.horde.stat_text.goldGain', 'Multiplies the gold you find.'),
      };
    case 'eliteRate':
      return {
        icon: '🐗',
        name: tr('games.horde.stat_name.eliteRate', 'Elite Rate'),
        text: tr(
          'games.horde.stat_text.eliteRate',
          'Elites come more often. More danger, more chests.'
        ),
      };
    case 'powerupPower':
      return {
        icon: '🔋',
        name: tr('games.horde.stat_name.powerupPower', 'Powerup Power'),
        text: tr('games.horde.stat_text.powerupPower', 'Powerups last longer and hit harder.'),
      };
    default:
      return {
        icon: '🎁',
        name: tr('games.horde.stat_name.powerupChance', 'Powerup Chance'),
        text: tr(
          'games.horde.stat_text.powerupChance',
          'Enemies drop powerups more often: bomb, rage, freeze, star and gold rain.'
        ),
      };
  }
};

export const statText = (id: StatId): StatText => ({ ...statWords(id), art: `stat:${id}` });

export const groupName = (group: StatGroup): string => {
  switch (group) {
    case 'defense':
      return tr('games.horde.stat_group.defense', 'Defense');
    case 'attack':
      return tr('games.horde.stat_group.attack', 'Attack');
    case 'weapons':
      return tr('games.horde.stat_group.weapons', 'Weapons');
    case 'movement':
      return tr('games.horde.stat_group.movement', 'Movement and luck');
    default:
      return tr('games.horde.stat_group.economy', 'Economy');
  }
};

const round = (value: number, digits = 1): string => {
  const factor = 10 ** digits;
  return String(Math.round(value * factor) / factor);
};

// A stat's value as the stats screen shows it.
export const formatStat = (id: StatId, value: number): string => {
  const { unit } = STATS[id];
  if (unit === 'share') return `${round(value * 100)}%`;
  if (unit === 'multiplier') return `×${round(value, 2)}`;
  if (unit === 'perMinute') return `${round(value)}/min`;
  if (id === 'armor') return `${round(value)} (−${round(armorShare(value) * 100)}%)`;
  if (id === 'evasion') return `${round(value)} (${round(evasionChance(value) * 100)}%)`;
  return round(value);
};

// What one bonus gives, like "+15% Damage" or "+20 Max HP".
export const formatBonus = (bonus: Bonus): string => {
  const { unit } = STATS[bonus.stat];
  const { name } = statText(bonus.stat);
  if (bonus.pct) return `+${round(bonus.pct * 100)}% ${name}`;
  if (bonus.mult) return `+${round(bonus.mult * 100)}% ${name}`;
  const flat = bonus.flat ?? 0;
  if (unit === 'share') return `+${round(flat * 100)}% ${name}`;
  if (unit === 'multiplier') return `+${round(flat, 2)}× ${name}`;
  if (unit === 'perMinute') return `+${round(flat)}/min ${name}`;
  return `+${round(flat)} ${name}`;
};

// A Boleto is named after its stat: "Boleto de Dano".
export const boletoLabel = (id: PassiveId): StatText => {
  const def = BOLETOS[id];
  const stat = statText(def.stat);
  return {
    icon: stat.icon,
    art: stat.art,
    name: tr('games.horde.boleto_name', '{{stat}} Boleto', { stat: stat.name }),
    text: tr('games.horde.boleto_text', '{{bonus}} per level.', { bonus: formatBonus(def) }),
  };
};
