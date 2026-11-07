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

// As with a real track, stop() ends it without firing the 'ended' event.
const fakeTrack = (kind: string, label = '') => {
  const track = Object.assign(new EventTarget(), {
    kind,
    label,
    enabled: true,
    readyState: 'live',
    stop: () => {
      track.readyState = 'ended';
    },
  });
  return track;
};
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

const fakePublication = () => {
  const publication = {
    isDesired: true,
    setSubscribed: vi.fn((on: boolean) => {
      publication.isDesired = on;
    }),
  };
  return publication;
};
type FakePublication = ReturnType<typeof fakePublication>;

// Same shape as LiveKit's RemoteParticipant, for what the store uses.
const fakeParticipant = (sources: Record<string, FakePublication>) => {
  const publications = new Map(Object.entries(sources));
  const listeners = new Set<() => void>();
  return {
    getTrackPublication: (source: string) => publications.get(source),
    on: (event: string, fn: () => void) => {
      if (event === 'trackPublished') listeners.add(fn);
    },
    off: (event: string, fn: () => void) => {
      if (event === 'trackPublished') listeners.delete(fn);
    },
    publish: (source: string, publication: FakePublication) => {
      publications.set(source, publication);
      listeners.forEach((fn) => fn());
    },
    listenerCount: () => listeners.size,
  };
};

const fakeShare = (id = 'a', withSound = true) => {
  const video = fakePublication();
  const sound = fakePublication();
  const participant = fakeParticipant({
    screen_share: video,
    ...(withSound ? { screen_share_audio: sound } : {}),
  });
  const video$ = fakeSubject<unknown>({ participant, publication: video, source: 'screen_share' });
  return { vm: fakeVm(id, { video$ }), video, sound, participant, video$ };
};

