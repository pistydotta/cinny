import { Room } from 'matrix-js-sdk';
import { useAtomValue } from 'jotai';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { getAllParents, guessPerfectParent } from '../../utils/room';
import { useOrphanSpaces } from '../../state/hooks/roomList';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { allRoomsAtom } from '../../state/room-list/roomList';
import { useAllJoinedRoomsSet, useGetRoom } from '../../hooks/useGetRoom';

// The space a call's room sits in, picked the same way as the call bar's room name.
export const useCallSpaceName = (room: Room): string | undefined => {
  const mx = useMatrixClient();
  const roomToParents = useAtomValue(roomToParentsAtom);
  const orphanSpaces = useOrphanSpaces(mx, allRoomsAtom, roomToParents);
  const getRoom = useGetRoom(useAllJoinedRoomsSet());

  const parents = getAllParents(roomToParents, room.roomId);
  const orphanParents = parents && orphanSpaces.filter((o) => parents.has(o));
  const parent = orphanParents && guessPerfectParent(mx, room.roomId, orphanParents);
  return parent ? getRoom(parent)?.name ?? undefined : undefined;
};
