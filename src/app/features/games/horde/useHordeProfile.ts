import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MetaSave, buyMeta, finishRun } from './engine/meta';
import { CharacterId, MetaUpgradeId, RunState } from './engine/types';
import { DailyChallenge, dailyChallenge, utcDay } from './engine/daily';
import {
  RankingQuery,
  RankingRow,
  RunReport,
  addPending,
  createHordeApi,
  parsePending,
  reportOf,
  syncProfile,
  withProfile,
} from './profile';
import { loadMeta, saveMeta } from './runner';

const pendingKey = (userId: string) => `blazeroom.horde.pending:${userId}`;

const loadPending = (userId: string): RunReport[] => {
  try {
    return parsePending(localStorage.getItem(pendingKey(userId)));
  } catch {
    return [];
  }
};

const savePending = (userId: string, pending: RunReport[]) => {
  try {
    localStorage.setItem(pendingKey(userId), JSON.stringify(pending));
  } catch {
    // Private mode or full storage: a run played offline may not be paid, nothing else.
  }
};

// The last day this browser started the daily challenge: later tries that day are practice.
const dailyKey = (userId: string) => `blazeroom.horde.daily:${userId}`;

const readDailyTried = (userId: string): string | undefined => {
  try {
    return localStorage.getItem(dailyKey(userId)) ?? undefined;
  } catch {
    return undefined;
  }
};

const newRunId = (): string =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

// The player's progress: the copy in this browser, kept in step with the server. `online` is
// undefined until the server has answered or failed once. Without `getToken` (no server at all)
// everything stays local.
export const useHordeProfile = (userId: string, getToken?: () => string | null) => {
  const api = useMemo(() => (getToken ? createHordeApi(getToken) : undefined), [getToken]);
  const [meta, setMeta] = useState(() => loadMeta(userId));
  const [online, setOnline] = useState<boolean>();
  const [ranking, setRanking] = useState<RankingRow[]>();
  const [rankingQuery, setRankingQuery] = useState<RankingQuery>({ scope: 'all' });
  const queryRef = useRef(rankingQuery);
  queryRef.current = rankingQuery;
  // Today's challenge: the server's day when it answers, this device's UTC day until then.
  const [daily, setDaily] = useState<DailyChallenge>(() => dailyChallenge(utcDay(Date.now())));
  const [dailyTried, setDailyTried] = useState(() => readDailyTried(userId));
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const alive = useRef(true);

  const update = useCallback(
    (next: MetaSave) => {
      metaRef.current = next;
      setMeta(next);
      saveMeta(userId, next);
    },
    [userId]
  );

  // One sync at a time: two at once could send the same waiting run twice (harmless, the
  // server pays it once) and write the list back in the wrong order (not harmless).
  const syncing = useRef<Promise<void>>(Promise.resolve());
  const sync = useCallback(() => {
    if (!api) return syncing.current;
    syncing.current = syncing.current.then(async () => {
      const result = await syncProfile(api, loadPending(userId));
      savePending(userId, result.pending);
      if (!alive.current) return;
      setOnline(result.online);
      if (result.profile) update(withProfile(metaRef.current, result.profile));
      if (result.online) {
        api
          .ranking(queryRef.current)
          .then((rows) => alive.current && setRanking(rows))
          .catch(() => undefined);
        api
          .daily()
          .then((today) => alive.current && setDaily(today))
          .catch(() => undefined);
      }
    });
    return syncing.current;
  }, [api, userId, update]);

  useEffect(() => {
    alive.current = true;
    sync();
    return () => {
      alive.current = false;
    };
  }, [sync]);

  // Another tab of the ranking.
  const showRanking = useCallback(
    (query: RankingQuery) => {
      setRankingQuery(query);
      queryRef.current = query;
      setRanking(undefined);
      api
        ?.ranking(query)
        .then((rows) => alive.current && setRanking(rows))
        .catch(() => undefined);
    },
    [api]
  );

  // Starting today's challenge spends the day's real try; later ones are practice.
  // A ranked run's recording, to watch it. Undefined when it can't be had (no server, gone).
  const loadReplay = useCallback(
    async (owner: string, runId: string) => {
      try {
        return await api?.replay(owner, runId);
      } catch {
        return undefined;
      }
    },
    [api]
  );

  const startDaily = useCallback((): boolean => {
    const counts = dailyTried !== daily.day;
    try {
      localStorage.setItem(dailyKey(userId), daily.day);
    } catch {
      // Without storage the server still counts only the first try.
    }
    setDailyTried(daily.day);
    return counts;
  }, [daily.day, dailyTried, userId]);

  const pickCharacter = useCallback(
    (character: CharacterId) => update({ ...metaRef.current, character }),
    [update]
  );

  // The gold shows at once from the local sum; the server's profile replaces it when it answers.
  const endRun = useCallback(
    (run: RunState) => {
      update(finishRun(metaRef.current, run));
      if (!api) return;
      savePending(userId, addPending(loadPending(userId), reportOf(run, newRunId())));
      sync();
    },
    [api, userId, update, sync]
  );

  const buy = useCallback(
    async (id: MetaUpgradeId) => {
      if (!api) {
        const bought = buyMeta(metaRef.current, id);
        if (bought) update(bought);
        return;
      }
      try {
        update(withProfile(metaRef.current, await api.buy(id)));
      } catch {
        // Refused or no answer: read what the server has, which also tells if it's reachable.
        await sync();
      }
    },
    [api, update, sync]
  );

  return {
    meta,
    online,
    ranking,
    rankingQuery,
    showRanking,
    daily,
    dailyTried: dailyTried === daily.day,
    startDaily,
    loadReplay,
    canBuy: !api || online === true,
    pickCharacter,
    endRun,
    buy,
  };
};
