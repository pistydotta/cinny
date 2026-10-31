import { MatrixClient } from 'matrix-js-sdk';
import { Membership } from '../../../types/matrix/room';
import { getSpaceChildren } from '../../utils/room';
import { isAlwaysJoined } from './spaceAutoJoin';

export const isAlwaysJoinedRoom = (mx: MatrixClient, roomId: string): boolean => {
  const room = mx.getRoom(roomId);
  if (!room || room.isSpaceRoom()) return false;
  const inJoinedSpace = mx
    .getRooms()
    .some(
      (space) =>
        space.isSpaceRoom() &&
        space.getMyMembership() === Membership.Join &&
        getSpaceChildren(space).includes(roomId)
    );
  return isAlwaysJoined(room.getJoinRule(), inJoinedSpace);
};
