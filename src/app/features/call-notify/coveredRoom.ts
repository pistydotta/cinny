import { atom } from 'jotai';

// The selected room whose messages the call view covers: you're on it, but its chat isn't on screen.
export const callCoveredRoomAtom = atom<string | undefined>(undefined);

export type MessageViewState = {
  focused: boolean;
  selectedRoomId?: string;
  inboxSelected: boolean;
  coveredRoomId?: string;
};

// A new message needs no notification when you're already looking at it.
export const messageInView = (roomId: string | undefined, view: MessageViewState): boolean => {
  if (!view.focused) return false;
  if (view.inboxSelected) return true;
  return roomId !== undefined && view.selectedRoomId === roomId && view.coveredRoomId !== roomId;
};
