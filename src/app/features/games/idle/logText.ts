import { GameEvent } from './engine/types';
import { formatBig } from './format';
import { fighterName, itemName, rarityName, skillName } from './labels';
import { tr } from '../../translation/tr';

export type LogTone = 'good' | 'bad' | 'gold' | 'loot' | 'great' | undefined;

/** One line of the battle log, or undefined for events the log doesn't show. */
export const logText = (e: GameEvent): { text: string; tone: LogTone } | undefined => {
  switch (e.t) {
    case 'fight':
      return {
        text: e.boss
          ? tr('games.idle.log.boss', 'Boss fight: {{foe}}!', { foe: fighterName(e.foe) })
          : tr('games.idle.log.fight', 'A {{foe}} appears.', { foe: fighterName(e.foe) }),
        tone: e.boss ? 'bad' : undefined,
      };
    case 'skill':
      return {
        text:
          e.from === 'hero'
            ? tr('games.idle.log.skill_hero', 'You use {{skill}}.', { skill: skillName(e.skillId) })
            : tr('games.idle.log.skill_foe', 'The enemy uses {{skill}}.', {
                skill: skillName(e.skillId),
              }),
        tone: e.from === 'hero' ? undefined : 'bad',
      };
    case 'kill':
      return {
        text: tr('games.idle.log.kill', '{{foe}} defeated: +{{gold}} gold, +{{xp}} XP', {
          foe: fighterName(e.foe),
          gold: formatBig(e.gold),
          xp: formatBig(e.xp),
        }),
        tone: 'gold',
      };
    case 'loot': {
      const { item, fate, better } = e.entry;
      const name = `${itemName(item)} (${rarityName(item.rarity)})`;
      if (fate !== 'kept') {
        return {
          text: tr('games.idle.log.salvaged', '{{item}} broken down into stones', { item: name }),
          tone: undefined,
        };
      }
      return {
        text: better
          ? tr('games.idle.log.loot_better', 'Found: {{item}} — better than yours!', { item: name })
          : tr('games.idle.log.loot', 'Found: {{item}}', { item: name }),
        tone: better || ['epic', 'legendary', 'mythic'].includes(item.rarity) ? 'great' : 'loot',
      };
    }
    case 'materials':
      return {
        text:
          e.cores > 0
            ? tr('games.idle.log.materials_core', '+{{stones}} ember stones and a fire core', {
                stones: e.stones,
              })
            : tr('games.idle.log.materials', '+{{stones}} ember stones', { stones: e.stones }),
        tone: 'loot',
      };
    case 'level':
      return {
        text: tr('games.idle.log.level', 'Level {{level}}! A new talent point.', {
          level: e.level,
        }),
        tone: 'good',
      };
    case 'stage':
      return {
        text: tr('games.idle.log.stage', 'Stage {{stage}}.', { stage: e.stage }),
        tone: 'good',
      };
    case 'death':
      return {
        text: tr('games.idle.log.death', 'You fell. Back one stage to grow stronger.'),
        tone: 'bad',
      };
    case 'timeout':
      return {
        text: tr('games.idle.log.timeout', 'The boss outlasted you. Back one stage.'),
        tone: 'bad',
      };
    default:
      return undefined;
  }
};
