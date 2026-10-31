// In account data, so a chat pinned on one device is pinned on all of them.
export const PINNED_CHATS = 'br.com.blazeroom.pinned_chats';

export const parsePinnedChats = (content: Record<string, unknown> | undefined): string[] => {
  const rooms = content?.rooms;
  return Array.isArray(rooms) ? rooms.filter((id): id is string => typeof id === 'string') : [];
};

export const togglePinnedChat = (pinned: string[], roomId: string): string[] =>
  pinned.includes(roomId) ? pinned.filter((id) => id !== roomId) : [...pinned, roomId];

export const pinnedFirst = (roomIds: string[], pinned: string[]): string[] => [
  ...pinned.filter((id) => roomIds.includes(id)),
  ...roomIds.filter((id) => !pinned.includes(id)),
];
