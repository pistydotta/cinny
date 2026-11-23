import React from 'react';
import { useAtomValue } from 'jotai';
import { Icon, Icons, toRem } from 'folds';
import { SidebarItemBadge } from '../../components/sidebar';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { getAllParents } from '../../utils/room';
import { tr } from '../translation/tr';
import { anyCallUnderSpaces, anyRoomInCall } from './callRooms';
import { roomsInCallAtom } from './RoomsInCallTracker';
import * as css from './live.css';

// In the bottom corner because the unread badge has the top one. It lets someone see a call
// without opening each server to look for it.
function CallTabBadge() {
  return (
    <SidebarItemBadge
      role="img"
      aria-label={tr('call_indicator.label', 'Call in progress')}
      style={{ top: 'auto', left: 'auto', right: toRem(-2), bottom: toRem(-2) }}
    >
      <span className={css.RailBadge}>
        <Icon size="50" src={Icons.VolumeHigh} filled />
      </span>
    </SidebarItemBadge>
  );
}

export function SpacesCallBadge({ spaceIds }: { spaceIds: string[] }) {
  const inCall = useAtomValue(roomsInCallAtom);
  const roomToParents = useAtomValue(roomToParentsAtom);
  const parentsOf = (roomId: string) => getAllParents(roomToParents, roomId);

  return anyCallUnderSpaces(inCall, spaceIds, parentsOf) ? <CallTabBadge /> : null;
}

export function RoomsCallBadge({ roomIds }: { roomIds: string[] }) {
  const inCall = useAtomValue(roomsInCallAtom);

  return anyRoomInCall(inCall, roomIds) ? <CallTabBadge /> : null;
}
