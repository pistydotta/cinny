import { describe, expect, it } from 'vitest';
import { createWebhookApi } from './webhookApi';

describe('webhook management client', () => {
  it('keeps management authenticated and sends only fixed creation fields', async () => {
    const calls: { path: string; init?: RequestInit }[] = [];
    const api = createWebhookApi(
      () => 'matrix-token',
      async (path, init) => {
        calls.push({ path: String(path), init });
        return new Response(JSON.stringify({ path: '/api/webhooks/id/one-time-secret' }));
      }
    );
    expect(await api.create('Builds', '!space:x', '!room:x')).toEqual({
      path: '/api/webhooks/id/one-time-secret',
    });
    expect(calls[0].path).toBe('/api/admin/webhooks');
    expect(calls[0].init?.headers).toEqual({
      Authorization: 'Bearer matrix-token',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      name: 'Builds',
      spaceId: '!space:x',
      roomId: '!room:x',
    });
    await api.rotate('id');
    await api.enabled('id', false);
    await api.test('id');
    await api.remove('id');
    expect(calls.slice(1).map((call) => [call.path, call.init?.method])).toEqual([
      ['/api/admin/webhooks/id/rotate', 'POST'],
      ['/api/admin/webhooks/id', 'PATCH'],
      ['/api/admin/webhooks/id/test', 'POST'],
      ['/api/admin/webhooks/id', 'DELETE'],
    ]);
  });
});
