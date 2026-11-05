import React, { useEffect, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { ApiError } from '../../utils/blazeroomApi';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getMemberDisplayName } from '../../utils/room';
import {
  musicPlaybackAtom,
  musicSoundAtom,
  musicVolumeAtom,
  musicTargetAtom,
  musicSharedCallAtom,
} from './musicState';
import { onMusicError } from './musicApi';
import { musicErrorText } from './musicSync';
import { useRoomMusic } from './useRoomMusic';
import { useCallEmbed, useCallJoined } from '../../hooks/useCallEmbed';
import { musicRequestPending, watchMusicActivity } from './musicActivity';
import { queueMusic } from './musicChat';
import { MusicAudience } from './MusicAudience';
import { MusicPanel } from './MusicPanel';

export function MusicBotBar() {
  const mx = useMatrixClient();
  const call = useCallEmbed();
  const joined = useCallJoined(call);
  const target = useAtomValue(musicTargetAtom);
  const roomId = joined ? target : 'personal';
  const setSharedCall = useAtom(musicSharedCallAtom)[1];
  const room = roomId === 'personal' ? undefined : mx.getRoom(roomId);
  const { api, snapshot } = useRoomMusic(roomId);
  const listening = true;
  const playback = useAtomValue(musicPlaybackAtom);
  const sound = useAtomValue(musicSoundAtom);
  const [volume, setVolume] = useAtom(musicVolumeAtom);
  const [pending, setPending] = useState(() => musicRequestPending(roomId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(
    () =>
      onMusicError((changedRoomId, e) => {
        if (changedRoomId === roomId) setError(musicErrorText(e));
      }),
    [roomId]
  );
  useEffect(
    () =>
      watchMusicActivity((changedRoomId, active) => {
        if (changedRoomId === roomId) {
          setPending(active);
          if (active) setError(undefined);
        }
      }),
    [roomId]
  );
  useEffect(() => {
    setPending(musicRequestPending(roomId));
    setError(undefined);
  }, [roomId]);
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
      audience={
        <MusicAudience
          shared={roomId !== 'personal'}
          roomName={joined ? call?.room.name : undefined}
          disabled={busy || pending}
          onToggle={() =>
            act(async () => {
              if (!joined || !call) return;
              if (roomId !== 'personal') {
                setSharedCall(undefined);
                return;
              }
              const current = snapshot?.view?.nowPlaying;
              if (current) {
                await api.add(call.roomId, current.url);
                await api.pause('personal');
              }
              setSharedCall(call);
            })
          }
        />
      }
      key={roomId}
      canPost
      snapshot={snapshot}
      listening={listening}
      playback={playback && playback.roomId === roomId ? playback.status : 'idle'}
      deafened={joined && !sound}
      volume={volume}
      setVolume={setVolume}
      pending={pending}
      busy={busy}
      error={
        error ??
        (failed ? `${failed.title}: ${musicErrorText(new ApiError(failed.code, 422))}` : undefined)
      }
      nameOf={(id) => (room ? getMemberDisplayName(room, id) : undefined) ?? id}
      add={async (query) => {
        setError(undefined);
        try {
          await queueMusic(api, roomId, query, (body) =>
            roomId === 'personal' ? Promise.resolve() : mx.sendNotice(roomId, body)
          );
          return true;
        } catch (e) {
          setError(musicErrorText(e));
          return false;
        }
      }}
      control={(action) => act(() => api[action](roomId))}
      remove={(id) => act(() => api.remove(roomId, id))}
    />
  );
}
