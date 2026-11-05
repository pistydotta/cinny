// The layout reads screen shares from this list, so it goes through blazeroomShares and only
// sees the ones being watched. The names are the bundle's own minified ones: IJ is combineLatest,
// W is map and PJ is of. Without the script, every share shows as it does upstream.
const ORIGINAL = 'j.pipe(ZJ(e=>e.length>0?PJ({spotlight:e,pip$:ce}):';
const PATCHED =
  'IJ([j,window.blazeroomShares?.changes??PJ(0)]).pipe(W(([e])=>window.blazeroomShares?.layoutShares(e)??e),ZJ(e=>e.length>0?PJ({spotlight:e,pip$:ce}):';

// Each remote person's microphone volume goes through blazeroomVoices (voiceVolume.js), so the
// sidebar's per-person mute and volume apply on top of Element Call's own. IJ is combineLatest.
const VOICE_ORIGINAL = 'sink$:e.behavior(n.participant$.pipe(W(e=>t=>e?.setVolume(t))))';
const VOICE_PATCHED =
  'sink$:e.behavior(IJ([n.participant$,window.blazeroomVoices?.changes??PJ(0)]).pipe(W(([e])=>t=>e?.setVolume(window.blazeroomVoices?.volumeFor(n.userId,t)??t))))';

const replaceOnce = (source, original, patched, what) => {
  const at = source.indexOf(original);
  if (at === -1) throw new Error(`Element Call bundle: ${what} text not found`);
  if (source.indexOf(original, at + 1) !== -1) {
    throw new Error(`Element Call bundle: ${what} text found more than once`);
  }
  return source.slice(0, at) + patched + source.slice(at + original.length);
};

// Throws so that upgrading Element Call fails the build instead of silently bringing the old
// behaviour back.
export const patchElementCall = (source) =>
  replaceOnce(
    replaceOnce(source, ORIGINAL, PATCHED, 'share layout'),
    VOICE_ORIGINAL,
    VOICE_PATCHED,
    'voice volume'
  );
