// Runs inside the bundled Element Call page (public/element-call), which is served as-is, so
// this is plain browser JavaScript with no imports.

// How long a share that left the call layout is remembered, so a short reconnect doesn't
// bring back a share the person already closed, or make them pick a volume again.
const FORGET_AFTER_MS = 30_000;

// LiveKit's Track.Source values.
const VIDEO_SOURCE = 'screen_share';
const SOUND_SOURCE = 'screen_share_audio';

// This code runs inside Element Call's layout pipeline, where a throw breaks the layout.
const guarded = (fn) => {
  try {
    fn();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('blazeroom screen share:', e);
  }
};

// LiveKit subscribes to every track and adaptiveStream only stops a video that was once
// attached, so a share nobody opened would keep downloading. Dropping the subscription also
// spares the sound a race: a volume of 0 set before the element attaches gets skipped, and the
// share plays at 100%.
const subscribeTo = (participant, source, on) =>
  guarded(() => {
    const publication = participant.getTrackPublication(source);
    if (publication && publication.isDesired !== on) publication.setSubscribed(on);
  });

const sameRemote = (a, b) =>
  a.id === b.id &&
  a.userId === b.userId &&
  a.name === b.name &&
  a.hasSound === b.hasSound &&
  a.watching === b.watching &&
  a.volume === b.volume &&
  a.muted === b.muted &&
  a.decided === b.decided;

const sameLocal = (a, b) =>
  a === b ||
  (!!a &&
    !!b &&
    a.name === b.name &&
    a.hasSound === b.hasSound &&
    a.soundOn === b.soundOn &&
    a.volume === b.volume &&
    a.videoTrack === b.videoTrack);

const sameSnapshot = (a, b) =>
  a.peopleHidden === b.peopleHidden &&
  sameLocal(a.local, b.local) &&
  a.remotes.length === b.remotes.length &&
  a.remotes.every((r, i) => sameRemote(r, b.remotes[i]));

