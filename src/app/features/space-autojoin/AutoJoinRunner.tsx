import React from 'react';
import { useAtomValue } from 'jotai';
import { Room } from 'matrix-js-sdk';
import { Box, Spinner } from 'folds';
import { getSpaceChildren } from '../../utils/room';
import { isAwaitingAutoJoin } from './spaceAutoJoin';
import { autoJoinAtom, useAutoJoinSpaceRooms } from './useAutoJoinSpaceRooms';

// Mounted with the space's route, not its sidebar: a phone opening a room's link has no sidebar.
export function SpaceAutoJoin({ space }: { space: Room }) {
  useAutoJoinSpaceRooms(space);
  return null;
}

export const useAwaitingAutoJoin = (space: Room, roomId: string | undefined): boolean =>
  isAwaitingAutoJoin(roomId, space.roomId, getSpaceChildren(space), useAtomValue(autoJoinAtom));

export function AutoJoinWait() {
  return (
    <Box grow="Yes" alignItems="Center" justifyContent="Center">
      <Spinner variant="Secondary" size="400" />
    </Box>
  );
}
