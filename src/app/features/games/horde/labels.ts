import {
  CharacterId,
  Choice,
  EliteMod,
  GameEvent,
  MetaUpgradeId,
  PassiveId,
  ShrineKind,
  WeaponId,
} from './engine/types';
import { Action, Controls, fallbackKeyName } from './controls';
import { BOLETOS } from './engine/stats';
import { AchievementId } from './engine/achievements';
import { WEAPON_IDS } from './engine/data';
import { blessingLevels } from './engine/run';
import { boletoLabel, formatBonus } from './statLabels';
import { tr } from '../../translation/tr';

// `art` names the pixel-art icon (icons/pixelArt.ts); `icon` is its emoji, shown without one.
type Label = { icon: string; art?: string; name: string; text: string };

const weaponText = (id: WeaponId): Label => {
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
        text: tr(
          'games.horde.weapon.nova_text',
          'A blast around you that pushes enemies away. Enemies knocked into the wall get hurt.'
        ),
      };
    case 'bolt':
      return {
        icon: '⚡',
        name: tr('games.horde.weapon.bolt', 'Lightning'),
        text: tr(
          'games.horde.weapon.bolt_text',
          'Strikes a nearby enemy and jumps to others. Burning enemies take 50% more.'
        ),
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
        text: tr(
          'games.horde.weapon.trail_text',
          'The ground burns where you walk. Burning enemies take 50% more from lightning.'
        ),
      };
  }
};

export const weaponLabel = (id: WeaponId): Label => ({ ...weaponText(id), art: `weapon:${id}` });

// The run's passives are Boletos, each named after the stat it raises.
export const passiveLabel = (id: PassiveId): Label => boletoLabel(id);

// The evolved form of each weapon (max level plus its Boleto).
const evolutionText = (id: WeaponId): Label => {
  switch (id) {
    case 'missile':
      return {
        icon: '☢️',
        name: tr('games.horde.evolution.missile', 'Giant Bomb'),
        text: tr(
          'games.horde.evolution.missile_text',
          'One huge, slow bomb that blows up a whole area.'
        ),
      };
    case 'card':
      return {
        icon: '🪭',
        name: tr('games.horde.evolution.card', 'Card Fan'),
        text: tr(
          'games.horde.evolution.card_text',
          'A fan of seven cards that go through enemies.'
        ),
      };
    case 'aura':
      return {
        icon: '💧',
        name: tr('games.horde.evolution.aura', 'Healing Tears'),
        text: tr(
          'games.horde.evolution.aura_text',
          'Bigger and stronger, and heals you for every enemy inside.'
        ),
      };
    case 'urns':
      return {
        icon: '🗳️',
        name: tr('games.horde.evolution.urns', 'Ring of Ballot Boxes'),
        text: tr(
          'games.horde.evolution.urns_text',
          'A wider ring with more boxes, and each box shoots at the nearest enemy.'
        ),
      };
    case 'nova':
      return {
        icon: '🛡️',
        name: tr('games.horde.evolution.nova', 'Armored Wave'),
        text: tr(
          'games.horde.evolution.nova_text',
          'Bigger, stronger waves that fill half your shield each time.'
        ),
      };
    case 'bolt':
      return {
        icon: '⛈️',
        name: tr('games.horde.evolution.bolt', 'Storm'),
        text: tr('games.horde.evolution.bolt_text', 'Twice the strikes, and each one hits harder.'),
      };
    case 'axe':
      return {
        icon: '🪓',
        name: tr('games.horde.evolution.axe', 'Endless Axes'),
        text: tr('games.horde.evolution.axe_text', 'Two more axes that fly much longer.'),
      };
    default:
      return {
        icon: '🔥',
        name: tr('games.horde.evolution.trail', 'Blazing Trail'),
        text: tr('games.horde.evolution.trail_text', 'Wider, hotter fire that lasts longer.'),
      };
  }
};

export const evolutionLabel = (id: WeaponId): Label => ({
  ...evolutionText(id),
  art: `evolved:${id}`,
});

