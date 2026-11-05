import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMusicAudio } from './musicAudio';
import type { NowPlaying } from './musicApi';

const song = (over: Partial<NowPlaying> = {}): NowPlaying => ({
  id: 'a',
  title: 'Song',
  url: 'https://youtu.be/a',
  duration: 180,
  thumbnail: null,
  requestedBy: '@a:test',
  status: 'ready',
  audio: '/api/music/audio/private',
  position: 20,
  paused: false,
  ...over,
});
const fakeAudio = () => {
  const events = new EventTarget();
  const audio = {
    src: '',
    currentTime: 0,
    readyState: 0,
    paused: true,
    play: vi.fn(async () => {
      audio.paused = false;
    }),
    pause: vi.fn(() => {
      audio.paused = true;
    }),
    load: vi.fn(),
    removeAttribute: vi.fn(),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    emit: (name: string) => events.dispatchEvent(new Event(name)),
  };
  return audio;
};
afterEach(() => vi.restoreAllMocks());

describe('browser music playback', () => {
  it('waits for metadata to seek a late joiner, then follows room pause and resume', async () => {
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    const audio = fakeAudio();
    const report = vi.fn();
    const player = createMusicAudio(audio, report);
    player.follow(song(), 1000);
    await Promise.resolve();
    expect(audio.currentTime).toBe(0);
    audio.readyState = 1;
    audio.emit('loadedmetadata');
    expect(audio.currentTime).toBe(20);
    player.follow(song({ paused: true }), 1000);
    expect(audio.paused).toBe(true);
    expect(report).toHaveBeenLastCalledWith('paused');
    player.follow(song(), 1000);
    await Promise.resolve();
    expect(audio.paused).toBe(false);
    player.dispose();
  });
  it('shows autoplay rejection and retries inside an explicit user gesture', async () => {
    const audio = fakeAudio();
    audio.play.mockRejectedValueOnce(Object.assign(new Error(), { name: 'NotAllowedError' }));
    const report = vi.fn();
    const player = createMusicAudio(audio, report);
    player.follow(song(), performance.now());
    await Promise.resolve();
    await Promise.resolve();
    expect(report).toHaveBeenLastCalledWith('blocked');
    player.follow(song(), performance.now());
    expect(audio.play).toHaveBeenCalledTimes(1);
    player.retry();
    expect(audio.play).toHaveBeenCalledTimes(2);
    player.dispose();
  });
  it('does not let a stale play rejection mark the next song as broken', async () => {
    const audio = fakeAudio();
    let reject!: (reason: Error) => void;
    audio.play.mockImplementationOnce(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        })
    );
    const report = vi.fn();
    const player = createMusicAudio(audio, report);
    player.follow(song(), performance.now());
    player.follow(song({ id: 'b', audio: '/api/music/audio/b' }), performance.now());
    reject(Object.assign(new Error(), { name: 'NotAllowedError' }));
    await Promise.resolve();
    expect(report).not.toHaveBeenCalledWith('blocked');
    player.dispose();
  });
  it('pauses during connection loss and stops on call teardown without changing the room queue', () => {
    const audio = fakeAudio();
    const player = createMusicAudio(audio, vi.fn());
    player.follow(song(), performance.now());
    player.follow(song(), performance.now(), false);
    expect(audio.paused).toBe(true);
    player.dispose();
    expect(audio.removeAttribute).toHaveBeenCalledWith('src');
    expect(audio.paused).toBe(true);
  });
});
