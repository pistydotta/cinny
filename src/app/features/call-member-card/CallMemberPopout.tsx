import React, { ReactNode } from 'react';
import type { Room } from 'matrix-js-sdk/lib/models/room';
import {
  useOpenUserRoomProfile,
  useCloseUserRoomProfile,
  useUserRoomProfileState,
} from '../../state/hooks/userRoomProfile';

type CallMemberPopoutProps = {
  room: Room;
  userId: string;
  children: (open: (evt: React.MouseEvent<HTMLElement>) => void, opened: boolean) => ReactNode;
};

// Share the compact, nonblocking controls used by the call tiles and live indicators.
export function CallMemberPopout({ room, userId, children }: CallMemberPopoutProps) {
  const profile = useUserRoomProfileState();
  const openProfile = useOpenUserRoomProfile();
  const close = useCloseUserRoomProfile();
  const opened =
    profile?.compact === true && profile.roomId === room.roomId && profile.userId === userId;
  const open = (event: React.MouseEvent<HTMLElement>) => {
    if (opened) close();
    else
      openProfile(
        room.roomId,
        undefined,
        userId,
        event.currentTarget.getBoundingClientRect(),
        'Right',
        true
      );
  };
  return <>{children(open, opened)}</>;
}
