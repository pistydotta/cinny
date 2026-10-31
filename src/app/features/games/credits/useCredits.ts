import { useCallback, useMemo } from 'react';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { createCreditsApi } from './creditsApi';

type CreditsState = { balance?: number; atTables: number };

export const creditsAtom = atom<CreditsState>({ atTables: 0 });

// Nothing polls: screens refresh on mount and after what they do.
export const useCredits = (): {
  balance?: number;
  atTables: number;
  refresh: () => Promise<void>;
  topUp: () => Promise<void>;
} => {
  const mx = useMatrixClient();
  const api = useMemo(() => createCreditsApi(() => mx.getAccessToken()), [mx]);
  const { balance, atTables } = useAtomValue(creditsAtom);
  const setState = useSetAtom(creditsAtom);

  const refresh = useCallback(async () => {
    try {
      setState(await api.get());
    } catch {
      // Keeps the last numbers; the next refresh tries again.
    }
  }, [api, setState]);

  // Rejects with the API's error (`at_table`) so the caller can say why.
  const topUp = useCallback(async () => {
    await api.topUp();
    await refresh();
  }, [api, refresh]);

  return { balance, atTables, refresh, topUp };
};
