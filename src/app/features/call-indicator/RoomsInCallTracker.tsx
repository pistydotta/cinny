import { useEffect } from 'react';
import { atom, useSetAtom } from 'jotai';
import { ClientEvent, MatrixClient, Room, RoomEvent } from 'matrix-js-sdk';
import {
  MatrixRTCSession,
  MatrixRTCSessionEvent,
} from 'matrix-js-sdk/lib/matrixrtc/MatrixRTCSession';
import { MatrixRTCSessionManagerEvents } from 'matrix-js-sdk/lib/matrixrtc/MatrixRTCSessionManager';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { Membership } from '../../../types/matrix/room';
import { roomsInCall } from './callRooms';

export const roomsInCallAtom = atom<Set<string>>(new Set<string>());

const readRoomsInCall = (mx: MatrixClient): Set<string> =>
  roomsInCall(
    mx.getRooms().map((room: Room) => ({
      roomId: room.roomId,
      joined: room.getMyMembership() === Membership.Join,
      callMembers: mx.matrixRTC.getRoomSession(room).memberships.length,
    }))
  );

// Watches every room's session, not only the manager's started and ended events: after a reload a
// session works out its members a moment after it's created, and the manager doesn't announce that.
export function RoomsInCallTracker() {
  const mx = useMatrixClient();
  const setRoomsInCall = useSetAtom(roomsInCallAtom);

  useEffect(() => {
    const watched = new Set<MatrixRTCSession>();
    const refresh = () => setRoomsInCall(readRoomsInCall(mx));
    const watch = (room: Room) => {
      const session = mx.matrixRTC.getRoomSession(room);
      if (watched.has(session)) return;
      watched.add(session);
      session.on(MatrixRTCSessionEvent.MembershipsChanged, refresh);
    };
    const handleRoom = (room: Room) => {
      watch(room);
      refresh();
    };

    mx.getRooms().forEach(watch);
    refresh();
    mx.on(ClientEvent.Room, handleRoom);
    mx.on(RoomEvent.MyMembership, refresh);
    mx.matrixRTC.on(MatrixRTCSessionManagerEvents.SessionStarted, refresh);
    mx.matrixRTC.on(MatrixRTCSessionManagerEvents.SessionEnded, refresh);
    return () => {
      watched.forEach((session) =>
        session.removeListener(MatrixRTCSessionEvent.MembershipsChanged, refresh)
      );
      mx.removeListener(ClientEvent.Room, handleRoom);
      mx.removeListener(RoomEvent.MyMembership, refresh);
      mx.matrixRTC.off(MatrixRTCSessionManagerEvents.SessionStarted, refresh);
      mx.matrixRTC.off(MatrixRTCSessionManagerEvents.SessionEnded, refresh);
    };
  }, [mx, setRoomsInCall]);

  return null;
}
