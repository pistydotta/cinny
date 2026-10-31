// Remove with useLeaveOldPokerRooms once people have had time to open the app.
export const OLD_POKER_ROOM_TYPE = 'io.github.pistydotta.poker.table';

// Matches only the old poker tables, never an ordinary room (no type) or a space.
export const isOldPokerRoom = (createContent: { type?: unknown } | undefined): boolean =>
  createContent?.type === OLD_POKER_ROOM_TYPE;
