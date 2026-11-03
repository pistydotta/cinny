import { tr } from '../../translation/tr';
import { BranchId } from './engine/talents';
import {
  AltarId,
  Attribute,
  ClassId,
  Item,
  ModKey,
  Rarity,
  Role,
  SkillEffect,
  Slot,
  SpecId,
  UpgradeId,
} from './engine/types';
import { isPercent } from './format';

// Every name the game shows. The engine only has ids; the words live here, in English, with
// the Portuguese in pt.json under games.idle.

const CLASS_EN: Record<ClassId, [string, string]> = {
  warrior: ['Warrior', 'Steel and stubbornness. Heavy armor and a wide cleave.'],
  archer: ['Archer', 'Fast arrows and many crits, with a volley when it counts.'],
  rogue: ['Rogue', 'Quick, hard to hit, stuns and strikes from the shadows.'],
  mage: ['Mage', 'Slow on foot, devastating with spells.'],
  cleric: ['Cleric', 'Heals mid-fight and outlasts anything that hits slower.'],
  occultist: ['Occultist', 'Drains the life of foes to keep its own.'],
};
export const className = (id: ClassId) => tr(`games.idle.class.${id}.name`, CLASS_EN[id][0]);
export const classDesc = (id: ClassId) => tr(`games.idle.class.${id}.desc`, CLASS_EN[id][1]);

const SPEC_EN: Record<SpecId, [string, string]> = {
  guardian: ['Guardian', 'A wall: shields up, and every hit taken comes back as thorns.'],
  berserker: ['Berserker', 'The closer to death, the harder it hits. Heals by hitting.'],
  sniper: ['Sniper', 'Huge critical hits, and a shot that never misses a crit.'],
  beastmaster: ['Beastmaster', 'A wolf fights at its side and the pack tears armor apart.'],
  assassin: ['Assassin', 'Finishes off wounded foes with enormous damage.'],
  venomblade: ['Venomblade', 'Poison that keeps eating and weakens the enemy.'],
  pyromancer: ['Pyromancer', 'Meteors and fire that keeps burning.'],
  cryomancer: ['Cryomancer', 'Freezes the enemy, slows it and hides behind ice.'],
  paladin: ['Paladin', 'Holy armor, thorns and a judgment that stuns.'],
  druid: ['Druid', 'Strong regeneration, a treant ally and nature’s fury.'],
  necromancer: ['Necromancer', 'A skeleton that never stops hitting, and bone spears.'],
  hexer: ['Hexer', 'Curses that weaken the enemy while doom eats it.'],
};
export const specName = (id: SpecId) => tr(`games.idle.spec.${id}.name`, SPEC_EN[id][0]);
export const specDesc = (id: SpecId) => tr(`games.idle.spec.${id}.desc`, SPEC_EN[id][1]);

const ROLE_EN: Record<Role, string> = {
  tank: 'Tank',
  melee: 'Melee',
  ranged: 'Ranged',
  caster: 'Caster',
  support: 'Support',
};
export const roleName = (r: Role) => tr(`games.idle.role.${r}`, ROLE_EN[r]);

const SKILL_EN: Record<string, string> = {
  cleave: 'Cleave',
  shield_wall: 'Shield Wall',
  blood_rage: 'Blood Rage',
  volley: 'Volley',
  deadeye: 'Deadeye',
  pack_hunt: 'Pack Hunt',
  shadowstep: 'Shadowstep',
  eviscerate: 'Eviscerate',
  toxic_blades: 'Toxic Blades',
  fireball: 'Fireball',
  meteor: 'Meteor',
  frost_nova: 'Frost Nova',
  holy_light: 'Holy Light',
  judgment: 'Judgment',
  wild_growth: 'Wild Growth',
  soul_drain: 'Soul Drain',
  bone_spear: 'Bone Spear',
  doom: 'Doom',
  root_slam: 'Root Slam',
  eruption: 'Eruption',
  venom: 'Venom',
  frost_breath: 'Frost Breath',
  hellfire: 'Hellfire',
  tidal_crush: 'Tidal Crush',
  thunderclap: 'Thunderclap',
  unmaking: 'Unmaking',
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
  thorns: 'Thorns',
  execute: 'Execute',
  rage: 'Rage',
  petPower: 'Companion',
  damagePct: 'Damage',
  maxHpPct: 'Life',
  attackSpeedPct: 'Attack speed',
  armorPct: 'Armor',
  regenPct: 'Regeneration',
  goldFind: 'Gold found',
  xpGain: 'Experience',
  dropRate: 'Item drops',
  forgeChance: 'Forge chance',
  salvageYield: 'Salvage stones',
};
export const statName = (k: ModKey) =>
  ['str', 'agi', 'int', 'vit'].includes(k)
    ? attrName(k as Attribute)
    : tr(`games.idle.stat.${k}`, STAT_EN[k]);

