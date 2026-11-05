import type { MusicApi, MusicView } from './musicApi';
import { onMusicChange } from './musicApi';
import { POLL_MS } from './musicSync';

export type MusicSnapshot = { view?: MusicView; receivedAt: number; connected: boolean };
type Listener = (snapshot: MusicSnapshot) => void;

/** One request at a time per room, shared by chat controls and the background player. */
export const createMusicFeed = (interval = POLL_MS) => {
  const cleanups = new WeakMap<object, () => void>();
  const rooms = new Map<string, { listeners: Map<Listener, boolean>; snapshot: MusicSnapshot }>();
  return (api: MusicApi, roomId: string, listener: Listener, listening = false): (() => void) => {
    let entry = rooms.get(roomId);
    if (!entry) {
      entry = { listeners: new Map(), snapshot: { receivedAt: 0, connected: false } };
      rooms.set(roomId, entry);
      const current = entry;
      let alive = true;
      let revision = 0;
      let timer: ReturnType<typeof setTimeout>;
      const publish = (snapshot: MusicSnapshot) => {
        current.snapshot = snapshot;
        current.listeners.forEach((_, fn) => fn(snapshot));
      };
      const unsubscribe = onMusicChange((changedRoom, view) => {
        if (changedRoom !== roomId) return;
        revision += 1;
        publish({ view, receivedAt: performance.now(), connected: true });
      });
      const poll = async () => {
        const sentRevision = revision;
        try {
          const view = await api.get(roomId, [...current.listeners.values()].some(Boolean));
          if (alive && sentRevision === revision) {
            publish({ view, receivedAt: performance.now(), connected: true });
          }
        } catch {
          if (alive && sentRevision === revision)
            publish({ ...current.snapshot, connected: false });
        }
        if (alive) timer = setTimeout(poll, interval);
      };
      // Defer until the first listener has been registered.
      timer = setTimeout(poll, 0);
      const cleanup = () => {
        alive = false;
        clearTimeout(timer);
        unsubscribe();
        rooms.delete(roomId);
      };
      // Keep cleanup with the entry without making callers manage the room's lifecycle.
      cleanups.set(current, cleanup);
    }
    const current = entry;
    current.listeners.set(listener, listening);
    listener(current.snapshot);
    return () => {
      current.listeners.delete(listener);
      if (current.listeners.size === 0) {
        cleanups.get(current)?.();
        cleanups.delete(current);
      }
    };
  };
};

export const watchMusicRoom = createMusicFeed();
