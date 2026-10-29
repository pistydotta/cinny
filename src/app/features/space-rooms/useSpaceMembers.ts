import { useMemo } from 'react';
import { Room } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { StateEvent } from '../../../types/matrix/room';
import { linkedSpaceIds } from './spaceRoomAccess';

// Who has joined the spaces `room` is in, or undefined when it isn't in any. A space we
// can't see counts as having no members we know of; the server has the final say.
export const useParentSpaceMembers = (room: Room): ReadonlySet<string> | undefined => {
  const mx = useMatrixClient();

  return useMemo(() => {
    const parents = room.currentState.getStateEvents(StateEvent.SpaceParent).map((event) => ({
      stateKey: event.getStateKey() ?? '',
      via: event.getContent().via,
    }));
    const spaceIds = linkedSpaceIds(parents);
    if (spaceIds.length === 0) return undefined;

    const members = new Set<string>();
    spaceIds.forEach((spaceId) => {
      mx.getRoom(spaceId)
        ?.getJoinedMembers()
        .forEach((member) => members.add(member.userId));
    });
    return members;
  }, [mx, room]);
};
