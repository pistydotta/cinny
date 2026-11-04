import type { TableView } from '../types';
import type { PokerPreferences } from './preferences';

export type PokerSound = 'turn' | 'deal' | 'chips' | 'fold' | 'check' | 'win';

export function soundEvents(
  previous: TableView | undefined,
  next: TableView,
  heroId: string
): PokerSound[] {
  // Never replay a snapshot's history on mount, table switch, or stream reconnect.
  if (!previous || previous.id !== next.id || next.version <= previous.version) return [];
  const sounds: PokerSound[] = [];
  if (
    next.legal &&
    (!previous.legal || previous.handNumber !== next.handNumber || previous.street !== next.street)
  )
    sounds.push('turn');
  if (next.handNumber > previous.handNumber || next.board.length > previous.board.length)
    sounds.push('deal');
  if (next.handNumber === previous.handNumber) {
    const last = Math.max(0, ...previous.log.map((entry) => entry.id));
    const keys = new Set(next.log.filter((entry) => entry.id > last).map((entry) => entry.key));
    if (['call', 'call_allin', 'bet', 'raise', 'allin'].some((key) => keys.has(key)))
      sounds.push('chips');
    else if (keys.has('fold')) sounds.push('fold');
    else if (keys.has('check')) sounds.push('check');
  }
  if (
    next.phase === 'complete' &&
    previous.phase !== 'complete' &&
    (next.result?.payouts[heroId] ?? 0) > 0
  )
    sounds.push('win');
  return sounds;
}

export const enabledSound = (event: PokerSound, preferences: PokerPreferences): boolean => {
  if (!preferences.sounds || preferences.volume <= 0) return false;
  if (event === 'turn') return preferences.turn;
  if (event === 'deal') return preferences.cards;
  if (event === 'win') return preferences.wins;
  return preferences.actions;
};
