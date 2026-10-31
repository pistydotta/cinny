import { useEffect } from 'react';
import { ClientEvent, NotificationCountType, Room, RoomEvent, SyncState } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { markAsRead } from '../../utils/notifications';
import { roomHaveUnread } from '../../utils/room';

export const CALL_MEMBER_TYPE = 'org.matrix.msc3401.call.member';

export const countsOnlyCalls = ({
  total,
  highlight,
  hasUnread,
}: {
  total: number;
  highlight: number;
  hasUnread: boolean;
}): boolean => total > 0 && highlight === 0 && !hasUnread;

// The ring rule (ringRule.ts) makes Synapse count call member events as notifications, and a push
// rule can't push without counting. So a room with a count and nothing to read gets a private read
// receipt, which clears it, on opening the site and when a call event arrives.
export function CallUnreadCleaner() {
  const mx = useMatrixClient();

  useEffect(() => {
    const clear = (room: Room) => {
      const onlyCalls = countsOnlyCalls({
        total: room.getUnreadNotificationCount(NotificationCountType.Total),
        highlight: room.getUnreadNotificationCount(NotificationCountType.Highlight),
        hasUnread: roomHaveUnread(mx, room),
      });
      if (onlyCalls) markAsRead(mx, room.roomId, true).catch(() => undefined);
    };
    const handleSync = (state: SyncState, prev: SyncState | null) => {
      if (state === SyncState.Syncing && prev !== SyncState.Syncing) mx.getRooms().forEach(clear);
    };
    const handleCounts = (_: unknown, room: Room) => {
      const last = room.getLiveTimeline().getEvents().at(-1);
      if (last?.getType() === CALL_MEMBER_TYPE) clear(room);
    };

    mx.getRooms().forEach(clear);
    mx.on(ClientEvent.Sync, handleSync);
    mx.on(RoomEvent.UnreadNotifications, handleCounts);
    return () => {
      mx.removeListener(ClientEvent.Sync, handleSync);
      mx.removeListener(RoomEvent.UnreadNotifications, handleCounts);
    };
  }, [mx]);

  return null;
}
