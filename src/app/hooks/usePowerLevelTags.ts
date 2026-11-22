import { Room } from 'matrix-js-sdk';
import { useMemo } from 'react';
import { IPowerLevels } from './usePowerLevels';
import { useStateEvent } from './useStateEvent';
import { MemberPowerTag, StateEvent } from '../../types/matrix/room';
import { tr } from '../features/translation/tr';

export type PowerLevelTags = Record<number, MemberPowerTag>;

const powerSortFn = (a: number, b: number) => b - a;
const sortPowers = (powers: number[]): number[] => powers.sort(powerSortFn);

export const getPowers = (tags: PowerLevelTags): number[] => {
  const powers: number[] = Object.keys(tags)
    .map((p) => {
      const power = parseInt(p, 10);
      if (Number.isNaN(power)) {
        return undefined;
      }
      return power;
    })
    .filter((power) => typeof power === 'number');

  return sortPowers(powers);
};

export const getUsedPowers = (powerLevels: IPowerLevels): Set<number> => {
  const powers: Set<number> = new Set();

  const findAndAddPower = (data: Record<string, unknown>) => {
    Object.keys(data).forEach((key) => {
      const powerOrAny: unknown = data[key];

      if (typeof powerOrAny === 'number') {
        powers.add(powerOrAny);
        return;
      }
      if (powerOrAny && typeof powerOrAny === 'object') {
        findAndAddPower(powerOrAny as Record<string, unknown>);
      }
    });
  };

  findAndAddPower(powerLevels);

  return powers;
};

// A function so the names are read in the app's language, after i18n has started.
const defaultTags = (): PowerLevelTags => ({
  9001: {
    name: 'Goku',
    color: '#ff6a00',
  },
  150: {
    name: tr('power_tags.manager', 'Manager'),
    color: '#ff6a7f',
  },
  101: {
    name: tr('power_tags.founder', 'Founder'),
    color: '#0000ff',
  },
  100: {
    name: tr('power_tags.admin', 'Admin'),
    color: '#0088ff',
  },
  50: {
    name: tr('power_tags.moderator', 'Moderator'),
    color: '#1fd81f',
  },
  0: {
    name: tr('power_tags.member', 'Member'),
    color: '#91cfdf',
  },
  [-1]: {
    name: tr('power_tags.muted', 'Muted'),
    color: '#888888',
  },
});

const generateFallbackTag = (powerLevelTags: PowerLevelTags, power: number): MemberPowerTag => {
  const highToLow = sortPowers(getPowers(powerLevelTags));

  const tagPower = highToLow.find((p) => p < power);
  const tag = typeof tagPower === 'number' ? powerLevelTags[tagPower] : undefined;

  return {
    name: tag ? `${tag.name} ${power}` : tr('power_tags.team', 'Team {{power}}', { power }),
  };
};

export const usePowerLevelTags = (room: Room, powerLevels: IPowerLevels): PowerLevelTags => {
  const tagsEvent = useStateEvent(room, StateEvent.PowerLevelTags);

  const powerLevelTags: PowerLevelTags = useMemo(() => {
    const content = tagsEvent?.getContent<PowerLevelTags>();
    const powerToTags: PowerLevelTags = { ...content };

    const powers = getUsedPowers(powerLevels);
    const defaults = defaultTags();
    Array.from(powers).forEach((power) => {
      if (powerToTags[power]?.name === undefined) {
        powerToTags[power] = defaults[power] ?? generateFallbackTag(defaults, power);
      }
    });

    return powerToTags;
  }, [powerLevels, tagsEvent]);

  return powerLevelTags;
};

export const getPowerLevelTag = (
  powerLevelTags: PowerLevelTags,
  powerLevel: number
): MemberPowerTag => {
  const tag: MemberPowerTag | undefined = powerLevelTags[powerLevel];
  return tag ?? generateFallbackTag(powerLevelTags, powerLevel);
};
