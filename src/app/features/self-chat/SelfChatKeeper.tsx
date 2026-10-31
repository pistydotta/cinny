import { useEffect, useState } from 'react';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useUserProfile } from '../../hooks/useUserProfile';
import { ensureSelfChat, syncSelfChatProfile } from './selfChatRoom';

// Everyone has a chat with themselves, showing their current name and photo. A failure just waits
// for the next visit: nothing here is urgent enough to bother anyone with.
export function SelfChatKeeper() {
  const mx = useMatrixClient();
  const { displayName, avatarUrl } = useUserProfile(mx.getSafeUserId());
  const [roomId, setRoomId] = useState<string>();

  useEffect(() => {
    let alive = true;
    ensureSelfChat(mx)
      .then((id) => {
        if (alive) setRoomId(id);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [mx]);

  useEffect(() => {
    if (roomId) syncSelfChatProfile(mx, roomId).catch(() => undefined);
  }, [mx, roomId, displayName, avatarUrl]);

  return null;
}
