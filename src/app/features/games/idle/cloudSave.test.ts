import { describe, expect, it, vi } from 'vitest';
import { createIdleSaveApi, deviceLabel, pickSave } from './cloudSave';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('pickSave', () => {
  const remote = (revision: number) => ({ save: revision ? '{}' : null, revision });

  it('sends a save that only exists here, and takes one that only exists there', () => {
    expect(pickSave(true, 0, remote(0))).toBe('local');
    expect(pickSave(false, 0, remote(3))).toBe('remote');
    expect(pickSave(false, 0, remote(0))).toBe('none');
  });

  it('keeps the local copy while nobody else wrote', () => {
    expect(pickSave(true, 3, remote(3))).toBe('local');
  });

  it('takes the server copy once another device wrote', () => {
    expect(pickSave(true, 3, remote(5))).toBe('remote');
    // A browser that played before saves went online.
    expect(pickSave(true, 0, remote(1))).toBe('remote');
  });
});

describe('createIdleSaveApi', () => {
  it('saves with the base revision and reads the new one', async () => {
    const fetchImpl = vi.fn(async () => json(200, { revision: 4 }));
    const api = createIdleSaveApi(() => 'tok', fetchImpl as unknown as typeof fetch);
    expect(await api.put('{"version":2}', 3, 'Windows')).toEqual({ ok: true, revision: 4 });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/idle/save');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({
      save: '{"version":2}',
      baseRevision: 3,
      device: 'Windows',
    });
  });

  it('answers a conflict with what the server has', async () => {
    const there = { save: '{"version":2}', revision: 7, device: 'Android', updatedAt: 'x' };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json(409, { error: 'conflict' }))
      .mockResolvedValueOnce(json(200, there));
    const api = createIdleSaveApi(() => 'tok', fetchImpl);
    expect(await api.put('{}', 3, 'web')).toEqual({ ok: false, conflict: there });
  });

  it('rejects other errors', async () => {
    const api = createIdleSaveApi(
      () => 'tok',
      vi.fn().mockResolvedValue(json(400, { error: 'invalid_save' }))
    );
    await expect(api.put('{}', 0, 'web')).rejects.toMatchObject({ code: 'invalid_save' });
  });
});

describe('deviceLabel', () => {
  it('names common devices', () => {
    expect(deviceLabel('Mozilla/5.0 (Linux; Android 14)')).toBe('Android');
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Windows');
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe('iPhone');
    expect(deviceLabel('curl')).toBe('web');
  });
});
