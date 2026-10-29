import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useAccountData } from '../../../hooks/useAccountData';
import {
  buyInUpdate,
  cashOutUpdate,
  createGameWallet,
  GAME_WALLET_EVENT,
  GameWallet,
  GameWalletContent,
  parseGameWallet,
  recoverUpdate,
  syncTableUpdate,
  WalletUpdate,
} from './gameWallet';

/**
 * Game wallet stored in the user's Matrix account data, so it follows the account across devices.
 *
 * Account data is private to the user but written by their own client, so it is not tamper-proof.
 * It is fine for play money between friends; real stakes need a server that owns the balances.
 */
export const useMatrixGameWallet = (): GameWallet => {
  const mx = useMatrixClient();
  const event = useAccountData(GAME_WALLET_EVENT);
  const remote = useMemo(() => parseGameWallet(event?.getContent()), [event]);

  const [local, setLocal] = useState<GameWalletContent>();
  const current =
    local && (!remote || local.updatedAt >= remote.updatedAt) ? local : remote ?? local;

  const latestRef = useRef(current);
  latestRef.current = current;
  // Serialize writes so quick successive updates never read a stale balance.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  const update = useCallback(
    (fn: WalletUpdate): Promise<GameWalletContent> => {
      const run = async () => {
        const base = latestRef.current ?? createGameWallet(Date.now());
        const next = { ...fn(base), updatedAt: Math.max(Date.now(), base.updatedAt + 1) };
        latestRef.current = next;
        setLocal(next);
        await mx.setAccountData(GAME_WALLET_EVENT as any, next as any);
        return next;
      };
      const result = queueRef.current.then(run, run);
      queueRef.current = result.catch(() => undefined);
      return result;
    },
    [mx]
  );

  // First time the user opens the games: give them the starting coins.
  useEffect(() => {
    if (!event) {
      update((wallet) => wallet);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(
    () => ({
      ready: !!current,
      balance: current?.balance ?? 0,
      atTable: current?.atTable ?? 0,
      buyIn: async (amount) => {
        await update(buyInUpdate(amount));
      },
      syncTable: async (stack) => {
        await update(syncTableUpdate(stack));
      },
      cashOut: async (stack) => {
        await update(cashOutUpdate(stack));
      },
      recoverTableChips: async () => {
        const amount = latestRef.current?.atTable ?? 0;
        if (amount > 0) await update(recoverUpdate);
        return amount;
      },
    }),
    [current, update]
  );
};