// The share state for one call: which screen shares the person is watching, at what volume,
// and what they are sharing themselves. Cinny reads it through getSnapshot/subscribe (React's
// useSyncExternalStore); Element Call's layout pipeline goes through layoutShares and `changes`.
export const createShareStore = () => {
  // id -> { id, userId, vm, unsubs, participant, offPublished, name, hasSound, watching, volume,
  // muted, decided, timer }
  const entries = new Map();
  const listeners = new Set();
  const observers = new Set();
  let revision = 0;

  // Set while the call shows in Cinny's floating viewer, which only has room for the share.
  let pipHidden = false;
  // Set while someone watching a share chose to hide the people column beside it.
  let peopleHidden = false;
  const hidingPeople = () => peopleHidden && [...entries.values()].some((e) => e.vm && e.watching);

  let localStream = null;
  let localVideo = null;
  let localAudio = null;
  let localMixer = null;
  let localVolume = 1;
  let localEnded = null;
  let sawLocalVm = false;

  let snapshot = { local: null, remotes: [], peopleHidden: false };
  let batching = false;

  const build = () => ({
    peopleHidden: hidingPeople(),
    local: localVideo
      ? {
          name: localVideo.label,
          hasSound: !!localAudio,
          soundOn: !!localAudio && localAudio.enabled,
          volume: localMixer ? localVolume : undefined,
          videoTrack: localVideo,
        }
      : null,
    remotes: [...entries.values()]
      .filter((e) => e.vm)
      .map((e) => ({
        id: e.id,
        userId: e.userId,
        name: e.name,
        hasSound: e.hasSound,
        watching: e.watching,
        volume: e.volume,
        muted: e.muted,
        decided: e.decided,
      })),
  });

  // Swaps in a new snapshot object, and tells the listeners, only if something differs.
  const refresh = () => {
    if (batching) return;
    const next = build();
    if (sameSnapshot(snapshot, next)) return;
    snapshot = next;
    [...listeners].forEach((listener) => listener());
  };

  const applyVolume = (e) => {
    if (!e.vm) return;
    e.vm.adjustPlaybackVolume(e.watching && !e.muted ? e.volume : 0);
    e.vm.commitPlaybackVolume();
  };

  const applySubscriptions = (e) => {
    if (!e.vm || !e.participant) return;
    subscribeTo(e.participant, VIDEO_SOURCE, e.watching);
    // Not at volume 0 either: LiveKit's attach skips a volume of 0, so the element would play at 1.
    subscribeTo(e.participant, SOUND_SOURCE, e.watching && !e.muted && e.volume > 0);
  };

  const unbindParticipant = (e) => {
    e.offPublished?.();
    e.offPublished = null;
    e.participant = null;
  };

  // The sound can be published after the view model appears, when layoutShares won't run again.
  const bindParticipant = (e, participant) => {
    if (e.participant !== participant) {
      unbindParticipant(e);
      if (participant) {
        e.participant = participant;
        const onPublished = () => applySubscriptions(e);
        guarded(() => {
          participant.on('trackPublished', onPublished);
          e.offPublished = () => guarded(() => participant.off('trackPublished', onPublished));
        });
      }
    }
    applySubscriptions(e);
  };

  const release = (e) => {
    e.unsubs.forEach((u) => u.unsubscribe());
    e.unsubs = [];
    unbindParticipant(e);
    e.vm = null;
  };

  const attach = (e, vm) => {
    e.vm = vm;
    e.userId = vm.userId;
    e.unsubs = [
      vm.displayName$.subscribe((name) => {
        e.name = name;
        refresh();
      }),
    ];
    if (vm.audioEnabled$) {
      e.unsubs.push(
        vm.audioEnabled$.subscribe((on) => {
          e.hasSound = !!on;
          refresh();
        })
      );
    }
    // After the volume: a track subscribed from here attaches at the volume already set.
    applyVolume(e);
    if (vm.video$) {
      e.unsubs.push(vm.video$.subscribe((ref) => bindParticipant(e, ref?.participant ?? null)));
    }
  };

  const clearLocal = () => {
    localMixer?.dispose();
    localMixer = null;
    localVolume = 1;
    if (localVideo && localEnded) localVideo.removeEventListener('ended', localEnded);
    localStream = null;
    localVideo = null;
    localAudio = null;
    localEnded = null;
    sawLocalVm = false;
  };

  const layoutShares = (vms) => {
    batching = true;
    try {
      const present = new Set();
      let localVm = false;
      vms.forEach((vm) => {
        if (vm.local) {
          localVm = true;
          return;
        }
        present.add(vm.id);
        let e = entries.get(vm.id);
        if (!e) {
          e = {
            id: vm.id,
            userId: vm.userId,
            vm: null,
            unsubs: [],
            participant: null,
            offPublished: null,
            name: '',
            hasSound: false,
            watching: false,
            volume: 1,
            muted: false,
            decided: false,
            timer: null,
          };
          entries.set(vm.id, e);
        }
        clearTimeout(e.timer);
        e.timer = null;
        if (e.vm !== vm) {
          release(e);
          attach(e, vm);
        }
      });

      entries.forEach((e, id) => {
        if (present.has(id) || e.timer) return;
        release(e);
        // eslint-disable-next-line no-param-reassign
        e.timer = setTimeout(() => {
          entries.delete(id);
          refresh();
        }, FORGET_AFTER_MS);
      });

      if (localVm) sawLocalVm = true;
      // The view model also goes away for a moment in a reconnect, with the share still live.
      else if (sawLocalVm && localVideo?.readyState === 'ended') clearLocal();

      return vms.filter((vm) => !vm.local && entries.get(vm.id)?.watching);
    } finally {
      batching = false;
      refresh();
    }
  };

  const update = (id, change) => {
    const e = entries.get(id);
    if (!e) return;
    change(e);
    applyVolume(e);
    applySubscriptions(e);
    refresh();
  };

  // What Element Call's layout pipeline combines with the view models, so it runs layoutShares
  // again when a share is watched or unwatched. It must never emit from layoutShares itself:
  // that feeds the same pipeline. RxJS can't find Symbol.observable in a browser, so it looks
  // up the string key '@@observable' instead; it emits once on subscribe because combineLatest
  // stays silent until every source has.
  const changes = {
    subscribe: (observer) => {
      const next = typeof observer === 'function' ? observer : (v) => observer.next?.(v);
      observers.add(next);
      next(revision);
      return { unsubscribe: () => observers.delete(next) };
    },
    '@@observable': () => changes,
  };
  if (Symbol.observable) changes[Symbol.observable] = () => changes;

  const emitChange = () => {
    revision += 1;
    [...observers].forEach((next) => next(revision));
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    changes,
    layoutShares,

    // Hiding the people also hides the sharer's small picture over the share. It only counts
    // while a share is watched: with nothing to watch the people are all there is.
    pipHidden: () => pipHidden || hidingPeople(),
    peopleHidden: hidingPeople,
    setPeopleHidden: (hidden) => {
      if (peopleHidden === hidden) return;
      peopleHidden = hidden;
      emitChange();
      refresh();
    },
    setPipHidden: (hidden) => {
      if (pipHidden === hidden) return;
      pipHidden = hidden;
      emitChange();
    },

    watch: (id, volume) => {
      update(id, (e) => {
        e.watching = true;
        e.volume = volume;
      });
      if (entries.has(id)) emitChange();
    },
    unwatch: (id) => {
      update(id, (e) => {
        e.watching = false;
      });
      if (entries.has(id)) emitChange();
    },
    setVolume: (id, volume) =>
      update(id, (e) => {
        e.volume = volume;
      }),
    setMuted: (id, muted) =>
      update(id, (e) => {
        e.muted = muted;
      }),
    markDecided: (id) =>
      update(id, (e) => {
        e.decided = true;
      }),

    setLocalStream: (stream, mixer) => {
      clearLocal();
      localMixer = mixer ?? null;
      localStream = stream;
      [localVideo] = stream.getVideoTracks();
      [localAudio] = stream.getAudioTracks();
      if (localVideo) {
        const video = localVideo;
        localEnded = () => {
          if (localVideo !== video) return;
          clearLocal();
          refresh();
        };
        video.addEventListener('ended', localEnded);
      }
      refresh();
    },
    setLocalSound: (on) => {
      if (!localStream || !localAudio) return;
      localAudio.enabled = on;
      refresh();
    },
    setLocalVolume: (value) => {
      if (!localMixer || !Number.isFinite(value)) return;
      localVolume = Math.max(0, Math.min(1, value));
      localMixer.setVolume(localVolume);
      refresh();
    },
  };
};

