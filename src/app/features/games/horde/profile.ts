/* eslint-disable no-await-in-loop */
import { ApiError, createApiRequest } from '../../../utils/blazeroomApi';
import { ENGINE_VERSION } from './engine/data';
import { encodeLog, startOf } from './engine/replay';
import { ReplayPayload } from './engine/replayCheck';
import { MetaSave } from './engine/meta';
import { CharacterId, MetaUpgradeId, RunState } from './engine/types';

// What lasts between runs lives on the server (blazeroom API, /api/horde), so gold, upgrades
// and records follow the player across devices and feed the ranking. A run itself never needs
// the server: it plays here, and its result is reported when it ends.
//
// Offline, the game still plays. The result is kept in a list in localStorage and sent the next
// time the server answers. Each run has an id made here, so a report sent twice is paid once.

type Totals = 'totalKills' | 'heroes' | 'bestTier';

// The server's profile. Totals came later, so an older server may not send them.
export type HordeProfile = Omit<MetaSave, 'version' | 'character' | Totals> &
  Partial<Pick<MetaSave, Totals>>;

export type RunBuild = { weapons: string[]; boletos: string[] };

export type RunReport = {
  id: string;
  seed: number;
  character: CharacterId;
  seconds: number;
  kills: number;
  level: number;
  gold: number;
  won: boolean;
  // The rules version the run was played under (ENGINE_VERSION).
  engine?: number;
  // The difficulty tier picked for the run (0 is normal).
  tier?: number;
  // Weapons and Boletos at the end, like "missile6*" (evolved) or "might5".
  build?: RunBuild;
  // The daily challenge's day, when the run was one.
  daily?: string;
  // Picked up again after the page closed: out of the rankings unless its replay checks out.
  resumed?: boolean;
  // The run's commands, which the server replays to check the report.
  replay?: ReplayPayload;
  // When the run ended (ms since 1970), so runs can't overlap in time.
  endedAt?: number;
};

export type RankingRow = Omit<
  RunReport,
  'id' | 'seed' | 'gold' | 'engine' | 'daily' | 'resumed' | 'replay' | 'endedAt'
> & {
  userId: string;
  runId?: string;
  // true once the server replayed it and got the same result; null while it can't say.
  verified?: boolean | null;
  hasReplay?: boolean;
};

export type RankingQuery = { scope: 'all' | 'week' | 'daily'; hero?: CharacterId; day?: string };

// More runs than this waiting means days offline; the oldest ones are let go.
export const MAX_PENDING = 30;

export const createHordeApi = (
  getToken: () => string | null,
  fetchImpl: typeof fetch = (...args) => fetch(...args)
) => {
  const request = createApiRequest(getToken, fetchImpl);
  return {
    async profile(): Promise<HordeProfile> {
      return (await (await request('/api/horde/profile', 'GET')).json()) as HordeProfile;
    },
    async report(run: RunReport): Promise<HordeProfile> {
      const res = await request('/api/horde/runs', 'POST', run);
      return ((await res.json()) as { profile: HordeProfile }).profile;
    },
    /** Rejects with ApiError `not_enough_gold` or `upgrade_maxed` when it can't be bought. */
    async buy(id: MetaUpgradeId): Promise<HordeProfile> {
      return (await (await request('/api/horde/upgrades', 'POST', { id })).json()) as HordeProfile;
    },
    async daily(): Promise<{ day: string; seed: number; character: CharacterId }> {
      return (await (await request('/api/horde/daily', 'GET')).json()) as {
        day: string;
        seed: number;
        character: CharacterId;
      };
    },
    async replay(userId: string, runId: string): Promise<ReplayPayload & { engine: number }> {
      const params = new URLSearchParams({ user: userId, run: runId });
      const res = await request(`/api/horde/replay?${params}`, 'GET');
      return (await res.json()) as ReplayPayload & { engine: number };
    },
    async ranking(query: RankingQuery = { scope: 'all' }): Promise<RankingRow[]> {
      const params = new URLSearchParams({ scope: query.scope });
      if (query.hero) params.set('hero', query.hero);
      if (query.day) params.set('day', query.day);
      const res = await request(`/api/horde/ranking?${params}`, 'GET');
      return ((await res.json()) as { ranking: RankingRow[] }).ranking;
    },
  };
};

export type HordeApi = ReturnType<typeof createHordeApi>;

export const buildOf = (run: RunState): RunBuild => ({
  weapons: run.weapons.map((w) => `${w.id}${w.level}${w.evolved ? '*' : ''}`),
  boletos: run.passives.map((p) => `${p.id}${p.level}`),
});

export const reportOf = (run: RunState, id: string): RunReport => ({
  id,
  seed: run.seed,
  character: run.character,
  seconds: Math.floor(run.time),
  kills: run.kills,
  level: run.player.level,
  gold: Math.round(run.gold),
  won: run.phase === 'won',
  engine: ENGINE_VERSION,
  tier: run.tier,
  build: buildOf(run),
  ...(run.daily ? { daily: run.daily } : {}),
  ...(run.resumed ? { resumed: true } : {}),
  ...(run.replay
    ? { replay: { start: startOf(run), log: encodeLog(run.replay.log), endTick: run.tick } }
    : {}),
  endedAt: Date.now(),
});

// The server's numbers over the local copy; the hero picked stays this browser's choice.
export const withProfile = (meta: MetaSave, profile: HordeProfile): MetaSave => ({
  ...meta,
  gold: profile.gold,
  upgrades: { ...meta.upgrades, ...profile.upgrades },
  runs: profile.runs,
  wins: profile.wins,
  bestTime: profile.bestTime,
  bestKills: profile.bestKills,
  bestLevel: profile.bestLevel,
  totalKills: profile.totalKills ?? meta.totalKills,
  heroes: profile.heroes ? { ...meta.heroes, ...profile.heroes } : meta.heroes,
  bestTier: profile.bestTier ?? meta.bestTier,
});

export const parsePending = (text: string | null | undefined): RunReport[] => {
  try {
    const list = JSON.parse(text ?? '[]');
    return Array.isArray(list)
      ? list.filter((r) => typeof r?.id === 'string' && typeof r?.seed === 'number')
      : [];
  } catch {
    return [];
  }
};

// Replays are big: only the newest few waiting runs keep theirs (the rest go unchecked), so the
// list stays well inside what a browser stores.
const PENDING_REPLAYS = 5;

export const addPending = (pending: RunReport[], run: RunReport): RunReport[] =>
  [...pending, run].slice(-MAX_PENDING).map((r, i, all) => {
    if (i >= all.length - PENDING_REPLAYS || !r.replay) return r;
    return { ...r, replay: undefined };
  });

export type SyncResult = {
  /** The server's profile, when it answered. */
  profile: HordeProfile | undefined;
  /** Runs still to send. */
  pending: RunReport[];
  online: boolean;
};

// Sends the runs that are waiting, oldest first, and reads the profile. A run the server
// refuses (400) is dropped: sending it again would be refused again. Anything else stops the
// sync, and what wasn't sent waits for the next one.
export const syncProfile = async (api: HordeApi, pending: RunReport[]): Promise<SyncResult> => {
  let left = pending;
  let profile: HordeProfile | undefined;
  try {
    while (left.length > 0) {
      try {
        profile = await api.report(left[0]);
      } catch (e) {
        if (!(e instanceof ApiError) || e.status !== 400) throw e;
      }
      left = left.slice(1);
    }
    return { profile: profile ?? (await api.profile()), pending: left, online: true };
  } catch {
    return { profile: undefined, pending: left, online: false };
  }
};
