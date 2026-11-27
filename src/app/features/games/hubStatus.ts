// What a game's card on the hub says about the tables listed under "Happening now". Kept free
// of React so it can be tested.

type StatusInput = { game: string; role: 'seated' | 'open' | 'watch'; idle?: boolean };

export type GameStatus<T> = { seated: T } | { going: number } | undefined;

// Your own table first, since the card's button then goes back to it; otherwise how many
// tables of this game the hub lists (yours, invites, your call's and your friends').
export const gameStatus = <T extends StatusInput>(tables: T[], game: string): GameStatus<T> => {
  const mine = tables.filter((t) => t.game === game);
  const seated = mine.find((t) => t.role === 'seated');
  if (seated) return { seated };
  const going = mine.filter((t) => !t.idle).length;
  return going ? { going } : undefined;
};