const STAT_HINT_EN: Partial<Record<ModKey, string>> = {
  thorns: 'Part of each hit you take goes back to the attacker.',
  execute: 'More damage against enemies under 30% life.',
  rage: 'More damage the lower your life.',
  petPower: 'A companion hits once a second for this share of your damage.',
  regenPct: 'Share of your max life healed each second.',
};
export const statHint = (k: ModKey): string | undefined =>
  STAT_HINT_EN[k] ? tr(`games.idle.stat_hint.${k}`, STAT_HINT_EN[k] as string) : undefined;

const SLOT_EN: Record<Slot, string> = {
  weapon: 'Weapon',
  offhand: 'Off-hand',
  head: 'Head',
  chest: 'Chest',
  hands: 'Hands',
  feet: 'Feet',
  ring: 'Ring',
  amulet: 'Amulet',
};
export const slotName = (s: Slot) => tr(`games.idle.slot.${s}`, SLOT_EN[s]);

const RARITY_EN: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic',
};
export const rarityName = (r: Rarity) => tr(`games.idle.rarity.${r}`, RARITY_EN[r]);

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#b8c0cc',
  uncommon: '#5fd068',
  rare: '#4ea8ff',
  epic: '#c27aff',
  legendary: '#ffa53b',
  mythic: '#ff4d6d',
};

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
};
export const baseName = (baseId: string) =>
  tr(`games.idle.item.${baseId}`, ITEM_EN[baseId] ?? baseId);

// The best affix names the item, so two rings read apart: "Ring of Fury", "Ring of Fortune".
const TITLE_EN: Partial<Record<ModKey, string>> = {
  damage: 'of Might',
  maxHp: 'of the Bear',
  armor: 'of the Bulwark',
  str: 'of the Giant',
  agi: 'of the Fox',
  int: 'of the Sage',
  vit: 'of the Oak',
  damagePct: 'of Ruin',
  maxHpPct: 'of Life',
  attackSpeedPct: 'of Haste',
  critChance: 'of Precision',
  critDamage: 'of Carnage',
  dodge: 'of the Wind',
  lifesteal: 'of the Leech',
  skillPower: 'of Sorcery',
  cooldownReduction: 'of Time',
  regenPct: 'of Renewal',
  thorns: 'of Thorns',
  execute: 'of the Reaper',
  goldFind: 'of Greed',
  xpGain: 'of Wisdom',
  dropRate: 'of the Seeker',
};

/** "Ring of Fury +5" style name. */
export const itemName = (item: Pick<Item, 'baseId' | 'title' | 'plus'>): string => {
  const base = baseName(item.baseId);
  const title =
    item.title && TITLE_EN[item.title]
      ? tr(`games.idle.title_affix.${item.title}`, TITLE_EN[item.title] as string)
      : '';
  const name = title ? `${base} ${title}` : base;
  return item.plus > 0 ? `${name} +${item.plus}` : name;
};

const ZONE_EN: Record<string, string> = {
  whispering_woods: 'Whispering Woods',
  ash_mines: 'Ash Mines',
  rot_marsh: 'Rot Marsh',
  frost_peaks: 'Frost Peaks',
  infernal_citadel: 'Infernal Citadel',
  sunken_temple: 'Sunken Temple',
  storm_spire: 'Storm Spire',
  void_rift: 'Void Rift',
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
  naga: 'Naga',
  crab: 'Giant Crab',
  eel: 'Shock Eel',
  kraken: 'Kraken',
  gargoyle: 'Gargoyle',
  storm_hawk: 'Storm Hawk',
  sparkling: 'Living Spark',
  thunder_titan: 'Thunder Titan',
  voidling: 'Voidling',
  mind_flayer: 'Mind Flayer',
  star_eater: 'Star Eater',
  void_herald: 'Void Herald',
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
  satchel: ['Bigger backpack', '20 more slots. Kept on rebirth.'],
};
export const upgradeName = (id: UpgradeId) =>
  tr(`games.idle.upgrade.${id}.name`, UPGRADE_EN[id][0]);
