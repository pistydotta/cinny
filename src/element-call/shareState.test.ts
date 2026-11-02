import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// rxjs is only a transitive dependency here; it proves `changes` interoperates with the real thing.
// eslint-disable-next-line import/no-extraneous-dependencies
import { combineLatest, of } from 'rxjs';
import { createShareStore, wrapGetDisplayMedia } from './shareState';

// Same shape as the BehaviorSubjects in the Element Call bundle: subscribe(fn) emits the
// current value at once and returns { unsubscribe }.
const fakeSubject = <T>(initial: T) => {
  let value = initial;
  const listeners = new Set<(v: T) => void>();
  return {
    subscribe: (fn: (v: T) => void) => {
      listeners.add(fn);
      fn(value);
      return { unsubscribe: () => listeners.delete(fn) };
    },
    next: (v: T) => {
      value = v;
      listeners.forEach((fn) => fn(v));
    },
    count: () => listeners.size,
  };
};

const fakeVm = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  userId: '@alice:example.org',
  local: false,
  displayName$: fakeSubject('Alice'),
  audioEnabled$: fakeSubject(true),
  adjustPlaybackVolume: vi.fn(),
  commitPlaybackVolume: vi.fn(),
  ...extra,
});
type FakeVm = ReturnType<typeof fakeVm>;
const asVms = (vms: FakeVm[]) =>
  vms as unknown as Parameters<ReturnType<typeof createShareStore>['layoutShares']>[0];

const fakeTrack = (kind: string, label = '') =>
  Object.assign(new EventTarget(), { kind, label, enabled: true });
type FakeTrack = ReturnType<typeof fakeTrack>;

const fakeStream = (tracks: FakeTrack[]) =>
  ({
    getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
  } as unknown as MediaStream);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('remote shares', () => {
  it('hides remote shares until watched', () => {
    const store = createShareStore();
    const a = fakeVm('a');
    expect(store.layoutShares(asVms([a]))).toEqual([]);
    store.watch('a', 0.5);
    expect(store.layoutShares(asVms([a]))).toEqual([a]);
  });

  it('never shows the local share', () => {
    const store = createShareStore();
    const mine = fakeVm('me', { local: true });
    expect(store.layoutShares(asVms([mine]))).toEqual([]);
    store.watch('me', 1);
    expect(store.layoutShares(asVms([mine]))).toEqual([]);
  });

  it('keeps an unwatched share silent', () => {
    const store = createShareStore();
    const a = fakeVm('a');
    store.layoutShares(asVms([a]));
    expect(a.adjustPlaybackVolume).toHaveBeenCalledWith(0);
    expect(a.commitPlaybackVolume).toHaveBeenCalled();
  });

  it('plays at the given volume once watched, silent again after unwatch', () => {
    const store = createShareStore();
    const a = fakeVm('a');
    store.layoutShares(asVms([a]));
    store.watch('a', 0.5);
    expect(a.adjustPlaybackVolume).toHaveBeenLastCalledWith(0.5);
    store.unwatch('a');
    expect(a.adjustPlaybackVolume).toHaveBeenLastCalledWith(0);
    expect(a.commitPlaybackVolume).toHaveBeenCalledTimes(3);
  });

  it('muting silences without losing the volume', () => {
    const store = createShareStore();
    const a = fakeVm('a');
    store.layoutShares(asVms([a]));
    store.watch('a', 0.5);
    store.setMuted('a', true);
    expect(a.adjustPlaybackVolume).toHaveBeenLastCalledWith(0);
    store.setMuted('a', false);
    expect(a.adjustPlaybackVolume).toHaveBeenLastCalledWith(0.5);
    store.setVolume('a', 0.8);
    expect(a.adjustPlaybackVolume).toHaveBeenLastCalledWith(0.8);
  });

  it('describes remote shares in the snapshot', () => {
    const store = createShareStore();
    const a = fakeVm('a');
    store.layoutShares(asVms([a]));
    expect(store.getSnapshot().remotes).toEqual([
      {
        id: 'a',
        userId: '@alice:example.org',
        name: 'Alice',
        hasSound: true,
        watching: false,
        volume: 1,
        muted: false,
        decided: false,
      },
    ]);
    store.watch('a', 0.4);
    store.markDecided('a');
    a.displayName$.next('Alice B');
    a.audioEnabled$.next(false);
    expect(store.getSnapshot().remotes[0]).toMatchObject({
      name: 'Alice B',
      hasSound: false,
      watching: true,
      volume: 0.4,
      decided: true,
    });
  });

  it('copes with a view model that has no audioEnabled$', () => {
    const store = createShareStore();
    const a = fakeVm('a', { audioEnabled$: undefined });
    store.layoutShares(asVms([a]));
    expect(store.getSnapshot().remotes[0].hasSound).toBe(false);
  });

  it('subscribes to the names once per view model and lets go when it leaves', () => {
    const store = createShareStore();
    const a = fakeVm('a');
    store.layoutShares(asVms([a]));
    store.layoutShares(asVms([a]));
    expect(a.displayName$.count()).toBe(1);
    expect(a.audioEnabled$.count()).toBe(1);
    store.layoutShares([]);
    expect(a.displayName$.count()).toBe(0);
    expect(a.audioEnabled$.count()).toBe(0);
  });

  it('keeps its state through a short drop', () => {
    const store = createShareStore();
    const a = fakeVm('a');
    store.layoutShares(asVms([a]));
    store.watch('a', 0.5);
    store.layoutShares([]);
    vi.advanceTimersByTime(10_000);
    const again = fakeVm('a');
    expect(store.layoutShares(asVms([again]))).toEqual([again]);
    expect(again.adjustPlaybackVolume).toHaveBeenLastCalledWith(0.5);
  });

  it('keeps a closed share closed through a short drop', () => {
    const store = createShareStore();
    store.layoutShares(asVms([fakeVm('a')]));
    store.markDecided('a');
    store.layoutShares([]);
    vi.advanceTimersByTime(10_000);
    store.layoutShares(asVms([fakeVm('a')]));
    expect(store.getSnapshot().remotes[0]).toMatchObject({ decided: true, watching: false });
  });

  it('forgets a share gone for more than 30s', () => {
    const store = createShareStore();
    store.layoutShares(asVms([fakeVm('a')]));
    store.watch('a', 0.5);
    store.markDecided('a');
    store.layoutShares([]);
    vi.advanceTimersByTime(31_000);
    const again = fakeVm('a');
    expect(store.layoutShares(asVms([again]))).toEqual([]);
    expect(store.getSnapshot().remotes[0]).toMatchObject({ decided: false, watching: false });
    expect(again.adjustPlaybackVolume).toHaveBeenLastCalledWith(0);
  });

  it('leaves a gone share out of the snapshot', () => {
    const store = createShareStore();
    store.layoutShares(asVms([fakeVm('a')]));
    store.layoutShares([]);
    expect(store.getSnapshot().remotes).toEqual([]);
  });
});

