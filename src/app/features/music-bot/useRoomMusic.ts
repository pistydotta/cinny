import { useEffect, useMemo, useState } from 'react';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { createMusicApi } from './musicApi';
import { MusicSnapshot, watchMusicRoom } from './musicFeed';

export function useRoomMusic(roomId: string, listening = false) {
  const mx = useMatrixClient();
  const api = useMemo(() => createMusicApi(() => mx.getAccessToken()), [mx]);
  const [state, setState] = useState<{ roomId: string; snapshot: MusicSnapshot }>();
  useEffect(
    () => watchMusicRoom(api, roomId, (snapshot) => setState({ roomId, snapshot }), listening),
    [api, roomId, listening]
  );
  return { api, snapshot: state?.roomId === roomId ? state.snapshot : undefined };
}
