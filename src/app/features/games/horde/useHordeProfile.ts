import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MetaSave, buyMeta, finishRun } from './engine/meta';
import { CharacterId, MetaUpgradeId, RunState } from './engine/types';
import {
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
          .ranking()
          .then((rows) => alive.current && setRanking(rows))
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

  return { meta, online, ranking, canBuy: !api || online === true, pickCharacter, endRun, buy };
};
