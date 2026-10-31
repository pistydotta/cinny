import { ICreateRoomStateEvent, MatrixClient, Method } from 'matrix-js-sdk';
import { Preset, Visibility } from 'matrix-js-sdk/lib/@types/partials';
import { createRoomEncryptionState } from '../../components/create-room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { getStateEvent } from '../../utils/room';
import { AccountDataEvent } from '../../../types/matrix/accountData';
import { Membership, StateEvent } from '../../../types/matrix/room';
import { addSelfChat, findSelfChat, selfChatChanges } from './selfChat';

const readProfile = async (mx: MatrixClient) => {
  const userId = mx.getSafeUserId();
  const info = await mx.getProfileInfo(userId);
  return {
    name: info.displayname || getMxIdLocalPart(userId) || userId,
    avatar: info.avatar_url,
  };
};

const readLocalDirects = (mx: MatrixClient) =>
  mx.getAccountData(AccountDataEvent.Direct as never)?.getContent();

// The client's copy can be from the last visit, so before creating anything ask the server: the
// chat may have just been made on another device. Writing the stale copy back would also lose DMs.
const readServerDirects = async (mx: MatrixClient): Promise<Record<string, unknown>> => {
  const user = encodeURIComponent(mx.getSafeUserId());
  try {
    return await mx.http.authedRequest(
      Method.Get,
      `/user/${user}/account_data/${AccountDataEvent.Direct}`
    );
  } catch (e) {
    if ((e as { errcode?: string }).errcode === 'M_NOT_FOUND') return {};
    throw e;
  }
};

const openOrCreate = async (mx: MatrixClient): Promise<string> => {
  const userId = mx.getSafeUserId();
  const local = findSelfChat(
    readLocalDirects(mx),
    userId,
    (roomId) => mx.getRoom(roomId)?.getMyMembership() === Membership.Join
  );
  if (local) return local;

  const [directs, { joined_rooms: joinedRooms }] = await Promise.all([
    readServerDirects(mx),
    mx.getJoinedRooms(),
  ]);
  const existing = findSelfChat(directs, userId, (roomId) => joinedRooms.includes(roomId));
  if (existing) return existing;

  const { name, avatar } = await readProfile(mx);
  const initialState: ICreateRoomStateEvent[] = [createRoomEncryptionState()];
  if (avatar) initialState.push({ type: StateEvent.RoomAvatar, content: { url: avatar } });

  const { room_id: roomId } = await mx.createRoom({
    is_direct: true,
    name,
    visibility: Visibility.Private,
    preset: Preset.TrustedPrivateChat,
    initial_state: initialState,
  });
  await mx.setAccountData(
    AccountDataEvent.Direct as never,
    addSelfChat(directs, userId, roomId) as never
  );
  return roomId;
};

// Two callers at once, like the keeper and the button on your card, must not make two rooms.
const inFlight = new WeakMap<MatrixClient, Promise<string>>();

export const ensureSelfChat = (mx: MatrixClient): Promise<string> => {
  const current = inFlight.get(mx);
  if (current) return current;
  const next = openOrCreate(mx).finally(() => inFlight.delete(mx));
  inFlight.set(mx, next);
  return next;
};

// The room shows your name and photo, and those are copied into it: a room can't point at a profile.
export const syncSelfChatProfile = async (mx: MatrixClient, roomId: string): Promise<void> => {
  const room = mx.getRoom(roomId);
  // Not synced yet means it was just created, already with your profile.
  if (!room) return;

  const profile = await readProfile(mx);
  const { name, avatar } = selfChatChanges(
    {
      name: getStateEvent(room, StateEvent.RoomName)?.getContent().name,
      avatar: getStateEvent(room, StateEvent.RoomAvatar)?.getContent().url,
    },
    profile
  );
  if (name !== undefined) await mx.setRoomName(roomId, name);
  if (avatar !== undefined) {
    await mx.sendStateEvent(roomId, StateEvent.RoomAvatar as never, { url: avatar } as never, '');
  }
};

// A chat you share with someone can't promise to be private, even if it started as your own.
export const isSelfChatRoom = (mx: MatrixClient, roomId: string): boolean => {
  const room = mx.getRoom(roomId);
  if (!room || room.getJoinedMemberCount() !== 1 || room.getInvitedMemberCount() !== 0)
    return false;
  return findSelfChat(readLocalDirects(mx), mx.getSafeUserId(), (id) => id === roomId) === roomId;
};
