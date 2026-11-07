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
  'sink$:e.behavior(IJ([n.participant$,window.blazeroomVoices?.changes??PJ(0)]).pipe(W(([e])=>{window.blazeroomVoices?.observeParticipant?.(n.userId,n,e);return t=>e?.setVolume(window.blazeroomVoices?.volumeFor(n.userId,t)??t)})))';

// Expanding a share on a wide window swaps Element Call's spotlight-expanded layout (the share and
// one small picture) for the edge-to-edge spotlight layout, so the others' cameras stay beside the
// share. Te is spotlight-expanded, Ce spotlight-landscape and ye whether the share is expanded.
const EXPAND_ORIGINAL = 'ye.pipe(ZJ(e=>e?Te(!1):Ce(!1)))';
const EXPAND_PATCHED = 'ye.pipe(ZJ(e=>e?Ce(!0):Ce(!1)))';

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
    replaceOnce(
      replaceOnce(source, ORIGINAL, PATCHED, 'share layout'),
      VOICE_ORIGINAL,
      VOICE_PATCHED,
      'voice volume'
    ),
    EXPAND_ORIGINAL,
    EXPAND_PATCHED,
    'expanded share'
  );
