import { CharacterId, Choice, MetaUpgradeId, PassiveId, WeaponId } from './engine/types';
import { tr } from '../../translation/tr';

type Label = { icon: string; name: string; text: string };

export const weaponLabel = (id: WeaponId): Label => {
  switch (id) {
    case 'missile':
      return {
        icon: '🚀',
        name: tr('games.horde.weapon.missile', 'Nuclear Missile'),
        text: tr(
          'games.horde.weapon.missile_text',
          'A small missile that blows up where it lands.'
        ),
      };
    case 'card':
      return {
        icon: '📘',
        name: tr('games.horde.weapon.card', 'Work Card'),
        text: tr('games.horde.weapon.card_text', 'Throws work cards at the closest enemies.'),
      };
    case 'aura':
      return {
        icon: '💧',
        name: tr('games.horde.weapon.aura', 'Fascist Tears'),
        text: tr('games.horde.weapon.aura_text', 'An aura that hurts whoever comes close to you.'),
      };
    case 'urns':
      return {
        icon: '🗳️',
        name: tr('games.horde.weapon.urns', 'Hacked Ballot Boxes'),
        text: tr(
          'games.horde.weapon.urns_text',
          'Ballot boxes circle you and hit whatever they touch.'
        ),
      };
    case 'nova':
      return {
        icon: '💥',
        name: tr('games.horde.weapon.nova', 'Shockwave'),
        text: tr('games.horde.weapon.nova_text', 'A blast around you that pushes enemies away.'),
      };
    case 'bolt':
      return {
        icon: '⚡',
        name: tr('games.horde.weapon.bolt', 'Lightning'),
        text: tr('games.horde.weapon.bolt_text', 'Strikes a nearby enemy and jumps to others.'),
      };
    case 'axe':
      return {
        icon: '🪓',
        name: tr('games.horde.weapon.axe', 'Spinning Axe'),
        text: tr(
          'games.horde.weapon.axe_text',
          'A big axe that goes through everything in its way.'
        ),
      };
    default:
      return {
        icon: '🌋',
        name: tr('games.horde.weapon.trail', 'Fire Trail'),
        text: tr('games.horde.weapon.trail_text', 'The ground burns where you walk.'),
      };
  }
};

export const passiveLabel = (id: PassiveId): Label => {
  switch (id) {
    case 'might':
      return {
        icon: '💪',
        name: tr('games.horde.passive.might', 'Fury'),
        text: tr('games.horde.passive.might_text', '+15% damage with every weapon.'),
      };
    case 'haste':
      return {
        icon: '⏱️',
        name: tr('games.horde.passive.haste', 'Haste'),
        text: tr('games.horde.passive.haste_text', 'Weapons attack 12% faster.'),
      };
    case 'reach':
      return {
        icon: '🎯',
        name: tr('games.horde.passive.reach', 'Reach'),
        text: tr(
          'games.horde.passive.reach_text',
          '+12% area for blasts, auras, ballot boxes and fire.'
        ),
      };
    case 'swift':
      return {
        icon: '👟',
        name: tr('games.horde.passive.swift', 'Light Boots'),
        text: tr('games.horde.passive.swift_text', '+8% movement speed.'),
      };
    case 'vigor':
      return {
        icon: '❤️',
        name: tr('games.horde.passive.vigor', 'Vigor'),
        text: tr('games.horde.passive.vigor_text', '+20 max health and health that comes back.'),
      };
    case 'magnet':
      return {
        icon: '🧲',
        name: tr('games.horde.passive.magnet', 'Magnet'),
        text: tr('games.horde.passive.magnet_text', 'Picks up gems from 35% further away.'),
      };
    default:
      return {
        icon: '✨',
        name: tr('games.horde.passive.multi', 'Echo'),
        text: tr(
          'games.horde.passive.multi_text',
          '+1 projectile, ballot box or lightning strike.'
        ),
      };
  }
};

export const choiceLabel = (choice: Choice): Label & { tag: string } => {
  if (choice.kind === 'heal') {
    return {
      icon: '🍖',
      name: tr('games.horde.choice.heal', 'Roast'),
      text: tr('games.horde.choice.heal_text', 'Heals 30% of your health.'),
      tag: '',
    };
  }
  if (choice.kind === 'gold') {
    return {
      icon: '💰',
      name: tr('games.horde.choice.gold', 'Bag of gold'),
      text: tr('games.horde.choice.gold_text', '+25 gold.'),
      tag: '',
    };
  }
  const label = choice.kind === 'weapon' ? weaponLabel(choice.id) : passiveLabel(choice.id);
  return {
    ...label,
    tag:
      choice.level === 1
        ? tr('games.horde.choice.new', 'New')
        : tr('games.horde.choice.level', 'Level {{level}}', { level: choice.level }),
  };
};

// Caricatures of real politicians: the texts only say how each one plays.
export const characterLabel = (id: CharacterId): Omit<Label, 'icon'> => {
  switch (id) {
    case 'lula':
      return {
        name: 'Lula',
        text: tr('games.horde.character.lula_text', 'Hits harder. Starts with the Work Card.'),
      };
    case 'janja':
      return {
        name: 'Janja',
        text: tr('games.horde.character.janja_text', 'Tough and slow. Starts with Fascist Tears.'),
      };
    case 'bolsonaro':
      return {
        name: 'Bolsonaro',
        text: tr(
          'games.horde.character.bolsonaro_text',
          'Fast and fragile. Starts with the Hacked Ballot Boxes.'
        ),
      };
    default:
      return {
        name: 'Enéas',
        text: tr(
          'games.horde.character.eneas_text',
          'Small and furious. Starts with the Nuclear Missile.'
        ),
      };
  }
};

export const metaLabel = (id: MetaUpgradeId): Label => {
  switch (id) {
    case 'vigor':
      return {
        icon: '❤️',
        name: tr('games.horde.meta.vigor', 'Thick skin'),
        text: tr('games.horde.meta.vigor_text', '+10 health per level'),
      };
    case 'might':
      return {
        icon: '💪',
        name: tr('games.horde.meta.might', 'Strong arm'),
        text: tr('games.horde.meta.might_text', '+5% damage per level'),
      };
    case 'swift':
      return {
        icon: '👟',
        name: tr('games.horde.meta.swift', 'Light feet'),
        text: tr('games.horde.meta.swift_text', '+3% speed per level'),
      };
    case 'wisdom':
      return {
        icon: '📘',
        name: tr('games.horde.meta.wisdom', 'Wisdom'),
        text: tr('games.horde.meta.wisdom_text', '+5% experience per level'),
      };
    case 'greed':
      return {
        icon: '💰',
        name: tr('games.horde.meta.greed', 'Greed'),
        text: tr('games.horde.meta.greed_text', '+10% gold per level'),
      };
    default:
      return {
        icon: '🎲',
        name: tr('games.horde.meta.reroll', 'Loaded dice'),
        text: tr('games.horde.meta.reroll_text', '+1 reroll of the upgrades per run'),
      };
  }
};

export const formatTime = (seconds: number): string => {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};
