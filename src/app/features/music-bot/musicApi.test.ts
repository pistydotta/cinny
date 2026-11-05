import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../utils/blazeroomApi';
import { createMusicApi, MusicView } from './musicApi';

const VIEW: MusicView = { version: 1, nowPlaying: null, queue: [] };

const fakeFetch = (status = 200, body: unknown = VIEW) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe('createMusicApi', () => {
  it('lets chat observe without keeping an unattended call queue alive', async () => {
    const fetchImpl = fakeFetch();
    const api = createMusicApi(() => 'tok', fetchImpl);
    await api.get('!r:x', false);
    const calls = fetchImpl.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0][0]).toBe('/api/music/rooms/!r%3Ax?observe=1');
  });
  it('asks for the room with the token, without publishing', async () => {
    const fetchImpl = fakeFetch();
    const publish = vi.fn();
    const api = createMusicApi(() => 'tok', fetchImpl, publish);
    expect(await api.get('!r:x')).toEqual(VIEW);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/music/rooms/!r%3Ax');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(publish).not.toHaveBeenCalled();
  });

  it('publishes every change', async () => {
    const fetchImpl = fakeFetch();
    const publish = vi.fn();
    const api = createMusicApi(() => 'tok', fetchImpl, publish);
    await api.add('!r:x', 'lofi');
    await api.skip('!r:x');
    await api.remove('!r:x', 't/1');
    const calls = fetchImpl.mock.calls as unknown as [string, RequestInit][];
    expect(calls.map(([url, init]) => `${init.method} ${url}`)).toEqual([
      'POST /api/music/rooms/!r%3Ax/queue',
      'POST /api/music/rooms/!r%3Ax/skip',
      'DELETE /api/music/rooms/!r%3Ax/queue/t%2F1',
    ]);
    expect(calls[0][1].body).toBe(JSON.stringify({ query: 'lofi' }));
    expect(publish).toHaveBeenCalledTimes(3);
    expect(publish).toHaveBeenCalledWith('!r:x', VIEW);
  });

  it('rejects with the server error', async () => {
    const api = createMusicApi(() => 'tok', fakeFetch(400, { error: 'unsupported_link' }), vi.fn());
    await expect(api.add('!r:x', 'http://x')).rejects.toEqual(
      new ApiError('unsupported_link', 400)
    );
  });
});
