import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMusicApi, MusicApi, MusicView } from './musicApi';
import { createMusicFeed } from './musicFeed';

const view = (version: number): MusicView => ({ version, nowPlaying: null, queue: [] });
afterEach(() => vi.useRealTimers());
describe('shared music polling', () => {
  it('shares a single poll across call and chat, with only the call keeping music alive', async () => {
    vi.useFakeTimers();
    const api = { get: vi.fn(async () => view(1)) } as unknown as MusicApi;
    const watch = createMusicFeed(100);
    const a = vi.fn();
    const b = vi.fn();
    const stopChat = watch(api, '!r:test', a);
    const stopCall = watch(api, '!r:test', b, true);
    await vi.advanceTimersByTimeAsync(0);
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenLastCalledWith('!r:test', true);
    expect(a).toHaveBeenLastCalledWith(expect.objectContaining({ view: view(1), connected: true }));
    expect(b).toHaveBeenLastCalledWith(a.mock.calls.at(-1)?.[0]);
    stopCall();
    await vi.advanceTimersByTimeAsync(100);
    expect(api.get).toHaveBeenLastCalledWith('!r:test', false);
    stopChat();
    await vi.advanceTimersByTimeAsync(1000);
    expect(api.get).toHaveBeenCalledTimes(2);
  });
  it('does not overlap slow polls or let an old response undo a local command', async () => {
    vi.useFakeTimers();
    let resolve!: (value: MusicView) => void;
    const api = createMusicApi(
      () => 'test',
      vi.fn(async (_url, init) => {
        if (init?.method === 'GET')
          return new Promise<Response>((done) => {
            resolve = (body) => done(new Response(JSON.stringify(body)));
          });
        return new Response(JSON.stringify(view(2)));
      })
    );
    const listener = vi.fn();
    const stop = createMusicFeed(100)(api, '!r:test', listener);
    await vi.advanceTimersByTimeAsync(1000);
    await api.pause('!r:test');
    resolve(view(1));
    await vi.advanceTimersByTimeAsync(0);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ view: view(2) }));
    stop();
  });
  it('reports disconnection and recovers on the next poll', async () => {
    vi.useFakeTimers();
    const api = {
      get: vi.fn().mockRejectedValueOnce(new Error()).mockResolvedValue(view(2)),
    } as unknown as MusicApi;
    const listener = vi.fn();
    const stop = createMusicFeed(100)(api, '!r:test', listener);
    await vi.advanceTimersByTimeAsync(0);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ connected: false }));
    await vi.advanceTimersByTimeAsync(100);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ connected: true }));
    stop();
  });
  it('ignores an in-flight response after the last listener leaves', async () => {
    vi.useFakeTimers();
    let resolve!: (result: MusicView) => void;
    const api = {
      get: vi.fn(
        () =>
          new Promise<MusicView>((done) => {
            resolve = done;
          })
      ),
    } as unknown as MusicApi;
    const listener = vi.fn();
    const stop = createMusicFeed(100)(api, '!r:test', listener, true);
    await vi.advanceTimersByTimeAsync(0);
    stop();
    const calls = listener.mock.calls.length;
    resolve(view(3));
    await vi.advanceTimersByTimeAsync(1000);
    expect(listener).toHaveBeenCalledTimes(calls);
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
