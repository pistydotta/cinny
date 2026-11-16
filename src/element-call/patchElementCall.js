// The layout reads screen shares from this list, so it goes through blazeroomShares and only
// sees the ones being watched. The small picture of the speaker over a share (pip$, ce) goes away
// while blazeroomShares.pipHidden() says so. The names are the bundle's own minified ones: IJ is
// combineLatest, W is map and PJ is of. Without the script, every share shows as it does upstream.
const ORIGINAL = 'j.pipe(ZJ(e=>e.length>0?PJ({spotlight:e,pip$:ce}):';
const PATCHED =
  'IJ([j,window.blazeroomShares?.changes??PJ(0)]).pipe(W(([e])=>window.blazeroomShares?.layoutShares(e)??e),ZJ(e=>e.length>0?PJ({spotlight:e,pip$:IJ([ce,window.blazeroomShares?.changes??PJ(0)]).pipe(W(([t])=>window.blazeroomShares?.pipHidden?.()?void 0:t))}):';

// Each remote person's microphone volume goes through blazeroomVoices (voiceVolume.js), so the
// sidebar's per-person mute and volume apply on top of Element Call's own. IJ is combineLatest.
const VOICE_ORIGINAL = 'sink$:e.behavior(n.participant$.pipe(W(e=>t=>e?.setVolume(t))))';
const VOICE_PATCHED =
  'sink$:e.behavior(IJ([n.participant$,window.blazeroomVoices?.changes??PJ(0)]).pipe(W(([e])=>{window.blazeroomVoices?.observeParticipant?.(n.userId,n,e);return t=>e?.setVolume(window.blazeroomVoices?.volumeFor(n.userId,t)??t)})))';

// A watched share on a wide window always fills the room edge to edge, with the others' cameras
// beside it (the screen script hides the expand button, which would do nothing). Hiding the people
// (blazeroomShares.peopleHidden) switches to the share alone. Te is spotlight-expanded, Ce
// spotlight-landscape, ye whether Element Call's expand is on (ignored), KJ distinctUntilChanged.
const EXPAND_ORIGINAL = 'ye.pipe(ZJ(e=>e?Te(!1):Ce(!1)))';
const EXPAND_PATCHED =
  'IJ([ye,window.blazeroomShares?.changes??PJ(0)]).pipe(W(()=>!!window.blazeroomShares?.pipHidden?.()),KJ(),ZJ(e=>e?Te(!0):Ce(!0)))';

// Element Call's chosen mic and speaker settings, so a change from the app's audio menu applies
// to the call in progress (setValue also saves them where the next call reads them). vKe and
// yKe are the audio-input and audio-output settings, declared in one var list.
const DEVICES_ORIGINAL = 'yKe=new eY(`audio-output`,void 0),';
const DEVICES_PATCHED =
  'yKe=new eY(`audio-output`,void 0),$blazeroomDevices=window.blazeroomDeviceSettings={audioInput:vKe,audioOutput:yKe},';

// A short window (600px tall or less, like a laptop with the browser's bars) is Element Call's
// "flat" mode, which always shows a watched share expanded with only the speaker's camera over
// it: nobody sees their own camera and the sharer's covers the share. With someone else's share
// in the spotlight (pe) it gets the same layout as a wide window: every camera beside the share,
// or the share alone while the people are hidden. Without one, flat keeps its upstream layout.
const FLAT_ORIGINAL =
  'case`flat`:return xe.pipe(ZJ(e=>{switch(e){case`grid`:return Ce(!0);case`spotlight`:return Te(!0)}}))';
const FLAT_PATCHED =
  'case`flat`:return xe.pipe(ZJ(e=>{switch(e){case`grid`:return Ce(!0);case`spotlight`:return IJ([pe,window.blazeroomShares?.changes??PJ(0)]).pipe(W(([t])=>t&&!window.blazeroomShares?.pipHidden?.()),KJ(),ZJ(t=>t?Ce(!0):Te(!0)))}}))';

// A narrow window (the floating viewer, a phone) is Element Call's "narrow" mode, which shows a
// share as one tile among the cameras. While the share has to show alone (the floating viewer,
// or the people hidden) it is expanded there too. Oe is the one-on-one portrait layout.
const NARROW_ORIGINAL =
  'case`narrow`:return Oe.pipe(ZJ(e=>e===null?IJ([le,fe],(e,t)=>e.length>uot||t.some(e=>e.type===`screen share`)?we:Se).pipe(lKe()):PJ(e)));';
