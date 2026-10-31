import { useEffect } from 'react';
import { ClientEvent, SyncState } from 'matrix-js-sdk';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { Membership, StateEvent } from '../../../../types/matrix/room';
import { isOldPokerRoom } from './oldPokerRooms';

// Poker tables used to be Matrix rooms; the API owns them now. Leaves and forgets the old
// ones, rooms and invites, so they stop cluttering the room list. Remove this once people
// have had time to open the app (with oldPokerRooms.ts).
const PAUSE_MS = 500;

let started = false;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const useLeaveOldPokerRooms = (): void => {
  const mx = useMatrixClient();

  useEffect(() => {
    const run = async () => {
      if (started) return;
      // Not tied to the mount: it must finish even if the effect reruns.
      started = true;
      const old = mx
        .getRooms()
        .filter((room) =>
          isOldPokerRoom(room.currentState.getStateEvents(StateEvent.RoomCreate, '')?.getContent())
        );
      // One at a time, since someone may have several and Synapse rate-limits.
      // eslint-disable-next-line no-restricted-syntax
      for (const room of old) {
        const invited = room.getMyMembership() === Membership.Invite;
        // eslint-disable-next-line no-await-in-loop
        await mx.leave(room.roomId).catch(() => undefined);
        // An invite has no history to forget.
        if (!invited) {
          // eslint-disable-next-line no-await-in-loop
          await mx.forget(room.roomId).catch(() => undefined);
        }
        // eslint-disable-next-line no-await-in-loop
        await sleep(PAUSE_MS);
      }
    };

    if (mx.isInitialSyncComplete()) {
      run();
      return undefined;
    }
    const onSync = (state: SyncState) => {
      if (state !== SyncState.Syncing && state !== SyncState.Prepared) return;
      mx.removeListener(ClientEvent.Sync, onSync);
      run();
    };
    mx.on(ClientEvent.Sync, onSync);
    return () => {
      mx.removeListener(ClientEvent.Sync, onSync);
    };
  }, [mx]);
};
