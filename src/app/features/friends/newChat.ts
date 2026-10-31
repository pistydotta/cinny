export type ChatTarget = { kind: 'open'; roomId: string } | { kind: 'create'; invite: string[] };

// One person: their DM, reusing the one you have. Two or more: a new group chat.
export const pickChatTarget = (
  userIds: string[],
  findDM: (userId: string) => string | undefined
): ChatTarget | undefined => {
  const invite = Array.from(new Set(userIds));
  if (invite.length === 0) return undefined;
  if (invite.length === 1) {
    const roomId = findDM(invite[0]);
    if (roomId) return { kind: 'open', roomId };
  }
  return { kind: 'create', invite };
};

// Friends whose name or user ID contains the query, ignoring case and spaces around it.
export const filterFriends = (
  userIds: string[],
  query: string,
  nameOf: (userId: string) => string
): string[] => {
  const q = query.trim().toLowerCase();
  if (!q) return userIds;
  return userIds.filter(
    (id) => id.toLowerCase().includes(q) || nameOf(id).toLowerCase().includes(q)
  );
};
