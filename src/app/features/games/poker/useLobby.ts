import { useCallback, useEffect, useMemo } from 'react';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { POLL_INTERVAL_MS } from '../../friends/useFriends';
import { createLatestGate } from '../../friends/latestGate';
import { createPokerApi } from './api';
import type { LobbyList } from './types';

export const pokerLobbyAtom = atom<LobbyList | undefined>(undefined);

// Shared by the poller and the on-demand refreshes so only the newest response is applied.
const beginRefresh = createLatestGate();

const useRefresh = () => {
  const mx = useMatrixClient();
  const api = useMemo(() => createPokerApi(() => mx.getAccessToken()), [mx]);
  const setList = useSetAtom(pokerLobbyAtom);
  return useCallback(async () => {
    const isLatest = beginRefresh();
    try {
      const list = await api.list();
      if (isLatest()) setList(list);
    } catch {
      // Keeps the last list; the next poll tries again.
    }
  }, [api, setList]);
};

// Mount once (sidebar). Other consumers use useLobby() only.
export const useLobbyPoller = (): void => {
  const refresh = useRefresh();

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, POLL_INTERVAL_MS);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);
};

export const useLobby = (): { list?: LobbyList; refresh: () => Promise<void> } => {
  const list = useAtomValue(pokerLobbyAtom);
  const refresh = useRefresh();
  return { list, refresh };
};
