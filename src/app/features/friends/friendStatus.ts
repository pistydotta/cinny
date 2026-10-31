import { FriendsList } from './friendsApi';

// Where you stand with someone, for the button on their profile card.
export type FriendStatus = 'unknown' | 'none' | 'friend' | 'incoming' | 'outgoing';

export const getFriendStatus = (lists: FriendsList | undefined, userId: string): FriendStatus => {
  if (!lists) return 'unknown';
  if (lists.friends.some((f) => f.userId === userId)) return 'friend';
  if (lists.incoming.some((r) => r.userId === userId)) return 'incoming';
  if (lists.outgoing.some((r) => r.userId === userId)) return 'outgoing';
  return 'none';
};
