import React, { FormEventHandler, useEffect, useMemo, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Box, Button, color, Icon, Icons, Input, Scroll, Spinner, Text } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoom } from '../../hooks/useRoom';
import { getMemberDisplayName } from '../../utils/room';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';
import { createMusicApi, MusicTrack, onMusicError } from './musicApi';
import { musicSnapshotAtom, musicVolumeAtom } from './musicState';
import { expectedPosition, formatTime, musicErrorText } from './musicSync';
import * as css from './musicBot.css';

const useTick = (active: boolean) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
};

/** The music bot of the call: what's playing, the queue, and a box to add songs. */
export function MusicBotBar() {
  const mx = useMatrixClient();
  const room = useRoom();
  const snapshot = useAtomValue(musicSnapshotAtom);
  const [volume, setVolume] = useAtom(musicVolumeAtom);
  const api = useMemo(() => createMusicApi(() => mx.getAccessToken()), [mx]);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string>();
  const [showQueue, setShowQueue] = useState(false);

  const view = snapshot?.roomId === room.roomId ? snapshot.view : undefined;
  const np = view?.nowPlaying ?? null;
  const queue = view?.queue ?? [];
  useTick(!!np && !np.paused);

  useEffect(
    () =>
      onMusicError((roomId, e) => {
        if (roomId === room.roomId) setError(musicErrorText(e));
      }),
    [room.roomId]
  );

  const nameOf = (userId: string) => getMemberDisplayName(room, userId) ?? userId;

  const act = (action: () => Promise<unknown>) => {
    setError(undefined);
    action().catch((e) => setError(musicErrorText(e)));
  };

  const handleAdd: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const text = query.trim();
    if (!text || adding) return;
    setAdding(true);
    setError(undefined);
    api
      .add(room.roomId, text)
      .then(() => setQuery(''))
      .catch((e) => setError(musicErrorText(e)))
      .finally(() => setAdding(false));
  };

  const position =
    np && snapshot ? expectedPosition(np, snapshot.receivedAt, performance.now()) : 0;

  const renderQueueItem = (track: MusicTrack, index: number) => (
    <Box key={track.id} className={css.QueueItem} alignItems="Center" gap="200">
      <Text size="T200" priority="300" style={{ minWidth: '1.5em' }}>
        {index + 1}.
      </Text>
      <Box grow="Yes" direction="Column" style={{ minWidth: 0 }}>
        <Text size="T300" truncate>
          {track.title}
        </Text>
        <Text size="T200" priority="300" truncate>
          {formatTime(track.duration)} ·{' '}
          {tr('music_bot.requested_by', 'added by {{name}}', { name: nameOf(track.requestedBy) })}
        </Text>
      </Box>
      <TipIconButton
        size="300"
        radii="300"
        label={tr('music_bot.remove', 'Remove from queue')}
        onClick={() => act(() => api.remove(room.roomId, track.id))}
      >
        <Icon size="50" src={Icons.Cross} />
      </TipIconButton>
    </Box>
  );

  return (
    <Box className={css.Bar} direction="Column" gap="200">
      {np && (
        <Box alignItems="Center" gap="300">
          {np.thumbnail ? (
            <img className={css.Cover} src={np.thumbnail} alt="" referrerPolicy="no-referrer" />
          ) : (
            <span className={css.CoverIcon}>
              <Icon size="200" src={Icons.Headphone} />
            </span>
          )}
          <Box grow="Yes" direction="Column" style={{ minWidth: 0 }}>
            <Text size="T300" truncate>
              <a className={css.TitleLink} href={np.url} target="_blank" rel="noreferrer noopener">
                {np.title}
              </a>
            </Text>
            <Text size="T200" priority="300" truncate>
              {np.audio
                ? `${formatTime(position)} / ${formatTime(np.duration)} · ${tr(
                    'music_bot.requested_by',
                    'added by {{name}}',
                    { name: nameOf(np.requestedBy) }
                  )}`
                : tr('music_bot.loading', 'Getting the song...')}
            </Text>
          </Box>
          {np.audio && (
            <TipIconButton
              size="300"
              radii="300"
              label={np.paused ? tr('music_bot.resume', 'Resume') : tr('music_bot.pause', 'Pause')}
              onClick={() =>
                act(() => (np.paused ? api.resume(room.roomId) : api.pause(room.roomId)))
              }
            >
              <Icon size="100" src={np.paused ? Icons.Play : Icons.Pause} />
            </TipIconButton>
          )}
          <TipIconButton
            size="300"
            radii="300"
            label={tr('music_bot.skip', 'Skip')}
            onClick={() => act(() => api.skip(room.roomId))}
          >
            <Icon size="100" src={Icons.ArrowGoRight} />
          </TipIconButton>
          <TipIconButton
            size="300"
            radii="300"
            label={tr('music_bot.stop', 'Stop and clear the queue')}
            onClick={() => act(() => api.stop(room.roomId))}
          >
            <Icon size="100" src={Icons.Cross} />
          </TipIconButton>
        </Box>
      )}
      <Box as="form" onSubmit={handleAdd} alignItems="Center" gap="200" wrap="Wrap">
        <Box grow="Yes" style={{ minWidth: '12rem' }}>
          <Input
            size="300"
            radii="300"
            variant="Background"
            style={{ width: '100%' }}
            value={query}
            onChange={(evt) => setQuery(evt.currentTarget.value)}
            placeholder={tr(
              'music_bot.placeholder',
              'Music bot: paste a YouTube, Spotify or SoundCloud link, or a song name'
            )}
            before={<Icon size="50" src={Icons.Headphone} />}
            disabled={adding}
            maxLength={500}
          />
        </Box>
        <Button
          type="submit"
          size="300"
          radii="300"
          variant="Primary"
          disabled={adding || !query.trim()}
          before={adding ? <Spinner size="50" variant="Primary" fill="Solid" /> : undefined}
        >
          <Text size="B300">{tr('music_bot.play', 'Play')}</Text>
        </Button>
        {queue.length > 0 && (
          <TipIconButton
            size="300"
            radii="300"
            label={tr('music_bot.queue', 'Queue ({{count}})', { count: queue.length })}
            aria-pressed={showQueue}
            onClick={() => setShowQueue((s) => !s)}
          >
            <Icon size="100" src={Icons.OrderList} />
          </TipIconButton>
        )}
        <Icon size="100" src={Icons.VolumeHigh} />
        <input
          className={css.Volume}
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(evt) => setVolume(Number(evt.target.value))}
          aria-label={tr('music_bot.volume', 'Music volume')}
        />
      </Box>
      {error && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          {error}
        </Text>
      )}
      {showQueue && queue.length > 0 && (
        <Scroll className={css.Queue} size="300" hideTrack>
          <Box direction="Column" gap="100">
            {queue.map(renderQueueItem)}
          </Box>
        </Scroll>
      )}
    </Box>
  );
}
