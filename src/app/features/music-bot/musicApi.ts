import { createApiRequest } from '../../utils/blazeroomApi';

export type MusicTrack = {
  id: string;
  title: string;
  /** The song's page (YouTube, SoundCloud...). */
  url: string;
  duration: number | null;
  thumbnail: string | null;
  requestedBy: string;
  status: 'pending' | 'loading' | 'ready' | 'failed';
};

export type NowPlaying = MusicTrack & {
  /** Null while the server is still fetching the song. */
  audio: string | null;
  /** Seconds into the song when the server answered. */
  position: number;
  paused: boolean;
};

export type MusicView = {
  version: number;
  nowPlaying: NowPlaying | null;
  queue: MusicTrack[];
};

type Listener = (roomId: string, view: MusicView) => void;
const listeners = new Set<Listener>();

/** Every change made from this app, so the player needn't wait for its next poll. */
export const onMusicChange = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

type ErrorListener = (roomId: string, error: unknown) => void;
const errorListeners = new Set<ErrorListener>();

/** Errors of the chat's /play commands, which have nowhere else to show. */
export const onMusicError = (listener: ErrorListener): (() => void) => {
  errorListeners.add(listener);
  return () => {
    errorListeners.delete(listener);
  };
};

export const publishMusicError: ErrorListener = (roomId, error) =>
  errorListeners.forEach((l) => l(roomId, error));

export const createMusicApi = (
  getToken: () => string | null,
  fetchImpl?: typeof fetch,
  publish: Listener = (roomId, view) => listeners.forEach((l) => l(roomId, view))
) => {
  const request = createApiRequest(getToken, fetchImpl);
  const room = (roomId: string) => `/api/music/rooms/${encodeURIComponent(roomId)}`;
  const json = async (path: string, method: string, body?: unknown): Promise<MusicView> =>
    (await (await request(path, method, body)).json()) as MusicView;
  const change = async (roomId: string, path: string, method: string, body?: unknown) => {
    const view = await json(`${room(roomId)}${path}`, method, body);
    publish(roomId, view);
    return view;
  };

  return {
    get: (roomId: string) => json(room(roomId), 'GET'),
    /** A link (YouTube, SoundCloud, Spotify...) or words to search for. */
    add: (roomId: string, query: string) =>
      change(roomId, '/queue', 'POST', { query }) as Promise<MusicView & { added: MusicTrack[] }>,
    remove: (roomId: string, trackId: string) =>
      change(roomId, `/queue/${encodeURIComponent(trackId)}`, 'DELETE'),
    skip: (roomId: string) => change(roomId, '/skip', 'POST'),
    stop: (roomId: string) => change(roomId, '/stop', 'POST'),
    pause: (roomId: string) => change(roomId, '/pause', 'POST'),
    resume: (roomId: string) => change(roomId, '/resume', 'POST'),
    ended: (roomId: string, trackId: string) => change(roomId, '/ended', 'POST', { trackId }),
  };
};

export type MusicApi = ReturnType<typeof createMusicApi>;
