import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon, Icons, Text } from 'folds';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { tr } from '../translation/tr';
import { useShares } from './useShares';
import { readSavedVolume } from './watchRules';
import * as css from './styles.css';

type Box = { top: number; left: number; width: number; height: number };
type Boxes = { frame: Box; tiles: Record<string, Box> };

const boxOf = (rect: DOMRect, dx = 0, dy = 0): Box => ({
  top: Math.round(rect.top + dy),
  left: Math.round(rect.left + dx),
  width: Math.round(rect.width),
  height: Math.round(rect.height),
});
// A play triangle with rounded corners, nudged right so its weight looks centred.
function WatchPlay() {
  return (
    <svg width="10" height="11" viewBox="0 0 10 11" aria-hidden="true" style={{ marginLeft: 2 }}>
      <path
        d="M1.5 1.6v7.8c0 .8.9 1.3 1.6.9l6-3.9c.6-.4.6-1.3 0-1.7l-6-3.9C2.4.3 1.5.8 1.5 1.6z"
        fill="currentColor"
      />
    </svg>
  );
}

const sameBox = (a?: Box, b?: Box) =>
  !!a &&
  !!b &&
  a.top === b.top &&
  a.left === b.left &&
  a.width === b.width &&
  a.height === b.height;
const sameBoxes = (a: Boxes | null, b: Boxes) =>
  !!a &&
  sameBox(a.frame, b.frame) &&
  Object.keys(a.tiles).length === Object.keys(b.tiles).length &&
  Object.entries(b.tiles).every(([id, box]) => sameBox(a.tiles[id], box));

// Where the call frame is and, inside it, the empty grid tile Element Call keeps for each share
// not watched yet (patchElementCall.js), in the frame's own coordinates.
const readBoxes = (callEmbed: CallEmbed): Boxes => {
  const frame = callEmbed.iframe.getBoundingClientRect();
  const tiles: Record<string, Box> = {};
  callEmbed.document?.querySelectorAll<HTMLElement>('[data-blazeroom-share]').forEach((el) => {
    const id = el.dataset.blazeroomShare;
    const rect = el.getBoundingClientRect();
    if (id && rect.width > 0) tiles[id] = boxOf(rect);
  });
  return { frame: boxOf(frame), tiles };
};

// A share someone is live with that this person isn't watching yet: its tile in the call's grid,
// with the share's last picture and a play button. The tile itself is Element Call's, so it is
// sized and placed like a person's; this draws over it, clipped to the call frame for a grid
// that scrolls.
export function LiveTiles({ callEmbed }: { callEmbed: CallEmbed }) {
  const { store, remotes } = useShares(callEmbed.control);
  const waiting = remotes.filter((share) => !share.watching);
  const active = waiting.length > 0;
  const host = callEmbed.iframe.parentElement;
  const [boxes, setBoxes] = useState<Boxes | null>(null);

  // The grid moves its tiles with the window and the people coming and going, without telling
  // this page, so follow them every frame while a share waits.
  const boxesRef = useRef<Boxes | null>(null);
  useEffect(() => {
    if (!active) {
      boxesRef.current = null;
      setBoxes(null);
      return undefined;
    }
    let frame = 0;
    const follow = () => {
      const next = readBoxes(callEmbed);
      if (!sameBoxes(boxesRef.current, next)) {
        boxesRef.current = next;
        setBoxes(next);
      }
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, [active, callEmbed]);

  if (!store || !active || !boxes || !host) return null;

  return createPortal(
    <div
      className={css.LiveTiles}
      style={{
        top: boxes.frame.top,
        left: boxes.frame.left,
        width: boxes.frame.width,
        height: boxes.frame.height,
      }}
    >
      {waiting.map((share) => {
        const box = boxes.tiles[share.id];
        if (!box) return null;
        return (
          <button
            key={share.id}
            type="button"
            className={css.LiveTile}
            style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
            onClick={() =>
              store.watch(
                share.id,
                readSavedVolume(() => localStorage)
              )
            }
            aria-label={tr('screen_share.watch_named', "Watch {{name}}'s screen", {
              name: share.name,
            })}
          >
            {share.preview ? (
              <img className={css.LiveTileShot} src={share.preview} alt="" />
            ) : (
              <Icon className={css.LiveTileIcon} size="600" src={Icons.ScreenShare} />
            )}
            <span className={css.LiveBadge}>
              <Text as="span" size="B300">
                {tr('screen_share.badge', 'Live')}
              </Text>
            </span>
            <span className={css.LiveTileFoot} />
            <span className={css.LiveTileName}>
              <Icon size="100" src={Icons.ScreenShare} />
              <Text as="span" size="T300" truncate>
                {share.name}
              </Text>
            </span>
            <span className={css.LiveTileWatch}>
              <WatchPlay />
              <Text as="span" size="B400">
                {tr('screen_share.watch', 'Watch')}
              </Text>
            </span>
          </button>
        );
      })}
    </div>,
    host
  );
}
