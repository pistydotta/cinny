import { createApiRequest } from '../../utils/blazeroomApi';

export type Webhook = {
  id: string;
  name: string;
  space_id: string;
  room_id: string;
  created_by: string;
  enabled: boolean;
  created_at: string;
  last_used_at: string | null;
};

export function createWebhookApi(getToken: () => string | null, fetchImpl?: typeof fetch) {
  const request = createApiRequest(getToken, fetchImpl);
  const base = '/api/admin/webhooks';
  return {
    list: async (): Promise<{ configured: boolean; webhooks: Webhook[] }> =>
      (await request(base, 'GET')).json(),
    create: async (name: string, spaceId: string, roomId: string): Promise<{ path: string }> =>
      (await request(base, 'POST', { name, spaceId, roomId })).json(),
    rotate: async (id: string): Promise<{ path: string }> =>
      (await request(`${base}/${encodeURIComponent(id)}/rotate`, 'POST')).json(),
    enabled: async (id: string, enabled: boolean) => {
      await request(`${base}/${encodeURIComponent(id)}`, 'PATCH', { enabled });
    },
    remove: async (id: string) => {
      await request(`${base}/${encodeURIComponent(id)}`, 'DELETE');
    },
    test: async (id: string) => {
      await request(`${base}/${encodeURIComponent(id)}/test`, 'POST');
    },
  };
}
