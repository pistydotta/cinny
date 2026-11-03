// The layout reads screen shares from this list, so it goes through blazeroomShares and only
// sees the ones being watched. The names are the bundle's own minified ones: IJ is combineLatest,
// W is map and PJ is of. Without the script, every share shows as it does upstream.
const ORIGINAL = 'j.pipe(ZJ(e=>e.length>0?PJ({spotlight:e,pip$:ce}):';
const PATCHED =
  'IJ([j,window.blazeroomShares?.changes??PJ(0)]).pipe(W(([e])=>window.blazeroomShares?.layoutShares(e)??e),ZJ(e=>e.length>0?PJ({spotlight:e,pip$:ce}):';

// Throws so that upgrading Element Call fails the build instead of silently bringing the old
// behaviour back.
export const patchElementCall = (source) => {
  const at = source.indexOf(ORIGINAL);
  if (at === -1) throw new Error('Element Call bundle: share layout text not found');
  if (source.indexOf(ORIGINAL, at + 1) !== -1) {
    throw new Error('Element Call bundle: share layout text found more than once');
  }
  return source.slice(0, at) + PATCHED + source.slice(at + ORIGINAL.length);
};
