import React, { useEffect, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { ApiError } from '../../utils/blazeroomApi';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoom } from '../../hooks/useRoom';
import { getMemberDisplayName } from '../../utils/room';
import { musicPlaybackAtom, musicSoundAtom, musicVolumeAtom } from './musicState';
import { onMusicError } from './musicApi';
import { musicErrorText } from './musicSync';
import { useRoomMusic } from './useRoomMusic';
import { useCallEmbed, useCallJoined } from '../../hooks/useCallEmbed';
import { musicRequestPending, watchMusicActivity } from './musicActivity';
import { queueMusic } from './musicChat';
import { MusicPanel } from './MusicPanel';

export function MusicBotBar({
  chat = false,
  canPost = true,
}: {
  chat?: boolean;
  canPost?: boolean;
}) {
  const mx = useMatrixClient();
  const room = useRoom();
  const { api, snapshot } = useRoomMusic(room.roomId);
  const call = useCallEmbed();
  const joined = useCallJoined(call);
  const listening = joined && call?.roomId === room.roomId;
  const playback = useAtomValue(musicPlaybackAtom);
  const sound = useAtomValue(musicSoundAtom);
  const [volume, setVolume] = useAtom(musicVolumeAtom);
  const [pending, setPending] = useState(() => musicRequestPending(room.roomId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(
    () =>
      onMusicError((roomId, e) => {
        if (roomId === room.roomId) setError(musicErrorText(e));
      }),
    [room.roomId]
  );
  useEffect(
    () =>
      watchMusicActivity((roomId, active) => {
        if (roomId === room.roomId) {
          setPending(active);
          if (active) setError(undefined);
        }
      }),
    [room.roomId]
  );
  const act = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (e) {
      setError(musicErrorText(e));
    } finally {
      setBusy(false);
    }
  };
  const failed = snapshot?.view?.lastError;
  return (
    <MusicPanel
      chat={chat}
      canPost={canPost}
      snapshot={snapshot}
      listening={listening}
      playback={playback && playback.roomId === room.roomId ? playback.status : 'idle'}
      deafened={listening && !sound}
      volume={volume}
      setVolume={setVolume}
      pending={pending}
      busy={busy}
      error={
        error ??
        (failed ? `${failed.title}: ${musicErrorText(new ApiError(failed.code, 422))}` : undefined)
      }
      nameOf={(id) => getMemberDisplayName(room, id) ?? id}
      add={async (query) => {
        setError(undefined);
        try {
          await queueMusic(api, room.roomId, query, (body) => mx.sendNotice(room.roomId, body));
          return true;
        } catch (e) {
          setError(musicErrorText(e));
          return false;
        }
      }}
      control={(action) => act(() => api[action](room.roomId))}
      remove={(id) => act(() => api.remove(room.roomId, id))}
    />
  );
}
