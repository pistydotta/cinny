export type AmountUnit = 'chips' | 'bb';
export type PokerPreferences = {
  unit: AmountUnit;
  sounds: boolean;
  volume: number;
  turn: boolean;
  cards: boolean;
  actions: boolean;
  wins: boolean;
};

export const PREFERENCES_KEY = 'br.com.blazeroom.poker.preferences.v1';
export const DEFAULT_PREFERENCES: PokerPreferences = {
  unit: 'chips',
  sounds: false,
  volume: 0.35,
  turn: true,
  cards: true,
  actions: true,
  wins: true,
};

export function parsePreferences(value: string | null): PokerPreferences {
  try {
    const input: unknown = JSON.parse(value ?? 'null');
    if (!input || typeof input !== 'object') return { ...DEFAULT_PREFERENCES };
    const data = input as Record<string, unknown>;
    const result = { ...DEFAULT_PREFERENCES };
    if (data.unit === 'bb' || data.unit === 'chips') result.unit = data.unit;
    if (typeof data.volume === 'number' && Number.isFinite(data.volume)) {
      result.volume = Math.max(0, Math.min(1, data.volume));
    }
    (['sounds', 'turn', 'cards', 'actions', 'wins'] as const).forEach((key) => {
      if (typeof data[key] === 'boolean') result[key] = data[key] as boolean;
    });
    return result;
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function readPreferences(): PokerPreferences {
  try {
    return parsePreferences(localStorage.getItem(PREFERENCES_KEY));
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(value: PokerPreferences): void {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(value));
  } catch {
    /* Optional storage. */
  }
}
