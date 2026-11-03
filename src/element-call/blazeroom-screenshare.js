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

// Element Call's spotlight tile has its own share volume menu, which changes the volume behind the
// store's back. Cinny's WatchControls are the only volume control, so hide it. Its trigger is the
// only button in that corner that opens a popup (a menu on desktop, a drawer on phones).
const hideVolumeMenu = document.createElement('style');
hideVolumeMenu.textContent =
  '[class*="_bottomRightButtons_"] > button[aria-haspopup] { display: none !important; }';
(document.head ?? document.documentElement).appendChild(hideVolumeMenu);
window.blazeroomShares = store;
