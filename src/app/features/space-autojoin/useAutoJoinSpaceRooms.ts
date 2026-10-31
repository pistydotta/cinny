import { useEffect, useState } from 'react';
import { atom, useSetAtom } from 'jotai';
import { Room, RoomEvent, RoomStateEvent } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { Membership, StateEvent } from '../../../types/matrix/room';
import { getSpaceChildren } from '../../utils/room';
import { AutoJoinState, HierarchyRoom, roomsToAutoJoin, shouldSkipAutoJoin } from './spaceAutoJoin';

const PAGE_SIZE = 100;
const MAX_PAGES = 5;

// Rooms already tried this page load, so a failed join isn't retried in a loop.
const attempted = new Set<string>();

export const autoJoinAtom = atom<AutoJoinState>({
  checkedSpaces: new Set<string>(),
  awaiting: new Set<string>(),
});

// Joins every room of the space you're looking at that you may join, so its text and voice
// rooms all show in the sidebar. Rooms you were banned from are left alone.
export const useAutoJoinSpaceRooms = (space: Room): void => {
  const mx = useMatrixClient();
  const setState = useSetAtom(autoJoinAtom);
  const [childrenChanged, setChildrenChanged] = useState(0);

  useEffect(() => {
    const onState = (event: { getType: () => string; getRoomId: () => string | undefined }) => {
      if (event.getType() === StateEvent.SpaceChild && event.getRoomId() === space.roomId) {
        setChildrenChanged((n) => n + 1);
      }
    };
    // The cached state can say "joined" until the first sync says otherwise.
    const onMembership = (room: Room, membership: string) => {
      if (membership === Membership.Leave && getSpaceChildren(space).includes(room.roomId)) {
        setChildrenChanged((n) => n + 1);
      }
    };
    mx.on(RoomStateEvent.Events, onState);
    mx.on(RoomEvent.MyMembership, onMembership);
    return () => {
      mx.removeListener(RoomStateEvent.Events, onState);
      mx.removeListener(RoomEvent.MyMembership, onMembership);
    };
  }, [mx, space]);

  useEffect(() => {
    let alive = true;
    const skip = (roomId: string) =>
      shouldSkipAutoJoin(mx.getRoom(roomId)?.getMyMembership(), attempted.has(roomId));
    const finishedChecking = (toJoin: string[]) =>
      setState(({ checkedSpaces, awaiting }) => ({
        checkedSpaces: new Set([...checkedSpaces, space.roomId]),
        awaiting: new Set([...awaiting, ...toJoin]),
      }));
    // A room joined stays listed: the wait ends when the sync shows it, not when this answers.
    const gaveUp = (roomId: string) =>
      setState(({ checkedSpaces, awaiting }) => ({
        checkedSpaces,
        awaiting: new Set([...awaiting].filter((id) => id !== roomId)),
      }));

    (async () => {
      const rooms: HierarchyRoom[] = [];
      let from: string | undefined;
      for (let page = 0; page < MAX_PAGES; page += 1) {
        // eslint-disable-next-line no-await-in-loop
        const res = await mx.getRoomHierarchy(space.roomId, PAGE_SIZE, undefined, false, from);
        rooms.push(...(res.rooms as HierarchyRoom[]));
        from = res.next_batch;
        if (!from) break;
      }

      // One at a time: a sub-space before the rooms inside it.
      const toJoin = roomsToAutoJoin(rooms, space.roomId, skip);
      finishedChecking(toJoin.map(({ roomId }) => roomId));
      await toJoin.reduce(
        (previous, { roomId, via }) =>
          previous.then(async () => {
            if (!alive) return;
            attempted.add(roomId);
            await mx.joinRoom(roomId, { viaServers: via }).catch((e: unknown) => {
              // eslint-disable-next-line no-console
              console.warn(`Couldn't auto-join ${roomId}`, e);
              gaveUp(roomId);
            });
          }),
        Promise.resolve()
      );
    })().catch((e: unknown) => {
      // eslint-disable-next-line no-console
      console.warn("Couldn't read the space's rooms", e);
      finishedChecking([]);
    });

    return () => {
      alive = false;
    };
  }, [mx, setState, space.roomId, childrenChanged]);
};
