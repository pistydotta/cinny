import { Position, RectCords } from 'folds';
import { atom } from 'jotai';

export type UserRoomProfileState = {
  userId: string;
  roomId: string;
  spaceId?: string;
  cords: RectCords;
  position?: Position;
  compact?: boolean;
};

export const userRoomProfileAtom = atom<UserRoomProfileState | undefined>(undefined);
