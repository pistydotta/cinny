import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { createIdleSaveApi } from './cloudSave';
import { IdleRunner, IdleView, getIdleRunner, hasIdleSave } from './runner';

export const useIdleGame = (userId: string): { runner: IdleRunner; view: IdleView } => {
  const mx = useMatrixClient();
  const runner = useMemo(() => getIdleRunner(userId, () => mx.getAccessToken()), [userId, mx]);
  const view = useSyncExternalStore(runner.subscribe, runner.getView);
  // Opening the game here takes it from any other device that was playing.
  useEffect(() => runner.claim(), [runner]);
  return { runner, view };
};

/**
 * From an always-mounted place (the sidebar): keeps an existing game playing on any screen. On a
 * device that never played, asks the server once whether there's a hero to bring over.
 */
export const useIdleBackground = (userId: string | null) => {
  const mx = useMatrixClient();
  useEffect(() => {
    if (!userId) return undefined;
    const getToken = () => mx.getAccessToken();
    if (hasIdleSave(userId)) {
      getIdleRunner(userId, getToken);
      return undefined;
    }
    let cancelled = false;
    createIdleSaveApi(getToken)
      .get()
      .then((remote) => {
        if (!cancelled && remote.save !== null) getIdleRunner(userId, getToken);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId, mx]);
};
