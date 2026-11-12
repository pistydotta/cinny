export const TRUCO_DECKS = ['paulista', 'spanish'] as const;
export type TrucoDeck = typeof TRUCO_DECKS[number];

const storageKey = (userId: string) => `blazeroom.truco.deck:${userId}`;

export function readTrucoDeck(userId: string): TrucoDeck {
  try {
    return localStorage.getItem(storageKey(userId)) === 'spanish' ? 'spanish' : 'paulista';
  } catch {
    return 'paulista';
  }
}

export function saveTrucoDeck(userId: string, deck: TrucoDeck) {
  try {
    localStorage.setItem(storageKey(userId), deck);
  } catch {
    // The active table can still switch decks if storage is unavailable.
  }
}
