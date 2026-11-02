// Loaded by Element Call's index.html before its own script (see vite.config.js): publishes the
// share state on window, where the patched bundle and Cinny find it.
import { createShareStore, wrapGetDisplayMedia } from './shareState.js';

const store = createShareStore();
const { layoutShares } = store;

// This runs inside Element Call's layout pipeline, where a throw would break the call's layout.
store.layoutShares = (vms) => {
  try {
    return layoutShares(vms);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('blazeroom screen share:', e);
    return vms;
  }
};

if (navigator.mediaDevices?.getDisplayMedia) wrapGetDisplayMedia(navigator.mediaDevices, store);
window.blazeroomShares = store;
