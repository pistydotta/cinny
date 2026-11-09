import { createApiRequest } from '../../../utils/blazeroomApi';
import { GameKind, GameTable, TableSummary } from './types';

export const createTableGamesApi = (getToken: () => string | null) => {
  const request = createApiRequest(getToken);
  const json = async <T>(path: string, method: string, body?: unknown): Promise<T> =>
    (await request(`/api/games/tables${path}`, method, body)).json();
  return {
    list: (kind: GameKind) => json<TableSummary[]>(`?kind=${kind}`, 'GET'),
    get: (id: string) => json<GameTable>(`/${encodeURIComponent(id)}`, 'GET'),
    create: (kind: GameKind, name: string, stake: number, capacity: number) =>
      json<GameTable>('', 'POST', { kind, name, stake, capacity }),
    join: (id: string) => json<GameTable>(`/${encodeURIComponent(id)}/join`, 'POST'),
    rematch: (id: string) => json<GameTable>(`/${encodeURIComponent(id)}/rematch`, 'POST'),
    act: (s: GameTable, action: Record<string, unknown>) =>
      json<GameTable>(`/${encodeURIComponent(s.id)}/action`, 'POST', {
        version: s.version,
        action,
      }),
    comment: (id: string, text: string) =>
      json<GameTable>(`/${encodeURIComponent(id)}/comments`, 'POST', { text }),
  };
};