// Only the captured system/tab audio passes through this graph, never the microphone.
// No connection to context.destination: the sharer must not hear an echo locally.
export async function createCaptureVolume(stream, Context = globalThis.AudioContext) {
  const [audio] = stream.getAudioTracks();
  if (!audio || !Context) return undefined;
  let context;
  try {
    context = new Context();
    let resumeTimer;
    try {
      await Promise.race([
        context.resume(),
        new Promise((resolve, reject) => {
          resumeTimer = setTimeout(() => reject(new Error('Audio context suspended')), 1000);
        }),
      ]);
    } finally {
      clearTimeout(resumeTimer);
    }
    const source = context.createMediaStreamSource(new MediaStream([audio]));
    const gain = context.createGain();
    const destination = context.createMediaStreamDestination();
    source.connect(gain);
    gain.connect(destination);
    const [output] = destination.stream.getAudioTracks();
    if (!output) throw new Error('No captured audio output');
    stream.removeTrack(audio);
    stream.addTrack(output);
    return {
      setVolume: (value) => gain.gain.setValueAtTime(value, context.currentTime),
      dispose: () => {
        source.disconnect();
        gain.disconnect();
        audio.stop();
        output.stop();
        context.close().catch(() => undefined);
      },
    };
  } catch {
    context?.close().catch(() => undefined);
    return undefined;
  }
}

// Replaces mediaDevices.getDisplayMedia so the store learns about the person's own share. The
// Video stays untouched; optional audio gain is applied before publication. Picker errors propagate.
export const wrapGetDisplayMedia = (mediaDevices, store) => {
  const getDisplayMedia = mediaDevices.getDisplayMedia.bind(mediaDevices);

  // eslint-disable-next-line no-param-reassign
  mediaDevices.getDisplayMedia = async (constraints) => {
    const stream = await getDisplayMedia(constraints);
    const mixer = await createCaptureVolume(stream);
    store.setLocalStream(stream, mixer);
    return stream;
  };
};
