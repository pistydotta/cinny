import { createApiRequest } from '../../../../utils/blazeroomApi';
import { MatchState, MatchSetup, Order } from '../engine/types';
import { PackedInput } from '../engine/net';
import { Orders, Pending } from './netplay';

// The online lobby (/api/football) and what the WebSocket says (api/src/football/rooms.js).

export type RoomSeat = { userId: string; connected: boolean };

export type Room = {
  id: string;
  state: 'waiting' | 'playing' | 'over' | 'abandoned' | 'cancelled';
  halfMinutes: number;
  // Seats per side, 1 to 4, and the people sitting on each side.
  perSide: number;
  teams: [string, string];
  host: string;
  sides: [RoomSeat[], RoomSeat[]];
  watchers: string[];
  score: [number, number];
  minute: number;
  createdAt: number;
};

export type ServerMessage =
  | { type: 'hello'; userId: string }
  | { type: 'room'; room: Room }
  | { type: 'start'; slot: number; setup: MatchSetup }
  | { type: 'resume'; slot: number; state: MatchState; pending: Pending; orders?: Orders }
  | { type: 'watch'; state: MatchState }
  | { type: 'frames'; from: number; frames: PackedInput[][]; orders?: Orders }
  | { type: 'input'; s: number; t: number; i: PackedInput }
  | { type: 'order'; t: number; o: Order }
  | { type: 'over'; state: 'over' | 'abandoned' | 'cancelled'; score: [number, number] }
  | { type: 'cheer'; userId: string; e: number }
  | { type: 'pong'; at: number }
  | { type: 'peer'; rtt: number }
  | { type: 'replaced' }
  | { type: 'error'; code: string };

export const createFootballApi = (getToken: () => string | null) => {
  const request = createApiRequest(getToken);
  return {
    list: async (): Promise<Room[]> =>
      (await (await request('/api/football/matches', 'GET')).json()).matches,
    get: async (id: string): Promise<Room> =>
      (await (await request(`/api/football/matches/${encodeURIComponent(id)}`, 'GET')).json())
        .match,
    create: async (opts: {
      home: string;
      away: string;
      halfMinutes: number;
      perSide: number;
    }): Promise<Room> =>
      (await (await request('/api/football/matches', 'POST', opts)).json()).match,
    cancel: async (id: string): Promise<void> => {
      await request(`/api/football/matches/${encodeURIComponent(id)}`, 'DELETE');
    },
  };
};

export type FootballApi = ReturnType<typeof createFootballApi>;

// The cheers people in the stands (and the players) can send.
export const CHEERS = ['👏', '🔥', '⚽', '😱', '😂', '🎉', '😡', '🙌'];