export const choiceLabel = (choice: Choice): Label & { tag: string } => {
  if (choice.kind === 'heal') {
    return {
      icon: '🍖',
      art: 'stat:maxHp',
      name: tr('games.horde.choice.heal', 'Roast'),
      text: tr('games.horde.choice.heal_text', 'Heals 30% of your health.'),
      tag: '',
    };
  }
  if (choice.kind === 'gold') {
    return {
      icon: '💰',
      art: 'stat:goldGain',
      name: tr('games.horde.choice.gold', 'Bag of gold'),
      text: tr('games.horde.choice.gold_text', '+25 gold.'),
      tag: '',
    };
  }
  if (choice.kind === 'blessing') {
    const label = passiveLabel(choice.id);
    const levels = blessingLevels(choice);
    let tag = tr('games.horde.choice.blessing', 'Blessing');
    if (choice.rarity === 'rare')
      tag = tr('games.horde.choice.blessing_rare', 'Rare blessing · +2');
    if (choice.rarity === 'epic')
      tag = tr('games.horde.choice.blessing_epic', 'Epic blessing · +3');
    return {
      ...label,
      text:
        levels > 1
          ? tr(
              'games.horde.choice.blessing_text_many',
              '{{levels}} levels of {{bonus}}. Takes no Boleto slot.',
              { levels, bonus: formatBonus(BOLETOS[choice.id]) }
            )
          : tr('games.horde.choice.blessing_text', '{{bonus}}. Takes no Boleto slot.', {
              bonus: formatBonus(BOLETOS[choice.id]),
            }),
      tag,
    };
  }
  if (choice.kind === 'evolve') {
    return { ...evolutionLabel(choice.id), tag: tr('games.horde.choice.evolve', 'Evolution') };
  }
  const label = choice.kind === 'weapon' ? weaponLabel(choice.id) : passiveLabel(choice.id);
  const level =
    choice.level === 1
      ? tr('games.horde.choice.new', 'New')
      : tr('games.horde.choice.level', 'Level {{level}}', { level: choice.level });
  let tag = level;
  if (choice.rarity === 'rare') tag = tr('games.horde.choice.rare', 'Rare · {{level}}', { level });
  if (choice.rarity === 'epic') tag = tr('games.horde.choice.epic', 'Epic · {{level}}', { level });
  return { ...label, tag };
};

// Each hero's ability, on Q.
const abilityText = (id: CharacterId): Label => {
  switch (id) {
    case 'lula':
      return {
        icon: '📘',
        name: tr('games.horde.ability.lula', 'Card Storm'),
        text: tr(
          'games.horde.ability.lula_text',
          'Cards fly in every direction, through the crowd. Every 35 s.'
        ),
      };
    case 'janja':
      return {
        icon: '💞',
        name: tr('games.horde.ability.janja', 'Healing Wave'),
        text: tr(
          'games.horde.ability.janja_text',
          'Heals 30%, fills the shield and throws close enemies away. Every 45 s.'
        ),
      };
    case 'bolsonaro':
      return {
        icon: '🏃',
        name: tr('games.horde.ability.bolsonaro', 'Sprint'),
        text: tr(
          'games.horde.ability.bolsonaro_text',
          'Runs 60% faster for 4 s, untouchable for the first 2. Every 40 s.'
        ),
      };
    default:
      return {
        icon: '💣',
        name: tr('games.horde.ability.eneas', 'Bomb Rain'),
        text: tr(
          'games.horde.ability.eneas_text',
          'Ten bombs fall on the nearest enemies. Every 40 s.'
        ),
      };
  }
};

export const abilityLabel = (id: CharacterId): Label => ({
  ...abilityText(id),
  art: `ability:${id}`,
});

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

