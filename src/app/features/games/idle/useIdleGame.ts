import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { ClientEvent, MatrixClient, MatrixEvent } from 'matrix-js-sdk';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { IDLE_ACCOUNT_DATA, parseEnvelope } from './cloudSync';
import { CloudSave, IdleRunner, IdleView, getIdleRunner, hasLocalIdleSave } from './runner';

// The save in the account's Matrix account data. Read from the server, not the sync cache:
// the cache can be from the last visit on this device.
const accountDataSave = (mx: MatrixClient): CloudSave => ({
  load: () => mx.getAccountDataFromServer(IDLE_ACCOUNT_DATA as never),
  save: async (envelope) => {
    await mx.setAccountData(IDLE_ACCOUNT_DATA as never, envelope as never);
  },
  watch: (onChange) => {
    const handler = (event: MatrixEvent) => {
      if (event.getType() === IDLE_ACCOUNT_DATA) onChange(event.getContent());
    };
    mx.on(ClientEvent.AccountData, handler);
    return () => {
      mx.removeListener(ClientEvent.AccountData, handler);
    };
  },
});

const runnerFor = (mx: MatrixClient): IdleRunner =>
  getIdleRunner(mx.getUserId() ?? '', accountDataSave(mx));

export const useIdleGame = (): { runner: IdleRunner; view: IdleView } => {
  const mx = useMatrixClient();
  const runner = useMemo(() => runnerFor(mx), [mx]);
  const view = useSyncExternalStore(runner.subscribe, runner.getView);
  return { runner, view };
};

/**
 * From an always-mounted place (the sidebar): keeps a hero playing on any screen. Starts when
 * this browser has a save or the account has one, which a new device learns from its sync.
 */
export const useIdleBackground = () => {
  const mx = useMatrixClient();
  useEffect(() => {
    const userId = mx.getUserId();
    if (!userId) return undefined;
    const accountHasHero = (event?: MatrixEvent) => !!parseEnvelope(event?.getContent())?.save;
    if (hasLocalIdleSave(userId) || accountHasHero(mx.getAccountData(IDLE_ACCOUNT_DATA as never))) {
      runnerFor(mx);
      return undefined;
    }
    const handler = (event: MatrixEvent) => {
      if (event.getType() === IDLE_ACCOUNT_DATA && accountHasHero(event)) runnerFor(mx);
    };
    mx.on(ClientEvent.AccountData, handler);
    return () => {
      mx.removeListener(ClientEvent.AccountData, handler);
    };
  }, [mx]);
};
