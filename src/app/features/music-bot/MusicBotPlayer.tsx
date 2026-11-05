import React, { useEffect, useMemo, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { CallEmbed, useCallControlState } from '../../plugins/call';
import { musicPlaybackAtom, musicSoundAtom, musicVolumeAtom, musicTargetAtom } from './musicState';
import { useRoomMusic } from './useRoomMusic';
import { createMusicAudio, onMusicPlaybackRequest } from './musicAudio';

function MusicSync({ roomId, sound }: { roomId: string; sound: boolean }) {
  const volume = useAtomValue(musicVolumeAtom);
  const setPlayback = useSetAtom(musicPlaybackAtom);
  const setSound = useSetAtom(musicSoundAtom);
  const { api, snapshot } = useRoomMusic(roomId, true);
  const audio = useMemo(() => new Audio(), []);
  const controller = useRef<ReturnType<typeof createMusicAudio>>();
  const latest = useRef(snapshot);
  latest.current = snapshot;

  useEffect(() => {
    const player = createMusicAudio(audio, (status) => setPlayback({ roomId, status }));
    controller.current = player;
    const unsubscribe = onMusicPlaybackRequest(() => player.retry());
    return () => {
      unsubscribe();
      controller.current = undefined;
      player.dispose();
      setPlayback(undefined);
    };
  }, [audio, roomId, setPlayback]);
  useEffect(() => {
    controller.current?.follow(
      snapshot?.view?.nowPlaying ?? null,
      snapshot?.receivedAt ?? 0,
      snapshot?.connected ?? false
    );
  }, [snapshot]);
  useEffect(() => {
    audio.volume = volume;
    audio.muted = !sound;
    setSound(sound);
  }, [audio, volume, sound, setSound]);
  useEffect(() => {
    const onEnded = () => {
      const trackId = latest.current?.view?.nowPlaying?.id;
      if (trackId) api.ended(roomId, trackId).catch(() => undefined);
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [api, audio, roomId]);
  return null;
}

function CallMusic({ callEmbed, roomId }: { callEmbed: CallEmbed; roomId: string }) {
  const { sound } = useCallControlState(callEmbed.control);
  return <MusicSync key={roomId} roomId={roomId} sound={sound} />;
}

/** Exactly one player, for either the private queue or the explicitly selected voice room. */
export function MusicBotPlayer({ callEmbed, joined }: { callEmbed?: CallEmbed; joined: boolean }) {
  const target = useAtomValue(musicTargetAtom);
  const roomId = joined ? target : 'personal';
  if (callEmbed && joined) return <CallMusic callEmbed={callEmbed} roomId={roomId} />;
  return <MusicSync key={roomId} roomId={roomId} sound />;
}