const NARROW_PATCHED =
  'case`narrow`:return IJ([pe,window.blazeroomShares?.changes??PJ(0)]).pipe(W(([t])=>!!t&&!!window.blazeroomShares?.pipHidden?.()),KJ(),ZJ(t=>t?Te(!0):Oe.pipe(ZJ(e=>e===null?IJ([le,fe],(e,t)=>e.length>uot||t.some(e=>e.type===`screen share`)?we:Se).pipe(lKe()):PJ(e)))));';

// A share the person isn't watching yet takes a tile in the people's grid, right after its
// sharer, as on Discord: blazeroomShares.gridShares adds a stand-in for it to the grid list (le),
// and the grid tile (GridTile) draws the stand-in as an empty box Cinny covers with the share's
// picture and Watch button (LiveTiles.tsx). j is the list of every share, Bit the animated div
// the other tiles use, so the box moves with the grid.
const GRID_ORIGINAL =
  'le=e.behavior(ne.pipe(ZJ(e=>{let t=e.map(e=>e.bin$.pipe(W(t=>[e,t])));return t.length===0?PJ([]):IJ(t,(...e)=>e.sort(([,e],[,t])=>e-t).map(([e])=>e))}),KJ(r9)))';
const GRID_PATCHED =
  'le=e.behavior(IJ([ne.pipe(ZJ(e=>{let t=e.map(e=>e.bin$.pipe(W(t=>[e,t])));return t.length===0?PJ([]):IJ(t,(...e)=>e.sort(([,e],[,t])=>e-t).map(([e])=>e))})),j,window.blazeroomShares?.changes??PJ(0)]).pipe(W(([e,t])=>window.blazeroomShares?.gridShares?.(e,t)??e),KJ(r9)))';
const TILE_ORIGINAL =
  'return o.type===`ringing`?(0,B.jsx)(Kit,{ref:a,vm:o,displayName:s,mxcAvatarUrl:c,...i})';
const TILE_PATCHED =
  'return o.type===`blazeroom share`?(0,B.jsx)(Bit.div,{ref:a,className:i.className,style:i.style,"data-blazeroom-share":o.shareId}):o.type===`ringing`?(0,B.jsx)(Kit,{ref:a,vm:o,displayName:s,mxcAvatarUrl:c,...i})';

// With two people in the call, Element Call puts the other one big and you small in a corner of
// their tile. Without a camera on either side that is two avatars, one inside the other, so the
// one-on-one layouts (Ee feeds both) give way to the grid: two cards the same size. A ringing
// stand-in has no camera to watch and keeps the upstream layout.
const ONE_ON_ONE_ORIGINAL = 'return PJ(null)})),De=Ee.pipe(';
const ONE_ON_ONE_PATCHED =
  'return PJ(null)}),ZJ(e=>e===null||!e.remote.videoEnabled$?PJ(e):IJ([e.local.videoEnabled$,e.remote.videoEnabled$]).pipe(W(([t,n])=>t||n?e:null),KJ()))),De=Ee.pipe(';

const replaceOnce = (source, [original, patched, what]) => {
  const at = source.indexOf(original);
  if (at === -1) throw new Error(`Element Call bundle: ${what} text not found`);
  if (source.indexOf(original, at + 1) !== -1) {
    throw new Error(`Element Call bundle: ${what} text found more than once`);
  }
  return source.slice(0, at) + patched + source.slice(at + original.length);
};

const PATCHES = [
  [ORIGINAL, PATCHED, 'share layout'],
  [VOICE_ORIGINAL, VOICE_PATCHED, 'voice volume'],
  [EXPAND_ORIGINAL, EXPAND_PATCHED, 'expanded share'],
  [DEVICES_ORIGINAL, DEVICES_PATCHED, 'audio devices'],
  [FLAT_ORIGINAL, FLAT_PATCHED, 'flat share'],
  [NARROW_ORIGINAL, NARROW_PATCHED, 'narrow share'],
  [GRID_ORIGINAL, GRID_PATCHED, 'grid share'],
  [TILE_ORIGINAL, TILE_PATCHED, 'share tile'],
  [ONE_ON_ONE_ORIGINAL, ONE_ON_ONE_PATCHED, 'one-on-one'],
];

// Throws so that upgrading Element Call fails the build instead of silently bringing the old
// behaviour back.
/** @param {string} source @returns {string} */
export const patchElementCall = (source) => PATCHES.reduce(replaceOnce, source);
