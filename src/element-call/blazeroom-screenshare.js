// Loaded by Element Call's index.html before its own script (see vite.config.js): publishes the
// share state on window, where the patched bundle and Cinny find it.
import { createShareStore, wrapGetDisplayMedia } from './shareState.js';
import { createVoiceStore } from './voiceVolume.js';

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
// only button in that corner that opens a popup (a menu on desktop, a drawer on phones). The
// expand button goes too: a watched share is always expanded (patchElementCall.js). Fullscreen,
// labelled "maximise", stays.
const hideVolumeMenu = document.createElement('style');
hideVolumeMenu.textContent =
  '[class*="_bottomRightButtons_"] > button[aria-haspopup],' +
  ' [class*="_bottomRightButtons_"] > button[class*="_expand_"]:not([aria-label="maximise"])' +
  ' { display: none !important; }';
(document.head ?? document.documentElement).appendChild(hideVolumeMenu);
window.blazeroomShares = store;

// Per-person mute and volume from the sidebar; the patched bundle reads it (voiceVolume.js).
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = undefined;
}
window.blazeroomVoices = createVoiceStore(storage);
