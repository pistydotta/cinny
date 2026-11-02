import { tr } from '../../translation/tr';
import {
  Attribute,
  ClassId,
  Element,
  ModKey,
  Rarity,
  Role,
  SkillEffect,
  Slot,
  UpgradeId,
} from './engine/types';
import { isPercent } from './format';

// Every name the game shows. The engine only has ids; the words live here, in English, with
// the Portuguese in pt.json under games.idle.

const CLASS_EN: Record<ClassId, [string, string]> = {
  guardian: ['Guardian', 'A wall of steel. Shields up, outlasts anything.'],
  berserker: ['Berserker', 'Fights angrier the longer it lasts, and heals by hitting.'],
  paladin: ['Paladin', 'Holy warrior who heals mid-fight and hits back hard.'],
  ranger: ['Ranger', 'Quick arrows, many crits, a volley when it counts.'],
  assassin: ['Assassin', 'Stuns, then strikes from the shadows for huge crits.'],
  mage: ['Arcanist', 'Slow on foot, devastating with a meteor.'],
  necromancer: ['Necromancer', 'Drains life from foes and lets a curse finish them.'],
  druid: ['Druid', 'Nature heals and empowers, for a long steady fight.'],
  shaman: ['Shaman', 'Calls lightning that chains and stuns.'],
  monk: ['Monk', 'Fastest fists around, hard to hit.'],
};
export const className = (id: ClassId) => tr(`games.idle.class.${id}.name`, CLASS_EN[id][0]);
export const classDesc = (id: ClassId) => tr(`games.idle.class.${id}.desc`, CLASS_EN[id][1]);

const ROLE_EN: Record<Role, string> = {
  tank: 'Tank',
  melee: 'Melee',
  ranged: 'Ranged',
  caster: 'Caster',
  support: 'Support',
};
export const roleName = (r: Role) => tr(`games.idle.role.${r}`, ROLE_EN[r]);

const SKILL_EN: Record<string, string> = {
  shield_wall: 'Shield Wall',
  blood_rage: 'Blood Rage',
  holy_light: 'Holy Light',
  volley: 'Volley',
  shadowstep: 'Shadowstep',
  meteor: 'Meteor',
  soul_drain: 'Soul Drain',
  wild_growth: 'Wild Growth',
  chain_lightning: 'Chain Lightning',
  hundred_fists: 'Hundred Fists',
  root_slam: 'Root Slam',
  eruption: 'Eruption',
  venom: 'Venom',
  frost_breath: 'Frost Breath',
  hellfire: 'Hellfire',
};
export const skillName = (id: string) => tr(`games.idle.skill.${id}`, SKILL_EN[id] ?? id);

const ATTR_EN: Record<Attribute, string> = {
  str: 'Strength',
  agi: 'Agility',
  int: 'Intellect',
  vit: 'Vitality',
};
export const attrName = (a: Attribute) => tr(`games.idle.attr.${a}`, ATTR_EN[a]);

const STAT_EN: Record<ModKey, string> = {
  ...ATTR_EN,
  maxHp: 'Life',
  damage: 'Damage',
  attackSpeed: 'Attack speed',
  critChance: 'Critical chance',
  critDamage: 'Critical damage',
  armor: 'Armor',
  dodge: 'Dodge',
  lifesteal: 'Life steal',
  regen: 'Life per second',
  skillPower: 'Skill power',
  cooldownReduction: 'Cooldown reduction',
  damagePct: 'Damage',
  maxHpPct: 'Life',
  attackSpeedPct: 'Attack speed',
  goldFind: 'Gold found',
  xpGain: 'Experience',
};
export const statName = (k: ModKey) =>
  ['str', 'agi', 'int', 'vit'].includes(k)
    ? attrName(k as Attribute)
    : tr(`games.idle.stat.${k}`, STAT_EN[k]);

const SLOT_EN: Record<Slot | 'charm', string> = {
  weapon: 'Weapon',
  offhand: 'Off-hand',
  head: 'Head',
  chest: 'Chest',
  hands: 'Hands',
  feet: 'Feet',
  ring: 'Ring',
  amulet: 'Amulet',
  charm: 'Charm',
};
export const slotName = (s: Slot | 'charm') => tr(`games.idle.slot.${s}`, SLOT_EN[s]);

const RARITY_EN: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};
export const rarityName = (r: Rarity) => tr(`games.idle.rarity.${r}`, RARITY_EN[r]);

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#b8c0cc',
  uncommon: '#5fd068',
  rare: '#4ea8ff',
  epic: '#c27aff',
  legendary: '#ffa53b',
};

const ELEMENT_EN: Record<Element, string> = {
  fire: 'Fire',
  frost: 'Frost',
  nature: 'Nature',
  shadow: 'Shadow',
  holy: 'Holy',
};
export const elementName = (e: Element) => tr(`games.idle.element.${e}`, ELEMENT_EN[e]);

