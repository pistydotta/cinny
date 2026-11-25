import { Kit, TEAMS } from './engine/teams';
import { Difficulty } from './engine/types';
import { HALF_OPTIONS } from './engine/data';

export { HALF_OPTIONS };

// The menu's choices, kept per browser so the next match starts where the last one did.

export type Mode = 'cpu' | 'local' | 'online';

export type Choices = {
  mode: Mode;
  home: string;
  away: string;
  difficulty: Difficulty;
  halfMinutes: number;
  // Online: people a side, 1 to 4.
  perSide: number;
};

const KEY = 'blazeroom.football.choices';

export const DEFAULT_CHOICES: Choices = {
  mode: 'cpu',
  home: 'flamengo',
  away: 'palmeiras',
  difficulty: 'normal',
  halfMinutes: 4,
  perSide: 1,
};

export const parseChoices = (text: string | null): Choices => {
  if (!text) return DEFAULT_CHOICES;
  try {
    const raw = JSON.parse(text) as Partial<Choices>;
    const team = (id: unknown, fallback: string) =>
      typeof id === 'string' && TEAMS.some((t) => t.id === id) ? id : fallback;
    return {
      mode: raw.mode === 'local' || raw.mode === 'online' ? raw.mode : 'cpu',
      home: team(raw.home, DEFAULT_CHOICES.home),
      away: team(raw.away, DEFAULT_CHOICES.away),
      difficulty: ['easy', 'normal', 'hard'].includes(raw.difficulty as string)
        ? (raw.difficulty as Difficulty)
        : DEFAULT_CHOICES.difficulty,
      halfMinutes: HALF_OPTIONS.includes(raw.halfMinutes as 2)
        ? (raw.halfMinutes as number)
        : DEFAULT_CHOICES.halfMinutes,
      perSide: [1, 2, 3, 4].includes(raw.perSide as number)
        ? (raw.perSide as number)
        : DEFAULT_CHOICES.perSide,
    };
  } catch {
    return DEFAULT_CHOICES;
  }
};

export const loadChoices = (): Choices => {
  try {
    return parseChoices(localStorage.getItem(KEY));
  } catch {
    return DEFAULT_CHOICES;
  }
};

export const saveChoices = (c: Choices): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    // Private windows may refuse; the menu still works.
  }
};

// A CSS background that draws a kit's shirt in the menu and on the scoreboard.
export const shirtBackground = (kit: Kit): string => {
  const { shirt, trim } = kit;
  switch (kit.pattern) {
    case 'stripes':
      return `repeating-linear-gradient(90deg, ${shirt} 0 3px, ${trim} 3px 6px)`;
    case 'hoops':
      return `repeating-linear-gradient(0deg, ${shirt} 0 3px, ${trim} 3px 6px)`;
    case 'band':
      return `linear-gradient(180deg, ${shirt} 0 35%, ${trim} 35% 55%, ${shirt} 55%)`;
    case 'sash':
      return `linear-gradient(135deg, ${shirt} 0 40%, ${trim} 40% 60%, ${shirt} 60%)`;
    case 'checks':
      return `repeating-conic-gradient(${shirt} 0 25%, ${trim} 0 50%) 0 0 / 8px 8px`;
    default:
      return shirt;
  }
};
