import { ApiError, createApiRequest } from '../../../utils/blazeroomApi';
import type { LobbyList, PlayReply, PokerAction, TableView } from './types';

type PokerApiOptions = {
  fetchImpl?: typeof fetch;
  /** Called with every play route's reply, so a screen needn't wait for the stream. */
  onPlay?: (reply: PlayReply) => void;
};

export const createPokerApi = (getToken: () => string | null, options: PokerApiOptions = {}) => {
  const request = createApiRequest(getToken, options.fetchImpl);
  const json = async <T>(path: string, method: string, body?: unknown): Promise<T> =>
    (await (await request(path, method, body)).json()) as T;

  const table = (id: string) => `/api/poker/tables/${encodeURIComponent(id)}`;

  const play = async (path: string, body?: unknown): Promise<PlayReply> => {
    const reply = await json<PlayReply>(path, 'POST', body);
    options.onPlay?.(reply);
    return reply;
  };

  return {
    list: () => json<LobbyList>('/api/poker/tables', 'GET'),
    get: (id: string) => json<TableView>(table(id), 'GET'),
    async create(input: { name: string; smallBlind: number; invite: string[] }): Promise<string> {
      return (await json<{ id: string }>('/api/poker/tables', 'POST', input)).id;
    },
    async close(id: string): Promise<void> {
      await request(table(id), 'DELETE');
    },
    // The 409 body's table id doesn't survive the error, but the lobby list names the practice table.
    async practice(input: { bots: number; buyIn: number }): Promise<string> {
      try {
        return (await json<{ id: string }>('/api/poker/practice', 'POST', input)).id;
      } catch (e) {
        if (e instanceof ApiError && e.code === 'already_practicing') {
          const { practiceId } = await json<LobbyList>('/api/poker/tables', 'GET');
          if (practiceId) return practiceId;
        }
        throw e;
      }
    },
    async invite(id: string, userId: string): Promise<void> {
      await request(`${table(id)}/invites`, 'POST', { userId });
    },
    async inviteLink(id: string, rotate = false): Promise<string> {
      const body = rotate ? { rotate: true } : {};
      return (await json<{ token: string }>(`${table(id)}/invite-link`, 'POST', body)).token;
    },
    async join(token: string): Promise<string> {
      return (await json<{ id: string }>(`/api/poker/join/${encodeURIComponent(token)}`, 'POST'))
        .id;
    },
    async accept(id: string): Promise<string> {
      return (await json<{ id: string }>(`${table(id)}/accept`, 'POST')).id;
    },
    /** Declines an invite, or drops the table from my list (leaving my seat first). */
    async dropMembership(id: string): Promise<void> {
      await request(`${table(id)}/membership`, 'DELETE');
    },
    sit: (id: string, seat: number, buyIn: number) => play(`${table(id)}/sit`, { seat, buyIn }),
    leave: (id: string) => play(`${table(id)}/leave`),
    rebuy: (id: string, amount: number) => play(`${table(id)}/rebuy`, { amount }),
    back: (id: string) => play(`${table(id)}/back`),
    act: (id: string, hand: number, seq: number, action: PokerAction) =>
      play(`${table(id)}/act`, { hand, seq, action }),
  };
};

export type PokerApi = ReturnType<typeof createPokerApi>;