export const upgradeDesc = (id: UpgradeId) =>
  tr(`games.idle.upgrade.${id}.desc`, UPGRADE_EN[id][1]);

const ALTAR_EN: Record<AltarId, [string, string]> = {
  ember_might: ['Eternal Might', '+12% damage per level, on top of everything else'],
  ember_vigor: ['Eternal Vigor', '+12% life per level, on top of everything else'],
  ember_greed: ['Eternal Greed', '+20% gold per level'],
  ember_wisdom: ['Eternal Wisdom', '+20% experience per level'],
  ember_forge: ['Ember Anvil', '+15% salvage stones and +0.5% forge chance per level'],
  talent_well: ['Well of Talent', '+3 talent points per level'],
  head_start: ['Head Start', 'Each run starts 10 stages further per level'],
  long_rest: ['Long Rest', '+1 hour of time away counted per level'],
};
export const altarName = (id: AltarId) => tr(`games.idle.altar.${id}.name`, ALTAR_EN[id][0]);
export const altarDesc = (id: AltarId) => tr(`games.idle.altar.${id}.desc`, ALTAR_EN[id][1]);

const BRANCH_EN: Record<BranchId, [string, string]> = {
  fury: ['Fury', 'Damage, crits and skills'],
  bulwark: ['Bulwark', 'Life, armor and staying power'],
  fortune: ['Fortune', 'Gold, experience, loot and the forge'],
};
export const branchName = (id: BranchId) => tr(`games.idle.branch.${id}.name`, BRANCH_EN[id][0]);
export const branchDesc = (id: BranchId) => tr(`games.idle.branch.${id}.desc`, BRANCH_EN[id][1]);

const TALENT_EN: Record<string, string> = {
  sharpness: 'Sharpness',
  precision: 'Precision',
  frenzy: 'Frenzy',
  brutality: 'Brutality',
  arcana: 'Arcana',
  reaper: 'Reaper',
  bloodlust: 'Bloodlust',
  carnage: 'Carnage',
  toughness: 'Toughness',
  plating: 'Plating',
  evasion: 'Evasion',
  recovery: 'Recovery',
  spikes: 'Spikes',
  focus: 'Focus',
  companion: 'Loyal Companion',
  endurance: 'Endurance',
  greed: 'Greed',
  scholar: 'Scholar',
  scavenger: 'Scavenger',
  salvager: 'Salvager',
  smith: 'Smith',
  veteran: 'Veteran',
  hoarder: 'Hoarder',
  prosperity: 'Prosperity',
};
export const talentName = (id: string) => tr(`games.idle.talent.${id}`, TALENT_EN[id] ?? id);

const pct = (n: number) => Math.round(n * 100);
const sec = (ms: number) => (ms / 1000).toString().replace('.', ',');

/** A list of bonuses in words: "Damage +3%, Life +12". */
export const modsText = (mods: Partial<Record<ModKey, number>>): string =>
  Object.entries(mods)
    .map(([k, v]) => {
      const key = k as ModKey;
      const value = v ?? 0;
      const sign = value < 0 ? '−' : '+';
      const abs = Math.abs(value);
      const shown = isPercent(key) ? `${Math.round(abs * 1000) / 10}%` : `${Math.round(abs)}`;
      return `${statName(key)} ${sign}${shown.replace('.', ',')}`;
    })
    .join(', ');

/** A skill's effects in words, made from its data so the text can't go stale. */
export const effectText = (e: SkillEffect): string => {
  switch (e.kind) {
    case 'strike': {
      const crit = e.alwaysCrit
        ? ` ${tr('games.idle.effect.always_crit', '(always critical)')}`
        : '';
      return (e.hits ?? 1) > 1
        ? tr('games.idle.effect.strikes', '{{hits}} hits of {{pct}}% damage', {
            hits: e.hits ?? 1,
            pct: pct(e.multiplier),
          }) + crit
        : tr('games.idle.effect.strike', 'A hit of {{pct}}% damage', { pct: pct(e.multiplier) }) +
            crit;
    }
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
        mods: modsText(e.mods),
        sec: sec(e.durationMs),
      });
    case 'curse':
      return tr('games.idle.effect.curse', 'Enemy {{mods}} for {{sec}}s', {
        mods: modsText(e.mods),
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
