import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { callCoveredRoomAtom } from './coveredRoom';

// Marks the room as covered by the call view while `covered`, so its messages still notify.
export const useCallCoveredRoom = (roomId: string, covered: boolean) => {
  const setCoveredRoom = useSetAtom(callCoveredRoomAtom);

  useEffect(() => {
    if (!covered) return undefined;
    setCoveredRoom(roomId);
    return () => setCoveredRoom((current) => (current === roomId ? undefined : current));
  }, [roomId, covered, setCoveredRoom]);
};
