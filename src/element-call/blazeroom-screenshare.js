// Loaded by Element Call's index.html before its own script (see vite.config.js): publishes the
// share state on window, where the patched bundle and Cinny find it.
import { canRetryWithoutSound, createShareStore, wrapGetDisplayMedia } from './shareState.js';
import { createVoiceStore } from './voiceVolume.js';
import { forgeCallCss, keepCallDark } from './forgeCallTheme.js';

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

if (navigator.mediaDevices?.getDisplayMedia) {
  wrapGetDisplayMedia(navigator.mediaDevices, store, {
    retryWithoutSound: canRetryWithoutSound(navigator.userAgent),
  });
}

// Element Call's spotlight tile has its own share volume menu, which changes the volume behind the
// store's back. Cinny's WatchControls are the only volume control, so hide it. Its trigger is the
// only button in that corner that opens a popup (a menu on desktop, a drawer on phones). The
// expand button goes too: a watched share is always expanded (patchElementCall.js). Fullscreen,
// labelled "maximise", stays.
const hideVolumeMenu = document.createElement('style');
hideVolumeMenu.textContent =
  '[class*="_bottomRightButtons_"] > button[aria-haspopup],' +
  ' [class*="_bottomRightButtons_"] > button[class*="_expand_"]:not([aria-label="maximise"])' +
  ' { display: none !important; }' +
  // While Cinny's bar is over a watched share (LiveOverlay sets the flag) it names the presenter
  // and has fullscreen, so the tile's own name tag and maximise would repeat it.
  ' html[data-blazeroom-watching] [class*="_tile_"]:has(> [class*="_bottomRightButtons_"])' +
  ' :is([class*="_nameTag_"], [class*="_bottomRightButtons_"])' +
  ' { display: none !important; }' +
  // The share is letterboxed inside the tile; without the tile's fill those strips vanish into
  // the stage and only the picture shows, with Cinny's controls on it.
  ' html[data-blazeroom-watching] [class*="_tile_"]:has(> [class*="_bottomRightButtons_"])' +
  ' :is(video, [class*="_bg_"]) { background: transparent !important; }';
(document.head ?? document.documentElement).appendChild(hideVolumeMenu);

// Element Call's footer is never shown here (Cinny draws the call controls), but a pointer move
// still "shows" it, and the layout makes room for it: a 24px header filler and a bottom inset
// on the grids, which made the cameras jump when the pointer entered the call.
const steadyLayout = document.createElement('style');
steadyLayout.textContent =
  '[class*="_inRoom_"] > [class*="_filler_"] { display: none !important; }' +
  ' [class*="_fixedGrid_"], [class*="_scrollingGrid_"]' +
  ' { --call-view-safe-area-inset-bottom: env(safe-area-inset-bottom) !important; }';
(document.head ?? document.documentElement).appendChild(steadyLayout);

// The app's own stage, tile and avatar colours (forgeCallTheme.js).
const forgeTheme = document.createElement('style');
forgeTheme.textContent = forgeCallCss();
(document.head ?? document.documentElement).appendChild(forgeTheme);
// Module scripts run once the document is parsed, so <body> is there.
if (document.body) keepCallDark(document.body);

// The grid tile of a share not watched yet (patchElementCall.js) is empty: Cinny draws the share's
// picture over it. Filled and round like the other tiles, for the frame before Cinny catches up.
const shareTile = document.createElement('style');
shareTile.textContent =
  '[data-blazeroom-share] { background: var(--video-tile-background);' +
  ' border-radius: var(--cpd-space-4x, 16px); }';
(document.head ?? document.documentElement).appendChild(shareTile);
window.blazeroomShares = store;

// Per-person mute and volume from the sidebar; the patched bundle reads it (voiceVolume.js).
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = undefined;
}
window.blazeroomVoices = createVoiceStore(storage);
