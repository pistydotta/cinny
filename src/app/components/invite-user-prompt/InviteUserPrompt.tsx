import React from 'react';
import { Room } from 'matrix-js-sdk';
import { InviteDialog } from '../../features/room-invite/InviteDialog';

// blazeroom's invite dialog replaces Cinny's (features/room-invite/InviteDialog.tsx).
type InviteUserProps = {
  room: Room;
  requestClose: () => void;
};
export function InviteUserPrompt({ room, requestClose }: InviteUserProps) {
  return <InviteDialog room={room} requestClose={requestClose} />;
}
