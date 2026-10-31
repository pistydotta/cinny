export type RoomCallState = {
  roomId: string;
  joined: boolean;
  callMembers: number;
};

// Rooms someone only left or was invited to are still known to the client, but aren't theirs to see.
export const roomsInCall = (rooms: RoomCallState[]): Set<string> =>
  new Set(rooms.filter((r) => r.joined && r.callMembers > 0).map((r) => r.roomId));

export const anyRoomInCall = (inCall: Set<string>, roomIds: string[]): boolean =>
  roomIds.some((roomId) => inCall.has(roomId));

export const anyCallUnderSpaces = (
  inCall: Set<string>,
  spaceIds: string[],
  parentsOf: (roomId: string) => Set<string>
): boolean =>
  Array.from(inCall).some((roomId) => {
    const parents = parentsOf(roomId);
    return spaceIds.some((spaceId) => parents.has(spaceId));
  });