const ITEM_EN: Record<string, string> = {
  sword: 'Longsword',
  axe: 'Greataxe',
  mace: 'Warhammer',
  bow: 'Longbow',
  dagger: 'Dagger',
  staff: 'Staff',
  wand: 'Wand',
  claws: 'Claws',
  shield: 'Shield',
  tome: 'Tome',
  quiver: 'Quiver',
  helm: 'Helm',
  hood: 'Hood',
  plate: 'Plate Armor',
  robe: 'Robe',
  gloves: 'Gloves',
  boots: 'Boots',
  ring: 'Ring',
  amulet: 'Amulet',
  ember_rune: 'Ember Rune',
  frost_shard: 'Frost Shard',
  living_seed: 'Living Seed',
  void_sigil: 'Void Sigil',
  saint_relic: 'Saint Relic',
};
export const itemName = (baseId: string) =>
  tr(`games.idle.item.${baseId}`, ITEM_EN[baseId] ?? baseId);

const ZONE_EN: Record<string, string> = {
  whispering_woods: 'Whispering Woods',
  ash_mines: 'Ash Mines',
  rot_marsh: 'Rot Marsh',
  frost_peaks: 'Frost Peaks',
  infernal_citadel: 'Infernal Citadel',
};
export const zoneName = (id: string) => tr(`games.idle.zone.${id}`, ZONE_EN[id] ?? id);

const ENEMY_EN: Record<string, string> = {
  wolf: 'Wolf',
  goblin: 'Goblin',
  spider: 'Giant Spider',
  treant: 'Ancient Treant',
  kobold: 'Kobold',
  golem: 'Stone Golem',
  bat: 'Cave Bat',
  magma_lord: 'Magma Lord',
  slime: 'Slime',
  lizardman: 'Lizardman',
  wisp: 'Marsh Wisp',
  hydra: 'Hydra',
  yeti: 'Yeti',
  ice_elemental: 'Ice Elemental',
  harpy: 'Harpy',
  frost_wyrm: 'Frost Wyrm',
  imp: 'Imp',
  hellhound: 'Hellhound',
  death_knight: 'Death Knight',
  archdemon: 'Archdemon',
};
/** Enemies carry their id as a name; anyone else (a hero, a rival) shows as is. */
export const fighterName = (name: string) =>
  ENEMY_EN[name] ? tr(`games.idle.enemy.${name}`, ENEMY_EN[name]) : name;

const UPGRADE_EN: Record<UpgradeId, [string, string]> = {
  might: ['Might', '+6% damage per level'],
  vigor: ['Vigor', '+6% life per level'],
  swiftness: ['Swiftness', '+2% attack speed per level'],
  fortune: ['Fortune', '+8% gold per level'],
  wisdom: ['Wisdom', '+8% experience per level'],
  satchel: ['Bigger backpack', 'One more row in the backpack'],
};
export const upgradeName = (id: UpgradeId) =>
  tr(`games.idle.upgrade.${id}.name`, UPGRADE_EN[id][0]);
export const upgradeDesc = (id: UpgradeId) =>
  tr(`games.idle.upgrade.${id}.desc`, UPGRADE_EN[id][1]);

const pct = (n: number) => Math.round(n * 100);
const sec = (ms: number) => (ms / 1000).toString().replace('.', ',');

/** A skill's effects in words, made from its data so the text can't go stale. */
export const effectText = (e: SkillEffect): string => {
  switch (e.kind) {
    case 'strike':
      return (e.hits ?? 1) > 1
        ? tr('games.idle.effect.strikes', '{{hits}} hits of {{pct}}% damage', {
            hits: e.hits ?? 1,
            pct: pct(e.multiplier),
          })
        : tr('games.idle.effect.strike', 'A hit of {{pct}}% damage', { pct: pct(e.multiplier) });
    case 'heal':
      return tr('games.idle.effect.heal', 'Heals {{pct}}% of life', { pct: pct(e.pctMaxHp) });
    case 'shield':
      return tr('games.idle.effect.shield', 'Shield of {{pct}}% of life for {{sec}}s', {
        pct: pct(e.pctMaxHp),
        sec: sec(e.durationMs),
      });
    case 'dot':
      return tr('games.idle.effect.dot', '{{pct}}% damage over {{sec}}s', {
        pct: pct(e.multiplier),
        sec: sec(e.durationMs),
      });
    case 'buff':
      return tr('games.idle.effect.buff', '{{mods}} for {{sec}}s', {
        mods: Object.entries(e.mods)
          .map(
            ([k, v]) =>
              `${statName(k as ModKey)} +${isPercent(k as ModKey) ? `${pct(v ?? 0)}%` : v}`
          )
          .join(', '),
        sec: sec(e.durationMs),
      });
    case 'stun':
      return tr('games.idle.effect.stun', 'Stuns for {{sec}}s', { sec: sec(e.durationMs) });
    case 'drain':
      return tr('games.idle.effect.drain', 'Drains {{pct}}% damage, healing {{heal}}% of it', {
        pct: pct(e.multiplier),
        heal: pct(e.healPct),
      });
    default:
      return '';
  }
};
