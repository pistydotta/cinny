import React, { useEffect, useId, useState } from 'react';
import { Box, Icon, Icons, Text } from 'folds';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';
import type { MusicSnapshot } from './musicFeed';
import { expectedPosition, formatTime } from './musicSync';
import { PlaybackStatus, requestMusicPlayback } from './musicAudio';
import * as css from './musicBot.css';

const QUEUE_PREVIEW = 3;

type Props = {
  chat: boolean;
  canPost: boolean;
  snapshot?: MusicSnapshot;
  listening: boolean;
  playback: PlaybackStatus;
  deafened: boolean;
  volume: number;
  setVolume: (value: number) => void;
  pending: boolean;
  busy: boolean;
  error?: string;
  nameOf: (id: string) => string;
  add: (query: string) => Promise<boolean>;
  control: (action: 'skip' | 'pause' | 'resume' | 'stop') => Promise<void>;
  remove: (id: string) => Promise<void>;
};

/** Presentational controls: only MusicBotPlayer, mounted with the joined call, creates audio. */
export function MusicPanel(props: Props) {
  const {
    chat,
    canPost,
    snapshot,
    listening,
    playback,
    deafened,
    volume,
    setVolume,
    pending,
    busy,
    error,
    nameOf,
    add,
    control,
    remove,
  } = props;
  const [expanded, setExpanded] = useState(!chat);
  const [query, setQuery] = useState('');
  const [showQueue, setShowQueue] = useState(false);
  const panelId = useId();
  const volumeId = useId();
  const np = snapshot?.view?.nowPlaying;
  const queue = snapshot?.view?.queue ?? [];
  const connected = snapshot?.connected ?? false;
  const [, tick] = useState(0);
  useEffect(() => {
    if (!np?.audio || np.paused || !connected) return undefined;
    const timer = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(timer);
  }, [np?.audio, np?.paused, connected]);
  useEffect(() => {
    if (error || pending || (listening && (playback === 'blocked' || playback === 'error')))
      setExpanded(true);
  }, [error, pending, listening, playback]);
  const position =
    np && snapshot ? expectedPosition(np, snapshot.receivedAt, performance.now()) : 0;
  let status = tr('music_bot.empty', 'The queue is yours');
  if (np) status = tr('music_bot.now_playing', 'Now playing');
  if (np?.paused) status = tr('music_bot.paused', 'Paused');
  if (listening && playback === 'blocked') status = tr('music_bot.enable_audio', 'Enable audio');
  if (listening && playback === 'error') status = tr('music_bot.retry_audio', 'Retry audio');
  if (np && !np.audio) status = tr('music_bot.loading', 'Getting the song...');
  if (!connected) status = tr('music_bot.connecting', 'Connecting to music…');
  if (pending) status = tr('music_bot.searching', 'Finding your music…');
  let hint = tr('music_bot.muted', 'Your music volume is muted. Raise it to listen.');
  if (deafened)
    hint = tr('music_bot.deafened', 'You are deafened. Enable call sound to hear music.');
  if (!listening)
    hint = tr(
      'music_bot.join_hint',
      'Join this room’s voice call to hear the music. Requests here update its shared queue.'
    );
  let addLabel = np ? tr('music_bot.add', 'Add') : tr('music_bot.play', 'Play');
  if (pending) addLabel = tr('music_bot.searching_short', 'Finding…');
  const submit: React.FormEventHandler = async (event) => {
    event.preventDefault();
    const text = query.trim();
    if (!text || pending || !canPost) return;
    if (await add(text)) setQuery((current) => (current.trim() === text ? '' : current));
  };
  const shownQueue = showQueue ? queue : queue.slice(0, QUEUE_PREVIEW);
  const subtitle = np
    ? tr('music_bot.requested_by', 'added by {{name}}', { name: nameOf(np.requestedBy) })
    : tr('music_bot.invite', 'Pick a song for the voice call');
  // With nothing playing or going wrong, a small chip is enough; the full bar is for a live queue.
  const idle = !np && queue.length === 0 && !pending && !error && connected;
  if (idle && !expanded)
    return (
      <section className={css.ChipRow} aria-label={tr('music_bot.heading', 'Music')}>
        <button
          className={css.Chip}
          type="button"
          aria-expanded={false}
          title={subtitle}
          onClick={() => setExpanded(true)}
        >
          <Icon size="50" src={Icons.Headphone} />
          {tr('music_bot.heading', 'Music')}
        </button>
      </section>
    );
  return (
    <section className={np ? css.BarActive : css.Bar} aria-label={tr('music_bot.heading', 'Music')}>
      <button
        className={css.Toggle}
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className={css.BrandIcon}>
          <Icon size="100" src={Icons.Headphone} />
        </span>
        <span className={css.Summary}>
          <span className={css.SummaryTitle}>
            {np ? np.title : tr('music_bot.heading', 'Music')}
          </span>
          <span className={css.Eyebrow}>{np || !connected || pending ? status : subtitle}</span>
        </span>
        {queue.length > 0 && <span className={css.Count}>+{queue.length}</span>}
        <Icon size="50" src={expanded ? Icons.ChevronTop : Icons.ChevronBottom} />
      </button>
      {expanded && (
        <div id={panelId} className={css.Panel}>
          {np && (
            <div className={css.NowPlaying}>
              {np.thumbnail ? (
                <img className={css.Cover} src={np.thumbnail} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span className={css.CoverIcon}>
                  <Icon src={Icons.Headphone} />
                </span>
              )}
              <div className={css.TrackInfo}>
                <a
                  className={css.TitleLink}
                  href={np.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {np.title}
                </a>
                <Text size="T200" priority="300">
                  {subtitle}
                </Text>
                {np.audio ? (
                  <div className={css.ProgressRow}>
                    <span className={css.Timing}>{formatTime(position)}</span>
                    <progress
                      className={css.Progress}
                      value={position}
                      max={np.duration ?? Math.max(position, 1)}
                      aria-label={tr('music_bot.progress', 'Song progress')}
                    />
                    <span className={css.Timing}>{formatTime(np.duration)}</span>
                  </div>
                ) : (
                  <Text size="T200">{tr('music_bot.loading', 'Getting the song...')}</Text>
                )}
              </div>
              <div className={css.Controls}>
                <Box alignItems="Center" gap="100">
                  <TipIconButton
                    size="300"
                    radii="Pill"
                    variant="Primary"
                    label={
                      np.paused ? tr('music_bot.resume', 'Resume') : tr('music_bot.pause', 'Pause')
                    }
                    disabled={!connected || busy || !np.audio}
                    onClick={() => {
                      requestMusicPlayback();
                      control(np.paused ? 'resume' : 'pause');
                    }}
                  >
                    <Icon size="100" src={np.paused ? Icons.Play : Icons.Pause} />
                  </TipIconButton>
                  <TipIconButton
                    size="300"
                    radii="Pill"
                    label={tr('music_bot.skip', 'Skip')}
                    disabled={!connected || busy}
                    onClick={() => control('skip')}
                  >
                    <Icon size="100" src={Icons.ArrowGoRight} />
                  </TipIconButton>
                  <TipIconButton
                    size="300"
                    radii="Pill"
                    label={tr('music_bot.stop', 'Stop and clear the queue')}
                    disabled={!connected || busy}
                    onClick={() => control('stop')}
                  >
                    <Icon size="100" src={Icons.Cross} />
                  </TipIconButton>
                </Box>
                <label
                  className={css.VolumeLabel}
                  htmlFor={volumeId}
                  title={tr(
                    'music_bot.volume_tip',
                    'Your music volume. Only you hear this change.'
                  )}
                >
                  <Icon size="50" src={volume === 0 ? Icons.VolumeMute : Icons.VolumeHigh} />
                  <input
                    id={volumeId}
                    className={css.Volume}
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    aria-label={tr('music_bot.volume', 'Music volume')}
                  />
                </label>
              </div>
            </div>
          )}
          {listening &&
            np?.audio &&
            !np.paused &&
            (playback === 'blocked' || playback === 'error') && (
              <div className={css.Notice} role="status">
                <Text size="T200">
                  {playback === 'blocked'
                    ? tr('music_bot.autoplay', 'Your browser needs a click to play music.')
                    : tr(
                        'music_bot.audio_error',
                        'This device could not play the audio. Try reconnecting the player.'
                      )}
                </Text>
                <button className={css.PrimaryButton} type="button" onClick={requestMusicPlayback}>
                  {playback === 'blocked'
                    ? tr('music_bot.enable_audio', 'Enable audio')
                    : tr('music_bot.retry_audio', 'Retry audio')}
                </button>
              </div>
            )}
          {(!listening || deafened || (np && volume === 0)) && <p className={css.Hint}>{hint}</p>}
          <form className={css.InputRow} onSubmit={submit}>
            <input
              className={css.Search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tr(
                'music_bot.search_sources',
                'Song name or a YouTube, SoundCloud or Spotify link'
              )}
              aria-label={tr('music_bot.add_label', 'Add to the queue')}
              maxLength={500}
              disabled={pending || !canPost}
            />
            <button
              className={css.PrimaryButton}
              type="submit"
              disabled={pending || !canPost || !query.trim()}
            >
              {addLabel}
            </button>
          </form>
          {error && (
            <div className={css.Error} role="alert">
              {error}
            </div>
          )}
          {queue.length > 0 && (
            <div className={css.QueueBlock}>
              <span className={css.QueueHeading}>
                {tr('music_bot.up_next', 'Up next · {{count}}', { count: queue.length })}
              </span>
              <ol id={`${panelId}-queue`} className={css.Queue}>
                {shownQueue.map((track, index) => (
                  <li className={css.QueueItem} key={track.id}>
                    <span className={css.QueueNumber}>{index + 1}</span>
                    <span className={css.QueueTitle}>{track.title}</span>
                    <span className={css.QueueMeta}>
                      {formatTime(track.duration)} · {nameOf(track.requestedBy)}
                    </span>
                    <TipIconButton
                      size="300"
                      radii="Pill"
                      label={tr('music_bot.remove', 'Remove from queue')}
                      disabled={busy || !connected}
                      onClick={() => remove(track.id)}
                    >
                      <Icon size="50" src={Icons.Cross} />
                    </TipIconButton>
                  </li>
                ))}
              </ol>
              {queue.length > QUEUE_PREVIEW && (
                <button
                  className={css.QueueToggle}
                  type="button"
                  aria-expanded={showQueue}
                  aria-controls={`${panelId}-queue`}
                  onClick={() => setShowQueue((value) => !value)}
                >
                  {showQueue
                    ? tr('music_bot.show_less', 'Show less')
                    : tr('music_bot.show_all', 'Show all ({{count}})', { count: queue.length })}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