describe('remote share downloads', () => {
  it('subscribes to neither video nor sound while never watched', () => {
    const store = createShareStore();
    const { vm, video, sound } = fakeShare();
    store.layoutShares(asVms([vm]));
    expect(video.isDesired).toBe(false);
    expect(sound.isDesired).toBe(false);
  });

  it('subscribes to both on watch and to neither on unwatch', () => {
    const store = createShareStore();
    const { vm, video, sound } = fakeShare();
    store.layoutShares(asVms([vm]));
    store.watch('a', 0.5);
    expect(video.isDesired).toBe(true);
    expect(sound.isDesired).toBe(true);
    store.unwatch('a');
    expect(video.isDesired).toBe(false);
    expect(sound.isDesired).toBe(false);
  });

  it('sets the volume before subscribing, so the element attaches at the right value', () => {
    const store = createShareStore();
    const { vm, sound } = fakeShare();
    store.layoutShares(asVms([vm]));
    sound.setSubscribed.mockClear();
    vm.adjustPlaybackVolume.mockClear();
    store.watch('a', 0.5);
    expect(vm.adjustPlaybackVolume).toHaveBeenCalledWith(0.5);
    expect(vm.adjustPlaybackVolume.mock.invocationCallOrder[0]).toBeLessThan(
      sound.setSubscribed.mock.invocationCallOrder[0]
    );
  });

  it('muting only drops the sound, and unmuting brings it back', () => {
    const store = createShareStore();
    const { vm, video, sound } = fakeShare();
    store.layoutShares(asVms([vm]));
    store.watch('a', 0.5);
    store.setMuted('a', true);
    expect(video.isDesired).toBe(true);
    expect(sound.isDesired).toBe(false);
    store.setMuted('a', false);
    expect(video.isDesired).toBe(true);
    expect(sound.isDesired).toBe(true);
  });

  it('keeps a muted share muted when watched again', () => {
    const store = createShareStore();
    const { vm, video, sound } = fakeShare();
    store.layoutShares(asVms([vm]));
    store.watch('a', 0.5);
    store.setMuted('a', true);
    store.unwatch('a');
    store.watch('a', 0.5);
    expect(video.isDesired).toBe(true);
    expect(sound.isDesired).toBe(false);
  });

  it('leaves the sound unsubscribed at volume 0, keeping the video', () => {
    const store = createShareStore();
    const { vm, video, sound } = fakeShare();
    store.layoutShares(asVms([vm]));
    store.watch('a', 0);
    expect(video.isDesired).toBe(true);
    expect(sound.isDesired).toBe(false);
  });

  it('drops the sound when dragged to 0, and sets the volume first when raised', () => {
    const store = createShareStore();
    const { vm, sound } = fakeShare();
    store.layoutShares(asVms([vm]));
    store.watch('a', 0.5);
    store.setVolume('a', 0);
    expect(sound.isDesired).toBe(false);
    sound.setSubscribed.mockClear();
    vm.adjustPlaybackVolume.mockClear();
    store.setVolume('a', 0.5);
    expect(sound.isDesired).toBe(true);
    expect(vm.adjustPlaybackVolume).toHaveBeenCalledWith(0.5);
    expect(vm.adjustPlaybackVolume.mock.invocationCallOrder[0]).toBeLessThan(
      sound.setSubscribed.mock.invocationCallOrder[0]
    );
  });

  it('a late sound publication stays off at volume 0', () => {
    const store = createShareStore();
    const { vm, participant } = fakeShare('a', false);
    store.layoutShares(asVms([vm]));
    store.watch('a', 0);
    const late = fakePublication();
    participant.publish('screen_share_audio', late);
    expect(late.isDesired).toBe(false);
  });

  it('only calls setSubscribed when the wish changes', () => {
    const store = createShareStore();
    const { vm, video } = fakeShare();
    store.layoutShares(asVms([vm]));
    store.layoutShares(asVms([vm]));
    store.setVolume('a', 0.3);
    expect(video.setSubscribed).toHaveBeenCalledTimes(1);
  });

  it('a late sound publication follows the state: not watching', () => {
    const store = createShareStore();
    const { vm, participant } = fakeShare('a', false);
    store.layoutShares(asVms([vm]));
    const late = fakePublication();
    participant.publish('screen_share_audio', late);
    expect(late.isDesired).toBe(false);
  });

  it('a late sound publication follows the state: watching', () => {
    const store = createShareStore();
    const { vm, participant } = fakeShare('a', false);
    store.layoutShares(asVms([vm]));
    store.watch('a', 0.5);
    const late = fakePublication();
    participant.publish('screen_share_audio', late);
    expect(late.setSubscribed).not.toHaveBeenCalled();
    expect(late.isDesired).toBe(true);
  });

  it('a late sound publication follows the state: watching but muted', () => {
    const store = createShareStore();
    const { vm, participant } = fakeShare('a', false);
    store.layoutShares(asVms([vm]));
    store.watch('a', 0.5);
    store.setMuted('a', true);
    const late = fakePublication();
    participant.publish('screen_share_audio', late);
    expect(late.isDesired).toBe(false);
  });

  it('applies the rule when the participant shows up after the view model', () => {
    const store = createShareStore();
    const { vm, video, sound, video$, participant } = fakeShare();
    video$.next(undefined);
    store.layoutShares(asVms([vm]));
    expect(video.isDesired).toBe(true);
    video$.next({ participant, publication: video, source: 'screen_share' });
    expect(video.isDesired).toBe(false);
    expect(sound.isDesired).toBe(false);
  });

  it('lets go of the publication listener when the view model goes', () => {
    const store = createShareStore();
    const { vm, participant, video$ } = fakeShare();
    store.layoutShares(asVms([vm]));
    store.layoutShares(asVms([vm]));
    expect(participant.listenerCount()).toBe(1);
    store.layoutShares([]);
    expect(participant.listenerCount()).toBe(0);
    expect(video$.count()).toBe(0);
  });

  it('moves the listener when the participant changes', () => {
    const store = createShareStore();
    const { vm, participant, video$ } = fakeShare();
    store.layoutShares(asVms([vm]));
    const next = fakeParticipant({ screen_share: fakePublication() });
    video$.next({ participant: next });
    expect(participant.listenerCount()).toBe(0);
    expect(next.listenerCount()).toBe(1);
  });

  it('re-applies the rule to a returning view model', () => {
    const store = createShareStore();
    const first = fakeShare();
    store.layoutShares(asVms([first.vm]));
    store.watch('a', 0.5);
    store.setMuted('a', true);
    store.layoutShares([]);
    vi.advanceTimersByTime(10_000);
    const again = fakeShare();
    store.layoutShares(asVms([again.vm]));
    expect(again.video.isDesired).toBe(true);
    expect(again.sound.isDesired).toBe(false);
  });

  it('copes with a view model without the API', () => {
    const store = createShareStore();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const a = fakeVm('a');
    expect(() => store.layoutShares(asVms([a]))).not.toThrow();
    expect(() => store.watch('a', 0.5)).not.toThrow();
    const b = fakeVm('b', { video$: fakeSubject(undefined) });
    expect(() => store.layoutShares(asVms([a, b]))).not.toThrow();
    const c = fakeVm('c', { video$: fakeSubject({ participant: {} }) });
    expect(() => store.layoutShares(asVms([a, b, c]))).not.toThrow();
    expect(() => store.watch('c', 0.5)).not.toThrow();
    error.mockRestore();
  });

  it('logs and carries on when the publication API throws', () => {
    const store = createShareStore();
    const { vm, video, sound } = fakeShare();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    video.setSubscribed.mockImplementation(() => {
      throw new Error('boom');
    });
    expect(store.layoutShares(asVms([vm]))).toEqual([]);
    expect(error).toHaveBeenCalled();
    expect(sound.isDesired).toBe(false);
    expect(() => store.watch('a', 0.5)).not.toThrow();
    expect(store.layoutShares(asVms([vm]))).toEqual([vm]);
    error.mockRestore();
  });

  it('never emits on changes from layoutShares or a late publication', () => {
    const store = createShareStore();
    const { vm, participant } = fakeShare('a', false);
    const next = vi.fn();
    store.changes.subscribe(next);
    next.mockClear();
    store.layoutShares(asVms([vm]));
    participant.publish('screen_share_audio', fakePublication());
    store.layoutShares([]);
    expect(next).not.toHaveBeenCalled();
  });
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

  it('emits when the small picture is hidden or shown, not when it stays the same', () => {
    const store = createShareStore();
    const next = vi.fn();
    store.changes.subscribe(next);
    expect(store.pipHidden()).toBe(false);
    store.setPipHidden(true);
    store.setPipHidden(true);
    expect(store.pipHidden()).toBe(true);
    expect(next).toHaveBeenCalledTimes(2);
    store.setPipHidden(false);
    expect(store.pipHidden()).toBe(false);
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

  it('clears the local share when its vm goes after the track was stopped', () => {
    const { store, video } = setup();
    const mine = fakeVm('me', { local: true });
    store.setLocalStream(fakeStream([video]));
    store.layoutShares(asVms([mine]));
    expect(store.getSnapshot().local).not.toBeNull();
    video.stop();
    store.layoutShares([]);
    expect(store.getSnapshot().local).toBeNull();
  });

  it('keeps a live local share while its vm is gone for a reconnect', () => {
    const { store, video, audio } = setup();
    const mine = fakeVm('me', { local: true });
    store.setLocalStream(fakeStream([video, audio]));
    store.layoutShares(asVms([mine]));
    store.layoutShares([]);
    expect(store.getSnapshot().local).not.toBeNull();
    store.layoutShares(asVms([fakeVm('me', { local: true })]));
    store.setLocalSound(false);
    expect(audio.enabled).toBe(false);
    expect(store.getSnapshot().local?.soundOn).toBe(false);
    video.stop();
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
