// What the /hierarchy endpoint returns for each room (only the fields we use).
export type HierarchyRoom = {
  room_id: string;
  join_rule?: string;
  children_state: { state_key: string; content: { via?: string[] } }[];
};

export type RoomToJoin = { roomId: string; via: string[] };

// Rooms anyone in the space may join without an invite.
const OPEN_RULES = new Set(['public', 'restricted', 'knock_restricted']);

// A public room follows the space, like a Discord channel: leaving it doesn't last, and neither
// could it, since the client forgets rooms you left when the page reloads.
export const shouldSkipAutoJoin = (membership: string | undefined, attempted: boolean): boolean =>
  attempted || membership === 'join' || membership === 'ban';

// Rooms you can't leave, because you'd be back the next time you open the space.
export const isAlwaysJoined = (joinRule: string | undefined, inJoinedSpace: boolean): boolean =>
  inJoinedSpace && OPEN_RULES.has(joinRule ?? '');

export type AutoJoinState = {
  // Spaces whose rooms have been read this page load.
  checkedSpaces: ReadonlySet<string>;
  awaiting: ReadonlySet<string>;
};

// Whether an unjoined room is about to be joined, so there's no point offering a Join button.
export const isAwaitingAutoJoin = (
  roomId: string | undefined,
  spaceId: string,
  spaceChildren: string[],
  { checkedSpaces, awaiting }: AutoJoinState
): boolean =>
  !!roomId &&
  spaceChildren.includes(roomId) &&
  (!checkedSpaces.has(spaceId) || awaiting.has(roomId));

// Like entering a Discord server: every room and sub-space of the space you can join, parents
// before children (the order /hierarchy returns), with the servers the space lists for each.
export const roomsToAutoJoin = (
  rooms: HierarchyRoom[],
  spaceId: string,
  skip: (roomId: string) => boolean
): RoomToJoin[] => {
  const via = new Map<string, string[]>();
  rooms.forEach((room) =>
    room.children_state.forEach((child) => {
      if (!via.has(child.state_key)) via.set(child.state_key, child.content.via ?? []);
    })
  );

  return rooms
    .filter(
      (room) =>
        room.room_id !== spaceId &&
        OPEN_RULES.has(room.join_rule ?? '') &&
        via.has(room.room_id) &&
        !skip(room.room_id)
    )
    .map((room) => ({ roomId: room.room_id, via: via.get(room.room_id) ?? [] }));
};