describe('snapshot and subscribe', () => {
  it('returns the same snapshot object until something changes', () => {
    const store = createShareStore();
    const a = fakeVm('a');
    store.layoutShares(asVms([a]));
    const first = store.getSnapshot();
    store.layoutShares(asVms([a]));
    expect(store.getSnapshot()).toBe(first);
    store.watch('a', 0.5);
    expect(store.getSnapshot()).not.toBe(first);
  });

  it('notifies listeners only when the snapshot changed, and stops after unsubscribe', () => {
    const store = createShareStore();
    const a = fakeVm('a');
    const listener = vi.fn();
    const off = store.subscribe(listener);
    store.layoutShares(asVms([a]));
    expect(listener).toHaveBeenCalledTimes(1);
    store.layoutShares(asVms([a]));
    expect(listener).toHaveBeenCalledTimes(1);
    store.watch('a', 0.5);
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    store.unwatch('a');
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('changes', () => {
  it('emits once at once on subscribe, then on watch and unwatch', () => {
    const store = createShareStore();
    store.layoutShares(asVms([fakeVm('a')]));
    const next = vi.fn();
    store.changes.subscribe(next);
    expect(next).toHaveBeenCalledTimes(1);
    store.watch('a', 0.5);
    expect(next).toHaveBeenCalledTimes(2);
    store.unwatch('a');
    expect(next).toHaveBeenCalledTimes(3);
  });

  it('accepts an observer object or a plain function, and returns { unsubscribe }', () => {
    const store = createShareStore();
    store.layoutShares(asVms([fakeVm('a')]));
    const next = vi.fn();
    const fn = vi.fn();
    const sub = store.changes.subscribe({ next });
    const subFn = store.changes.subscribe(fn);
    expect(next).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledTimes(1);
    sub.unsubscribe();
    subFn.unsubscribe();
    store.watch('a', 1);
    expect(next).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('exposes the interop key RxJS looks up, returning itself', () => {
    const store = createShareStore();
    const changes = store.changes as unknown as Record<string | symbol, () => unknown>;
    expect(changes['@@observable']()).toBe(changes);
    const symbolObservable = (Symbol as unknown as { observable?: symbol }).observable;
    if (symbolObservable) expect(changes[symbolObservable]()).toBe(changes);
  });

  it('works with combineLatest and emits at once, so the layout is not blanked', () => {
    const store = createShareStore();
    store.layoutShares(asVms([fakeVm('a')]));
    const seen: unknown[] = [];
    const sub = combineLatest([of('vms'), store.changes as never]).subscribe((v) => seen.push(v));
    expect(seen).toHaveLength(1);
    store.watch('a', 0.5);
    expect(seen).toHaveLength(2);
    sub.unsubscribe();
    store.unwatch('a');
    expect(seen).toHaveLength(2);
  });

  it('never emits from layoutShares, which would loop through the pipeline', () => {
    const store = createShareStore();
    const next = vi.fn();
    store.changes.subscribe(next);
    next.mockClear();
    const a = fakeVm('a');
    store.layoutShares(asVms([a]));
    store.watch('a', 0.5);
    next.mockClear();
    a.displayName$.next('Other');
    store.layoutShares(asVms([a]));
    store.layoutShares(asVms([fakeVm('b'), a]));
    store.layoutShares([]);
    vi.advanceTimersByTime(31_000);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('local share', () => {
  const setup = () => {
    const store = createShareStore();
    const video = fakeTrack('video', 'Screen 1');
    const audio = fakeTrack('audio', 'System audio');
    return { store, video, audio };
  };

  it('describes the stream in the snapshot', () => {
    const { store, video, audio } = setup();
    store.setLocalStream(fakeStream([video, audio]));
    expect(store.getSnapshot().local).toEqual({
      name: 'Screen 1',
      hasSound: true,
      soundOn: true,
      videoTrack: video,
    });
  });

  it('sound toggle sets track.enabled', () => {
    const { store, video, audio } = setup();
    store.setLocalStream(fakeStream([video, audio]));
    store.setLocalSound(false);
    expect(audio.enabled).toBe(false);
    expect(store.getSnapshot().local?.soundOn).toBe(false);
    store.setLocalSound(true);
    expect(audio.enabled).toBe(true);
    expect(store.getSnapshot().local?.soundOn).toBe(true);
  });

  it('reports no sound for a video-only stream', () => {
    const { store, video } = setup();
    store.setLocalStream(fakeStream([video]));
    expect(store.getSnapshot().local).toMatchObject({ hasSound: false, soundOn: false });
    store.setLocalSound(true);
    expect(store.getSnapshot().local?.soundOn).toBe(false);
  });

  it('clears the local share when its track ends', () => {
    const { store, video, audio } = setup();
    const listener = vi.fn();
    store.setLocalStream(fakeStream([video, audio]));
    store.subscribe(listener);
    video.dispatchEvent(new Event('ended'));
    expect(store.getSnapshot().local).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('ignores the ended event of a replaced stream', () => {
    const { store, video } = setup();
    store.setLocalStream(fakeStream([video]));
    const next = fakeTrack('video', 'Screen 2');
    store.setLocalStream(fakeStream([next]));
    video.dispatchEvent(new Event('ended'));
    expect(store.getSnapshot().local?.name).toBe('Screen 2');
  });

  it('clears the local share when its vm goes away without an ended event', () => {
    const { store, video } = setup();
    const mine = fakeVm('me', { local: true });
    store.setLocalStream(fakeStream([video]));
    store.layoutShares(asVms([mine]));
    expect(store.getSnapshot().local).not.toBeNull();
    store.layoutShares([]);
    expect(store.getSnapshot().local).toBeNull();
  });

  it('keeps the local share while its vm has not shown up yet', () => {
    const { store, video } = setup();
    store.setLocalStream(fakeStream([video]));
    store.layoutShares([]);
    expect(store.getSnapshot().local).not.toBeNull();
  });
});

describe('wrapGetDisplayMedia', () => {
  it('returns the same stream the original gave', async () => {
    const store = createShareStore();
    const stream = fakeStream([fakeTrack('video', 'Screen 1')]);
    const mediaDevices = { getDisplayMedia: vi.fn().mockResolvedValue(stream) };
    wrapGetDisplayMedia(mediaDevices as never, store);
    await expect(mediaDevices.getDisplayMedia({ video: true })).resolves.toBe(stream);
    expect(store.getSnapshot().local?.name).toBe('Screen 1');
  });

  it('a failed getDisplayMedia leaves the state alone and rethrows', async () => {
    const store = createShareStore();
    const error = new Error('denied');
    const mediaDevices = { getDisplayMedia: vi.fn().mockRejectedValue(error) };
    wrapGetDisplayMedia(mediaDevices as never, store);
    const before = store.getSnapshot();
    await expect(mediaDevices.getDisplayMedia()).rejects.toBe(error);
    expect(store.getSnapshot()).toBe(before);
  });
});