const metaText = (id: MetaUpgradeId): Label => {
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
    case 'regen':
      return {
        icon: '💗',
        name: tr('games.horde.meta.regen', 'Good sleep'),
        text: tr('games.horde.meta.regen_text', '+6 health regen per minute per level'),
      };
    case 'armor':
      return {
        icon: '🦺',
        name: tr('games.horde.meta.armor', 'Bulletproof vest'),
        text: tr('games.horde.meta.armor_text', '+5 armor per level'),
      };
    case 'crit':
      return {
        icon: '🎯',
        name: tr('games.horde.meta.crit', 'Steady hand'),
        text: tr('games.horde.meta.crit_text', '+2% crit chance per level'),
      };
    case 'hunter':
      return {
        icon: '👑',
        name: tr('games.horde.meta.hunter', 'Boss hunter'),
        text: tr('games.horde.meta.hunter_text', '+6% damage to elites and bosses per level'),
      };
    case 'luck':
      return {
        icon: '🍀',
        name: tr('games.horde.meta.luck', 'Four-leaf clover'),
        text: tr('games.horde.meta.luck_text', '+5 luck per level'),
      };
    case 'banish':
      return {
        icon: '🚫',
        name: tr('games.horde.meta.banish', 'Veto'),
        text: tr(
          'games.horde.meta.banish_text',
          '+1 banish per run: an offer you never want to see again that run'
        ),
      };
    case 'skip':
      return {
        icon: '⏭️',
        name: tr('games.horde.meta.skip', 'Pass'),
        text: tr('games.horde.meta.skip_text', '+1 skip per run: pass on an offer for 10 gold'),
      };
    default:
      return {
        icon: '🎲',
        name: tr('games.horde.meta.reroll', 'Loaded dice'),
        text: tr('games.horde.meta.reroll_text', '+1 reroll of the upgrades per run'),
      };
  }
};

// The permanent upgrades share the drawing of the stat they raise.
const META_ART: Record<MetaUpgradeId, string> = {
  vigor: 'stat:maxHp',
  might: 'stat:damage',
  swift: 'stat:moveSpeed',
  wisdom: 'stat:xpGain',
  greed: 'stat:goldGain',
  reroll: 'upgrade:reroll',
  regen: 'stat:regen',
  armor: 'stat:armor',
  crit: 'stat:critChance',
  hunter: 'stat:eliteDamage',
  luck: 'stat:luck',
  banish: 'upgrade:banish',
  skip: 'upgrade:skip',
};

export const metaLabel = (id: MetaUpgradeId): Label => ({ ...metaText(id), art: META_ART[id] });

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
    case 'ability':
      return tr('games.horde.action.ability', 'Hero ability');
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

export const eliteModLabel = (mod: EliteMod): string => {
  switch (mod) {
    case 'fast':
      return tr('games.horde.elite.fast', 'Fast');
    case 'giant':
      return tr('games.horde.elite.giant', 'Giant');
    case 'regen':
      return tr('games.horde.elite.regen', 'Regenerates');
    default:
      return tr('games.horde.elite.burning', 'Burning');
  }
};

// What a shrine is, shown while the hero stands on it.
export const shrineLabel = (kind: ShrineKind): string => {
  switch (kind) {
    case 'curse':
      return tr(
        'games.horde.shrine.curse',
        'Cursed shrine: a tougher horde for a minute, then a chest'
      );
    case 'gold':
      return tr('games.horde.shrine.gold', 'Gold shrine: a shower of coins');
    case 'heal':
      return tr('games.horde.shrine.heal', 'Healing shrine: all your health back');
    case 'challenge':
      return tr(
        'games.horde.shrine.challenge',
        'Challenge shrine: kill enough in 30 seconds for a chest'
      );
    default:
      return tr('games.horde.shrine.blessing', 'Blessing shrine: a Boleto level with no slot');
  }
};

// The big words across the screen for moments of a run, and their color.
export const bannerOf = (event: GameEvent): { text: string; color: string } | undefined => {
  if (event.type === 'boss')
    return { text: tr('games.horde.boss_warning', 'THE BOSS IS HERE'), color: '#ff5a3a' };
  if (event.type === 'bossPhase') {
    return { text: tr('games.horde.boss_phase', 'THE BOSS IS FURIOUS'), color: '#ff3a2a' };
  }
  if (event.type === 'horde') {
    if (event.kind === 'ring') {
      return { text: tr('games.horde.event.ring', 'SURROUNDED!'), color: '#ffb03a' };
    }
    if (event.kind === 'stampede') {
      return {
        text: tr('games.horde.event.stampede', 'STAMPEDE! Get off the red lane'),
        color: '#ffb03a',
      };
    }
    return {
      text: tr('games.horde.event.rain', 'BLASTS FALLING! Watch the circles'),
      color: '#ffb03a',
    };
  }
  if (event.type === 'shrineDone') {
    if (event.kind === 'curse') {
      return {
        text: tr('games.horde.shrine_done.curse', 'Curse lifted: chest!'),
        color: '#d08aff',
      };
    }
    return event.ok
      ? {
          text: tr('games.horde.shrine_done.challenge', 'Challenge done: chest!'),
          color: '#7dff6a',
        }
      : { text: tr('games.horde.shrine_done.failed', 'Challenge failed'), color: '#aaaaaa' };
  }
  return undefined;
};

