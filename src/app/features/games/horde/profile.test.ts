import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../utils/blazeroomApi';
import { newMeta } from './engine/meta';
import { createRun } from './engine/run';
import {
  HordeApi,
  HordeProfile,
  MAX_PENDING,
  RunReport,
  addPending,
  createHordeApi,
  parsePending,
  reportOf,
  syncProfile,
  withProfile,
} from './profile';

const profile = (gold: number): HordeProfile => ({
  gold,
  upgrades: newMeta().upgrades,
  runs: 0,
  wins: 0,
  bestTime: 0,
  bestKills: 0,
  bestLevel: 0,
});

const report = (id: string): RunReport => ({
  id,
  seed: 1,
  character: 'eneas',
  seconds: 90,
  kills: 100,
  level: 5,
  gold: 12,
  won: false,
});

const fakeApi = (over: Partial<HordeApi>): HordeApi => ({
  profile: async () => profile(0),
  report: async () => profile(0),
  buy: async () => profile(0),
  ranking: async () => [],
  ...over,
});

describe('horde profile api', () => {
  it('sends the token and reads the answers', async () => {
    const fetchImpl = vi.fn(async (path: RequestInfo | URL) => {
      const body = String(path).endsWith('/runs')
        ? { paid: true, profile: profile(70) }
        : { ranking: [{ userId: '@a:b', kills: 3 }] };
      return new Response(JSON.stringify(body), { status: 200 });
    });
    const api = createHordeApi(() => 'tok', fetchImpl as unknown as typeof fetch);
    expect((await api.report(report('run-0001'))).gold).toBe(70);
    expect(await api.ranking()).toEqual([{ userId: '@a:b', kills: 3 }]);
    const [path, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/api/horde/runs');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body as string).id).toBe('run-0001');
  });

  it('describes a finished run', () => {
    const run = createRun(77, 'janja');
    run.time = 123.9;
    run.kills = 40;
    run.gold = 9;
    run.phase = 'dead';
    expect(reportOf(run, 'run-0009')).toEqual({
      id: 'run-0009',
      seed: 77,
      character: 'janja',
      seconds: 123,
      kills: 40,
      level: 1,
      gold: 9,
      won: false,
    });
  });

  it('takes the server numbers and keeps the hero picked here', () => {
    const meta = { ...newMeta(), gold: 5, character: 'lula' as const };
    const merged = withProfile(meta, { ...profile(900), runs: 4 });
    expect(merged.gold).toBe(900);
    expect(merged.runs).toBe(4);
    expect(merged.character).toBe('lula');
  });
});

describe('horde pending runs', () => {
  it('reads the list back and ignores junk', () => {
    expect(parsePending(JSON.stringify([report('run-0001')]))).toHaveLength(1);
    expect(parsePending('{oops')).toEqual([]);
    expect(parsePending(JSON.stringify({ id: 'x' }))).toEqual([]);
    expect(parsePending(JSON.stringify([null, { id: 1 }, report('run-0002')]))).toHaveLength(1);
    expect(parsePending(null)).toEqual([]);
  });

  it('lets the oldest go when too many are waiting', () => {
    let pending: RunReport[] = [];
    for (let i = 0; i < MAX_PENDING + 3; i += 1) pending = addPending(pending, report(`run-${i}`));
    expect(pending).toHaveLength(MAX_PENDING);
    expect(pending[0].id).toBe('run-3');
  });

  it('sends what is waiting and answers the last profile', async () => {
    const sent: string[] = [];
    const api = fakeApi({
      report: async (run) => {
        sent.push(run.id);
        return profile(sent.length * 10);
      },
    });
    const result = await syncProfile(api, [report('run-0001'), report('run-0002')]);
    expect(sent).toEqual(['run-0001', 'run-0002']);
    expect(result).toEqual({ profile: profile(20), pending: [], online: true });
  });

  it('just reads the profile when nothing is waiting', async () => {
    const result = await syncProfile(fakeApi({ profile: async () => profile(33) }), []);
    expect(result).toEqual({ profile: profile(33), pending: [], online: true });
  });

  it('keeps the runs when the server does not answer', async () => {
    const api = fakeApi({
      report: async (run) => {
        if (run.id === 'run-0002') throw new ApiError('network', 0);
        return profile(10);
      },
    });
    const waiting = [report('run-0001'), report('run-0002'), report('run-0003')];
    const result = await syncProfile(api, waiting);
    expect(result.online).toBe(false);
    expect(result.profile).toBeUndefined();
    expect(result.pending.map((r) => r.id)).toEqual(['run-0002', 'run-0003']);
  });

  it('drops a run the server refuses and goes on', async () => {
    const api = fakeApi({
      report: async (run) => {
        if (run.id === 'run-0001') throw new ApiError('invalid_run', 400);
        return profile(10);
      },
    });
    const result = await syncProfile(api, [report('run-0001'), report('run-0002')]);
    expect(result).toEqual({ profile: profile(10), pending: [], online: true });
  });
});
