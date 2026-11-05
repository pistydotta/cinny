const requests = new Map<string, number>();
const listeners = new Set<(roomId: string, pending: boolean) => void>();
export const musicRequestPending = (roomId: string) => (requests.get(roomId) ?? 0) > 0;
export const watchMusicActivity = (listener: (roomId: string, pending: boolean) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const beginMusicRequest = (roomId: string) => {
  requests.set(roomId, (requests.get(roomId) ?? 0) + 1);
  listeners.forEach((fn) => fn(roomId, true));
  return () => {
    const left = Math.max(0, (requests.get(roomId) ?? 1) - 1);
    if (left) requests.set(roomId, left);
    else requests.delete(roomId);
    listeners.forEach((fn) => fn(roomId, left > 0));
  };
};
