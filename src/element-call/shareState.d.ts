type Unsubscribable = { unsubscribe: () => void };
type Stream$<T> = { subscribe: (next: (value: T) => void) => Unsubscribable };

export type RemoteShare = {
  id: string;
  userId: string;
  name: string;
  hasSound: boolean;
  watching: boolean;
  volume: number;
  muted: boolean;
  decided: boolean;
  /** A JPEG data URL of the share, refreshed every 15 seconds while not watched. */
  preview?: string;
};

export type LocalShare = {
  name: string;
  hasSound: boolean;
  soundOn: boolean;
  volume?: number;
  videoTrack: MediaStreamTrack;
};

export type ShareSnapshot = {
  local: LocalShare | null;
  remotes: RemoteShare[];
  peopleHidden: boolean;
};

// The parts of LiveKit's RemoteTrackPublication and RemoteParticipant that we use.
export type SharePublication = {
  isDesired: boolean;
  setSubscribed: (subscribed: boolean) => void;
};

export type ShareParticipant = {
  getTrackPublication: (source: string) => SharePublication | undefined;
  on: (event: 'trackPublished', listener: () => void) => unknown;
  off: (event: 'trackPublished', listener: () => void) => unknown;
};

// The part of a screen share view model from the Element Call bundle that we use.
export type ShareVm = {
  id: string;
  userId: string;
  local: boolean;
  displayName$: Stream$<string>;
  audioEnabled$?: Stream$<boolean>;
  video$?: Stream$<{ participant: ShareParticipant } | undefined>;
  adjustPlaybackVolume: (volume: number) => void;
  commitPlaybackVolume: () => void;
};

// Accepted by RxJS (combineLatest and friends) through the '@@observable' key.
export type ShareChanges = {
  subscribe: (
    observer: ((revision: number) => void) | { next?: (revision: number) => void }
  ) => Unsubscribable;
  '@@observable': () => ShareChanges;
};

export type ShareStore = {
  getSnapshot: () => ShareSnapshot;
  subscribe: (listener: () => void) => () => void;
  changes: ShareChanges;
  layoutShares: (vms: ShareVm[]) => ShareVm[];
  pipHidden: () => boolean;
  setPipHidden: (hidden: boolean) => void;
  peopleHidden: () => boolean;
  setPeopleHidden: (hidden: boolean) => void;
  watch: (id: string, volume: number) => void;
  unwatch: (id: string) => void;
  setVolume: (id: string, volume: number) => void;
  setMuted: (id: string, muted: boolean) => void;
  markDecided: (id: string) => void;
  setLocalStream: (stream: MediaStream) => void;
  setLocalSound: (on: boolean) => void;
  setLocalVolume: (value: number) => void;
};

export function grabFrame(publication: unknown): Promise<string | null>;
/** grab null turns the previews off. */
export function createShareStore(options?: {
  grab?: ((publication: any) => Promise<string | null>) | null;
  peekEveryMs?: number;
}): ShareStore;
export function createCaptureVolume(
  stream: MediaStream,
  Context?: typeof AudioContext
): Promise<{ setVolume: (value: number) => void; dispose: () => void } | undefined>;

export function wrapGetDisplayMedia(
  mediaDevices: Pick<MediaDevices, 'getDisplayMedia'>,
  store: ShareStore
): void;
