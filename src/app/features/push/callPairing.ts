// Imported by the service worker. A join looks the same from someone starting a call and from
// someone answering one, and only someone starting a call also sends the room's encrypted
// notification, so together they mean a ring. Kept in memory: if the worker dies between the two,
// the second shows as a plain message, which is a fine way to fail.
const PAIR_WINDOW_MS = 10000;

export const createCallPairing = () => {
  const joins = new Map<string, { sender: string; at: number }>();

  return {
    join: (roomId: string, sender: string, at: number): void => {
      joins.set(roomId, { sender, at });
    },
    forget: (roomId: string): void => {
      joins.delete(roomId);
    },
    isCallNotification: (roomId: string, sender: string, at: number): boolean => {
      const join = joins.get(roomId);
      if (!join || join.sender !== sender || Math.abs(at - join.at) > PAIR_WINDOW_MS) return false;
      joins.delete(roomId);
      return true;
    },
  };
};
