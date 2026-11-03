import { useEffect, useState, useSyncExternalStore } from 'react';
import type { LocalShare, RemoteShare, ShareStore } from '../../../element-call/shareState';
import type { CallControl } from '../../plugins/call/CallControl';

const NO_SHARES: RemoteShare[] = [];
const noop = () => () => undefined;

export const useShares = (
  control: CallControl
): { store: ShareStore | undefined; local: LocalShare | null; remotes: RemoteShare[] } => {
  const [store, setStore] = useState<ShareStore | undefined>(() => control.shares);

  // The call page's script isn't there until the iframe loads, and a reload inside makes a new store.
  useEffect(() => {
    const { iframe } = control;
    const update = () => setStore(control.shares);
    update();
    iframe.addEventListener('load', update);
    return () => iframe.removeEventListener('load', update);
  }, [control]);

  const snapshot = useSyncExternalStore(store ? store.subscribe : noop, () => store?.getSnapshot());

  return { store, local: snapshot?.local ?? null, remotes: snapshot?.remotes ?? NO_SHARES };
};
