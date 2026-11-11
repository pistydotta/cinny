/* eslint-disable no-await-in-loop */
import { ApiError, createApiRequest } from '../../../utils/blazeroomApi';
import { MetaSave } from './engine/meta';
import { CharacterId, MetaUpgradeId, RunState } from './engine/types';

// What lasts between runs lives on the server (blazeroom API, /api/horde), so gold, upgrades
// and records follow the player across devices and feed the ranking. A run itself never needs
// the server: it plays here, and its result is reported when it ends.
//
// Offline, the game still plays. The result is kept in a list in localStorage and sent the next
// time the server answers. Each run has an id made here, so a report sent twice is paid once.

export type HordeProfile = Omit<MetaSave, 'version' | 'character'>;

export type RunReport = {
  id: string;
  seed: number;
  character: CharacterId;
  seconds: number;
  kills: number;
  level: number;
  gold: number;
  won: boolean;
};

export type RankingRow = Omit<RunReport, 'id' | 'seed' | 'gold'> & { userId: string };

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
    async ranking(): Promise<RankingRow[]> {
      const res = await request('/api/horde/ranking', 'GET');
      return ((await res.json()) as { ranking: RankingRow[] }).ranking;
    },
  };
};

export type HordeApi = ReturnType<typeof createHordeApi>;

export const reportOf = (run: RunState, id: string): RunReport => ({
  id,
  seed: run.seed,
  character: run.character,
  seconds: Math.floor(run.time),
  kills: run.kills,
  level: run.player.level,
  gold: Math.round(run.gold),
  won: run.phase === 'won',
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

export const addPending = (pending: RunReport[], run: RunReport): RunReport[] =>
  [...pending, run].slice(-MAX_PENDING);

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
