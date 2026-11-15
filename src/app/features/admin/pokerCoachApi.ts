import { createApiRequest } from '../../utils/blazeroomApi';

export type CoachUser = { userId: string; grantedBy: string; createdAt: string };

// Who gets the poker coach besides superadmins. Superadmin only on the server too.
export function createPokerCoachApi(getToken: () => string | null, fetchImpl?: typeof fetch) {
  const request = createApiRequest(getToken, fetchImpl);
  const base = '/api/admin/poker-coach';
  const users = async (response: Response): Promise<CoachUser[]> =>
    ((await response.json()) as { users: CoachUser[] }).users;
  return {
    list: async () => users(await request(base, 'GET')),
    grant: async (userId: string) =>
      users(await request(`${base}/${encodeURIComponent(userId)}`, 'PUT')),
    revoke: async (userId: string) =>
      users(await request(`${base}/${encodeURIComponent(userId)}`, 'DELETE')),
  };
}
