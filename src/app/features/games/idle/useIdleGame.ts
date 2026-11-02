import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { IdleRunner, IdleView, getIdleRunner, hasIdleSave } from './runner';

export const useIdleGame = (userId: string): { runner: IdleRunner; view: IdleView } => {
  const runner = useMemo(() => getIdleRunner(userId), [userId]);
  const view = useSyncExternalStore(runner.subscribe, runner.getView);
  return { runner, view };
};

/** From an always-mounted place (the sidebar): keeps an existing game playing on any screen. */
export const useIdleBackground = (userId: string | null) => {
  useEffect(() => {
    if (userId && hasIdleSave(userId)) getIdleRunner(userId);
  }, [userId]);
};
