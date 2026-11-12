import { CharacterId, Choice, MetaUpgradeId, PassiveId, WeaponId } from './engine/types';
import { Action, Controls, fallbackKeyName } from './controls';
import { tr } from '../../translation/tr';

type Label = { icon: string; name: string; text: string };

export const weaponLabel = (id: WeaponId): Label => {
  switch (id) {
    case 'missile':
      return {
        icon: '💣',
        name: tr('games.horde.weapon.missile', 'Atomic Bomb'),
        text: tr(
          'games.horde.weapon.missile_text',
          'A small bomb that falls on the nearest enemy and blows up where it lands.'
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
          'Small and furious. Starts with the Atomic Bomb.'
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

export const actionLabel = (action: Action): string => {
  switch (action) {
    case 'forward':
      return tr('games.horde.action.forward', 'Forward');
    case 'back':
      return tr('games.horde.action.back', 'Back');
    case 'left':
      return tr('games.horde.action.left', 'Left');
    case 'right':
      return tr('games.horde.action.right', 'Right');
    case 'jump':
      return tr('games.horde.action.jump', 'Jump');
    case 'dash':
      return tr('games.horde.action.dash', 'Dodge');
    case 'pause':
      return tr('games.horde.action.pause', 'Pause');
    case 'pick1':
      return tr('games.horde.action.pick', 'Pick upgrade {{n}}', { n: 1 });
    case 'pick2':
      return tr('games.horde.action.pick', 'Pick upgrade {{n}}', { n: 2 });
    case 'pick3':
      return tr('games.horde.action.pick', 'Pick upgrade {{n}}', { n: 3 });
    default:
      return tr('games.horde.action.reroll', 'Reroll the upgrades');
  }
};

// How a key is printed. `layout` is the browser's map of this keyboard's labels, when it has one.
export const keyLabel = (code: string, layout?: Map<string, string>): string => {
  if (!code) return '—';
  const mouse = /^Mouse(\d)$/.exec(code);
  if (mouse) {
    const names = [
      tr('games.horde.key.mouse_left', 'Left click'),
      tr('games.horde.key.mouse_middle', 'Middle click'),
      tr('games.horde.key.mouse_right', 'Right click'),
    ];
    return (
      names[Number(mouse[1])] ??
      tr('games.horde.key.mouse', 'Mouse {{n}}', { n: Number(mouse[1]) + 1 })
    );
  }
  if (code === 'Space') return tr('games.horde.key.space', 'Space');
  if (code === 'Escape') return 'Esc';
  const printed = layout?.get(code);
  if (printed && printed.trim()) return printed.toUpperCase();
  return fallbackKeyName(code);
};

// "W A S D" style text for the help lines, from the keys in use.
export const keysOf = (controls: Controls, action: Action, layout?: Map<string, string>): string =>
  [
    ...new Set(controls.keys[action].filter((code) => code).map((code) => keyLabel(code, layout))),
  ].join(' / ') || '—';
