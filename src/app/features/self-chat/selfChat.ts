type Directs = Record<string, unknown> | undefined;

// Your chat with yourself, from the m.direct account data. getDMRoomFor can't find it: you're a
// member of every DM, so it would answer with a chat with someone else.
export const findSelfChat = (
  directs: Directs,
  myUserId: string,
  isJoined: (roomId: string) => boolean
): string | undefined => {
  const roomIds = directs?.[myUserId];
  if (!Array.isArray(roomIds)) return undefined;
  return roomIds.find((roomId) => typeof roomId === 'string' && isJoined(roomId));
};

export const addSelfChat = (
  directs: Directs,
  myUserId: string,
  roomId: string
): Record<string, unknown> => {
  const roomIds = directs?.[myUserId];
  return { ...directs, [myUserId]: [...(Array.isArray(roomIds) ? roomIds : []), roomId] };
};

// What to change in the room so it shows your current name and photo. Undefined keeps it as it is.
export const selfChatChanges = (
  room: { name?: string; avatar?: string },
  profile: { name: string; avatar?: string }
): { name?: string; avatar?: string } => ({
  name: room.name !== profile.name ? profile.name : undefined,
  avatar: (room.avatar ?? '') !== (profile.avatar ?? '') ? profile.avatar ?? '' : undefined,
});

// In account data, so hiding the chat on one device hides it on all of them.
export const SELF_CHAT_SETTINGS = 'br.com.blazeroom.self_chat';

export const parseSelfChatHidden = (content: Record<string, unknown> | undefined): boolean =>
  content?.hidden === true;

// The DM list without a hidden self chat. An open chat stays, so the list shows where you are.
export const visibleDirects = (
  roomIds: string[],
  directs: Directs,
  myUserId: string,
  hidden: boolean,
  selectedRoomId: string | undefined
): string[] => {
  const own = directs?.[myUserId];
  if (!hidden || !Array.isArray(own)) return roomIds;
  return roomIds.filter((roomId) => roomId === selectedRoomId || !own.includes(roomId));
};