export const achievementLabel = (
  id: AchievementId,
  goal: number
): { name: string; text: string } => {
  switch (id) {
    case 'survive5':
      return {
        name: tr('games.horde.ach.survive5', 'Still standing'),
        text: tr('games.horde.ach.survive5_text', 'Survive 5 minutes in a run'),
      };
    case 'kills1000':
      return {
        name: tr('games.horde.ach.kills1000', 'Massacre'),
        text: tr('games.horde.ach.kills1000_text', 'Kill {{n}} in one run', { n: goal }),
      };
    case 'firstWin':
      return {
        name: tr('games.horde.ach.firstWin', 'Elected'),
        text: tr('games.horde.ach.firstWin_text', 'Win a run'),
      };
    case 'runs10':
      return {
        name: tr('games.horde.ach.runs10', 'Regular'),
        text: tr('games.horde.ach.runs10_text', 'Play {{n}} runs', { n: goal }),
      };
    case 'level25':
      return {
        name: tr('games.horde.ach.level25', 'Fast learner'),
        text: tr('games.horde.ach.level25_text', 'Reach level {{n}} in a run', { n: goal }),
      };
    case 'runs20':
      return {
        name: tr('games.horde.ach.runs20', 'Addicted'),
        text: tr('games.horde.ach.runs20_text', 'Play {{n}} runs', { n: goal }),
      };
    case 'total10000':
      return {
        name: tr('games.horde.ach.total10000', 'Ten thousand down'),
        text: tr('games.horde.ach.total10000_text', 'Kill {{n}} in all your runs', { n: goal }),
      };
    case 'winEneas':
      return {
        name: tr('games.horde.ach.winEneas', 'Enéas wins'),
        text: tr('games.horde.ach.winHero_text', 'Win with {{hero}}', { hero: 'Enéas' }),
      };
    case 'winLula':
      return {
        name: tr('games.horde.ach.winLula', 'Lula wins'),
        text: tr('games.horde.ach.winHero_text', 'Win with {{hero}}', { hero: 'Lula' }),
      };
    case 'winJanja':
      return {
        name: tr('games.horde.ach.winJanja', 'Janja wins'),
        text: tr('games.horde.ach.winHero_text', 'Win with {{hero}}', { hero: 'Janja' }),
      };
    case 'winBolsonaro':
      return {
        name: tr('games.horde.ach.winBolsonaro', 'Bolsonaro wins'),
        text: tr('games.horde.ach.winHero_text', 'Win with {{hero}}', { hero: 'Bolsonaro' }),
      };
    case 'tier3':
      return {
        name: tr('games.horde.ach.tier3', 'Hard mode'),
        text: tr('games.horde.ach.tier3_text', 'Win at tier {{n}}', { n: goal }),
      };
    default:
      return {
        name: tr('games.horde.ach.total50000', 'Legend'),
        text: tr('games.horde.ach.total50000_text', 'Kill {{n}} in all your runs', { n: goal }),
      };
  }
};

// The name of a weapon or Boleto from its key ("weapon:axe"), for what an achievement unlocks.
export const unlockName = (key: string): string => {
  const [kind, id] = key.split(':');
  return kind === 'weapon' ? weaponLabel(id as WeaponId).name : passiveLabel(id as PassiveId).name;
};

// A build item as the ranking keeps it ("missile6*"): its icon, level and whether it evolved.
export const buildItemLabel = (
  item: string
): { icon: string; art?: string; level: string; evolved: boolean } => {
  const match = /^([a-z]+)(\d+)(\*?)$/.exec(item);
  if (!match) return { icon: '❔', level: '', evolved: false };
  const [, id, level, star] = match;
  const isWeapon = WEAPON_IDS.includes(id as WeaponId);
  let label: Label | undefined;
  if (isWeapon) label = star ? evolutionLabel(id as WeaponId) : weaponLabel(id as WeaponId);
  else if (id in BOLETOS) label = passiveLabel(id as PassiveId);
  return { icon: label?.icon ?? '❔', art: label?.art, level, evolved: !!star };
};
