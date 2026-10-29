import { useCallback } from 'react';
import { MatrixError } from 'matrix-js-sdk/lib/http-api/errors';
import { Preset, Visibility } from 'matrix-js-sdk/lib/@types/partials';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useAsyncCallback } from '../../hooks/useAsyncCallback';
import { createRoomEncryptionState } from '../../components/create-room';
import { addRoomIdToMDirect, getDMRoomFor } from '../../utils/matrix';
import { useDirectRooms } from '../../pages/client/direct/useDirectRooms';
import { pickChatTarget } from './newChat';

// Your DM with someone, if you have one.
export const useFindDM = () => {
  const mx = useMatrixClient();
  const directs = useDirectRooms();

  return useCallback(
    (userId: string) => {
      const roomId = getDMRoomFor(mx, userId)?.roomId;
      return roomId && directs.includes(roomId) ? roomId : undefined;
    },
    [mx, directs]
  );
};

// Opens your DM with one person, or creates it; with two or more people, creates a group chat.
// Resolves to the room to open.
export const useStartChat = () => {
  const mx = useMatrixClient();
  const findDM = useFindDM();

  return useAsyncCallback<string, Error | MatrixError, [string[], string | undefined]>(
    useCallback(
      async (userIds, name) => {
        const target = pickChatTarget(userIds, findDM);
        if (!target) throw new Error('Pick at least one friend.');
        if (target.kind === 'open') return target.roomId;

        const groupName = target.invite.length > 1 ? name?.trim() : undefined;
        const result = await mx.createRoom({
          is_direct: true,
          invite: target.invite,
          name: groupName || undefined,
          visibility: Visibility.Private,
          // Same as Cinny's DMs: everyone is admin, so anyone can start a call in it.
          preset: Preset.TrustedPrivateChat,
          initial_state: [createRoomEncryptionState()],
        });
        // m.direct maps a room to one person; a group goes under the first one so it's listed with DMs.
        await addRoomIdToMDirect(mx, result.room_id, target.invite[0]);
        return result.room_id;
      },
      [mx, findDM]
    )
  );
};
