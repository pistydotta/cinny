import { describe, expect, it, vi } from 'vitest';
import { ensureSelfChat, isSelfChatRoom } from './selfChatRoom';

vi.mock('../../components/create-room', () => ({
  createRoomEncryptionState: () => ({ type: 'm.room.encryption', content: {} }),
}));

const me = '@me:server';

const fakeClient = ({
  localDirects,
  serverDirects,
  joined = [],
}: {
  localDirects?: Record<string, unknown>;
  serverDirects?: Record<string, unknown>;
  joined?: string[];
}) => ({
  getSafeUserId: () => me,
  getAccountData: () => (localDirects ? { getContent: () => localDirects } : undefined),
  getRoom: (roomId: string) => (joined.includes(roomId) ? { getMyMembership: () => 'join' } : null),
  http: {
    authedRequest: vi.fn(async () => {
      if (serverDirects) return serverDirects;
      throw Object.assign(new Error('missing'), { errcode: 'M_NOT_FOUND' });
    }),
  },
  getJoinedRooms: vi.fn(async () => ({ joined_rooms: joined })),
  getProfileInfo: vi.fn(async () => ({ displayname: 'Me', avatar_url: 'mxc://me' })),
  createRoom: vi.fn(async () => ({ room_id: '!new' })),
  setAccountData: vi.fn(async () => ({})),
});

const ensure = (mx: ReturnType<typeof fakeClient>) => ensureSelfChat(mx as never);

describe('ensureSelfChat', () => {
  it('opens the chat it already knows, without asking the server', async () => {
    const mx = fakeClient({ localDirects: { [me]: ['!notes'] }, joined: ['!notes'] });
    await expect(ensure(mx)).resolves.toBe('!notes');
    expect(mx.http.authedRequest).not.toHaveBeenCalled();
    expect(mx.createRoom).not.toHaveBeenCalled();
  });

  it('finds one made on another device when the local copy is stale', async () => {
    const mx = fakeClient({
      localDirects: {},
      serverDirects: { [me]: ['!notes'] },
      joined: ['!notes'],
    });
    await expect(ensure(mx)).resolves.toBe('!notes');
    expect(mx.createRoom).not.toHaveBeenCalled();
  });

  it('creates it with your name and photo, keeping DMs the local copy missed', async () => {
    const mx = fakeClient({ localDirects: {}, serverDirects: { '@friend:server': ['!dm'] } });
    await expect(ensure(mx)).resolves.toBe('!new');
    expect(mx.createRoom).toHaveBeenCalledOnce();
    const [options] = mx.createRoom.mock.calls[0] as unknown as [
      { name: string; initial_state: { type: string; content: unknown }[]; invite?: string[] }
    ];
    expect(options.name).toBe('Me');
    expect(options.invite).toBeUndefined();
    expect(options.initial_state.map((event) => event.type)).toEqual([
      'm.room.encryption',
      'm.room.avatar',
    ]);
    expect(mx.setAccountData).toHaveBeenCalledWith('m.direct', {
      '@friend:server': ['!dm'],
      [me]: ['!new'],
    });
  });

  it('creates it for an account with no m.direct at all', async () => {
    const mx = fakeClient({});
    await expect(ensure(mx)).resolves.toBe('!new');
    expect(mx.setAccountData).toHaveBeenCalledWith('m.direct', { [me]: ['!new'] });
  });

  it('makes one room when called twice at once', async () => {
    const mx = fakeClient({});
    await Promise.all([ensure(mx), ensure(mx)]);
    expect(mx.createRoom).toHaveBeenCalledOnce();
  });

  it('creates nothing when the server cannot be read', async () => {
    const mx = fakeClient({});
    mx.http.authedRequest.mockRejectedValueOnce(new Error('offline'));
    await expect(ensure(mx)).rejects.toThrow('offline');
    expect(mx.createRoom).not.toHaveBeenCalled();
  });
});

describe('isSelfChatRoom', () => {
  const client = (joined: number, invited: number) =>
    ({
      getSafeUserId: () => me,
      getAccountData: () => ({ getContent: () => ({ [me]: ['!notes'], '@f:server': ['!dm'] }) }),
      getRoom: () => ({
        getJoinedMemberCount: () => joined,
        getInvitedMemberCount: () => invited,
      }),
    } as never);

  it('is your own chat while only you are in it', () => {
    expect(isSelfChatRoom(client(1, 0), '!notes')).toBe(true);
  });

  it('stops being it once someone else joins or is invited, so it can be left', () => {
    expect(isSelfChatRoom(client(2, 0), '!notes')).toBe(false);
    expect(isSelfChatRoom(client(1, 1), '!notes')).toBe(false);
  });

  it('never matches another room', () => {
    expect(isSelfChatRoom(client(1, 0), '!dm')).toBe(false);
    expect(isSelfChatRoom(client(1, 0), '!other')).toBe(false);
  });
});
