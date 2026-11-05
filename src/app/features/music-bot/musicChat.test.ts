import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../utils/blazeroomApi';
import { createMusicApi, onMusicError } from './musicApi';
import { musicRequestMessage, queueMusic } from './musicChat';
import { musicRequestPending } from './musicActivity';

const track = {
  id: 'a',
  title: 'Test song',
  url: 'https://youtu.be/a',
  duration: 90,
  thumbnail: null,
  requestedBy: '@a:test',
  status: 'loading' as const,
};
describe('music requests from chat and controls', () => {
  it('confirms the title and public link without exposing the private playback URL', async () => {
    const api = createMusicApi(
      () => 'test',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              version: 1,
              added: [track],
              nowPlaying: { ...track, audio: '/api/music/audio/private' },
              queue: [],
            })
          )
      )
    );
    const send = vi.fn<(body: string) => Promise<void>>().mockResolvedValue(undefined);
    await queueMusic(api, '!r:test', ' test song ', send);
    expect(send).toHaveBeenCalledWith(expect.stringContaining('Test song'));
    expect(send.mock.calls[0][0]).not.toContain('/api/music/audio/');
    expect(musicRequestPending('!r:test')).toBe(false);
    expect(musicRequestMessage([track, track])).toContain('1 more');
  });
  it('rejects empty /play and API failures without claiming a song was queued', async () => {
    const fetch = vi.fn(
      async () => new Response(JSON.stringify({ error: 'source_blocked' }), { status: 422 })
    );
    const api = createMusicApi(() => 'test', fetch);
    const send = vi.fn(async () => undefined);
    await expect(queueMusic(api, '!r:test', '', send)).rejects.toEqual(
      new ApiError('invalid_query', 400)
    );
    expect(fetch).not.toHaveBeenCalled();
    await expect(queueMusic(api, '!r:test', 'song', send)).rejects.toEqual(
      new ApiError('source_blocked', 422)
    );
    expect(send).not.toHaveBeenCalled();
    expect(musicRequestPending('!r:test')).toBe(false);
  });
  it('does not repeat the music request when posting its confirmation fails', async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            version: 1,
            added: [track],
            nowPlaying: null,
            queue: [],
          })
        )
    );
    const api = createMusicApi(() => 'test', fetch);
    const error = vi.fn();
    const off = onMusicError(error);
    await queueMusic(api, '!r:test', 'song', async () => {
      throw new Error();
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('!r:test', new ApiError('chat_failed', 0));
    off();
  });
});
