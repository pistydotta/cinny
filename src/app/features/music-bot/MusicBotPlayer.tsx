import React, { useEffect, useMemo, useRef } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { CallEmbed, useCallControlState } from '../../plugins/call';
import { createMusicApi, onMusicChange, NowPlaying } from './musicApi';
import { musicSnapshotAtom, musicVolumeAtom } from './musicState';
import { expectedPosition, POLL_MS, shouldSeek } from './musicSync';

// Puts the audio element where the room's music is: the right song, at the right second.
const follow = (audio: HTMLAudioElement, np: NowPlaying | null, receivedAt: number) => {
  const target = audio;
  if (!np?.audio) {
    if (!target.paused) target.pause();
    if (target.getAttribute('src')) {
      target.removeAttribute('src');
      target.dataset.track = '';
      target.load();
    }
    return;
  }
  const expected = expectedPosition(np, receivedAt, performance.now());
  if (target.dataset.track !== np.id) {
    target.dataset.track = np.id;
    target.src = np.audio;
    target.currentTime = expected;
  } else if (shouldSeek(target.currentTime, expected)) {
    target.currentTime = expected;
  }
  if (np.paused) target.pause();
  // A refused play (autoplay rules) is tried again at the next poll.
  else if (target.paused) target.play().catch(() => undefined);
};

function MusicSync({ callEmbed }: { callEmbed: CallEmbed }) {
  const mx = useMatrixClient();
  const { roomId } = callEmbed;
  const { sound } = useCallControlState(callEmbed.control);
  const volume = useAtomValue(musicVolumeAtom);
  const [snapshot, setSnapshot] = useAtom(musicSnapshotAtom);
  const api = useMemo(() => createMusicApi(() => mx.getAccessToken()), [mx]);
  const audio = useMemo(() => {
    const element = new Audio();
    element.preload = 'auto';
    return element;
  }, []);
  // A poll that left before a change answers with the room as it was: it must not undo the change.
  const changedAt = useRef(0);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      const sentAt = performance.now();
      try {
        const view = await api.get(roomId);
        if (alive && sentAt >= changedAt.current) {
          setSnapshot({ roomId, view, receivedAt: performance.now() });
        }
      } catch {
        // Kept as it was until the next poll.
      }
    };
    poll();
    const timer = window.setInterval(poll, POLL_MS);
    const unsubscribe = onMusicChange((changedRoom, view) => {
      if (changedRoom !== roomId) return;
      changedAt.current = performance.now();
      setSnapshot({ roomId, view, receivedAt: performance.now() });
    });
    return () => {
      alive = false;
      window.clearInterval(timer);
      unsubscribe();
      setSnapshot(undefined);
    };
  }, [api, roomId, setSnapshot]);

  useEffect(() => {
    if (snapshot?.roomId !== roomId) return;
    follow(audio, snapshot.view.nowPlaying, snapshot.receivedAt);
  }, [audio, roomId, snapshot]);

  useEffect(() => {
    audio.volume = volume;
    audio.muted = !sound;
  }, [audio, volume, sound]);

  useEffect(() => {
    const onEnded = () => {
      const trackId = audio.dataset.track;
      if (trackId) api.ended(roomId, trackId).catch(() => undefined);
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [api, audio, roomId]);

  useEffect(
    () => () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    },
    [audio]
  );

  return null;
}

/** Plays the music bot of the call this app is in. Mounted once, beside the call itself. */
export function MusicBotPlayer({ callEmbed, joined }: { callEmbed?: CallEmbed; joined: boolean }) {
  if (!callEmbed || !joined) return null;
  return <MusicSync key={callEmbed.roomId} callEmbed={callEmbed} />;
}
