import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon, Icons, Text } from 'folds';
import classNames from 'classnames';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';
import { useShares } from './useShares';
import { LiveCallButtons } from './LiveCallButtons';
import { LivePeople } from './LivePeople';
import { ENTER_FULL, EXIT_FULL, Glyph, PEOPLE } from './Glyph';
import { saveVolume } from './watchRules';
import * as css from './styles.css';

// above/below: free space between the picture and the call's top/bottom edge, where the
// presenter's name and the call buttons float.
type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
  above: number;
  below: number;
};
const sameRect = (a: Rect | null, b: Rect | null) =>
  a === b ||
  (!!a &&
    !!b &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height &&
    a.above === b.above &&
    a.below === b.below);

// The bar hides this long after the pointer last moved over the share.
const IDLE_MS = 2500;
// The people list opens when the pointer comes this close to the share's right edge.
const PEEK_EDGE = 0.14;
const PEEK_EDGE_MIN = 72;
// and closes this long after it leaves, so crossing the gap into the list doesn't drop it.
const PEEK_CLOSE_MS = 220;

// Element Call's spotlight tile: the parent of its corner buttons. Same origin, so readable.
const shareTile = (callEmbed: CallEmbed): HTMLElement | null =>
  callEmbed.document?.querySelector<HTMLElement>('[class*="_bottomRightButtons_"]')
    ?.parentElement ?? null;

// Where the watched picture itself shows, in this page's coordinates. The tile letterboxes it
// (object-fit: contain), so the controls go on the picture, not on the empty strips around it.
const shareRect = (callEmbed: CallEmbed): Rect | null => {
  const tileEl = shareTile(callEmbed);
  const tile = tileEl?.getBoundingClientRect();
  if (!tile || tile.width === 0) return null;
  const frame = callEmbed.iframe.getBoundingClientRect();
  let { width, height } = tile;
  const video = tileEl?.querySelector('video');
  if (video && video.videoWidth > 0 && video.videoHeight > 0) {
    const scale = Math.min(tile.width / video.videoWidth, tile.height / video.videoHeight);
    width = Math.round(video.videoWidth * scale);
    height = Math.round(video.videoHeight * scale);
  }
  const top = Math.round(frame.top + tile.top + (tile.height - height) / 2);
  return {
    top,
    left: Math.round(frame.left + tile.left + (tile.width - width) / 2),
    width,
    height,
    above: top - Math.round(frame.top),
    below: Math.round(frame.bottom - (top + height)),
  };
};

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

// The watched share's controls, as one video-player bar along its bottom edge: who is live,
// the sound, the people column, fullscreen and stop watching. It fades out while the pointer
// rests and comes back when it moves. Rendered inside the call embed's own box, so fullscreen
// of that box keeps the bar.
export function LiveOverlay({ callEmbed }: { callEmbed: CallEmbed }) {
  const { store, remotes } = useShares(callEmbed.control);
  const watched = remotes.filter((share) => share.watching);
  const peopleHidden = store?.getSnapshot().peopleHidden ?? false;
  const [rect, setRect] = useState<Rect | null>(null);
  const [awake, setAwake] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const active = watched.length > 0;
  const host = callEmbed.iframe.parentElement;

  // The share moves with the layout, the window and the column, none of which tell this page,
  // so follow it every frame while something is watched. It is two rect reads.
  const rectRef = useRef<Rect | null>(null);
  useEffect(() => {
    if (!active) {
      rectRef.current = null;
      setRect(null);
      return undefined;
    }
    let frame = 0;
    const follow = () => {
      const next = shareRect(callEmbed);
      if (!sameRect(rectRef.current, next)) {
        rectRef.current = next;
        setRect(next);
      }
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, [active, callEmbed]);

  // Tells the call iframe to drop the tile's own name tag and maximise (blazeroom-screenshare.js).
  useEffect(() => {
    const root = callEmbed.document?.documentElement;
    if (!root || !active) return undefined;
    root.dataset.blazeroomWatching = '';
    return () => {
      delete root.dataset.blazeroomWatching;
    };
  }, [active, callEmbed]);

  // With the people column hidden, who is in the call shows at the share's right edge.
  const rail = active && (peopleHidden || fullscreen);

  // Unwatching everything brings the people back for the next share.
  useEffect(() => {
    if (!active) store?.setPeopleHidden(false);
  }, [active, store]);

  // Pointer movement over the share wakes the chips; they sleep again after IDLE_MS.
  const idleTimer = useRef(0);
  const wake = useCallback(() => {
    setAwake(true);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setAwake(false), IDLE_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(idleTimer.current), []);

  // Reaching the share's right edge opens who is in the call; pointing at the list keeps it.
  const [peek, setPeek] = useState(false);
  const peekTimer = useRef(0);
  const openPeek = useCallback(() => {
    window.clearTimeout(peekTimer.current);
    setPeek(true);
  }, []);
  const closePeek = useCallback(() => {
    window.clearTimeout(peekTimer.current);
    peekTimer.current = window.setTimeout(() => setPeek(false), PEEK_CLOSE_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(peekTimer.current), []);
  useEffect(() => {
    if (!active) setPeek(false);
  }, [active]);

  // Fullscreen shows the share alone; leaving it puts the people back as they were.
  const peopleBefore = useRef(false);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else if (host) {
      host.requestFullscreen().catch(() => undefined);
    }
  }, [host]);
  useEffect(() => {
    const onChange = () => {
      const on = !!host && document.fullscreenElement === host;
      setFullscreen(on);
      if (!store) return;
      if (on) {
        peopleBefore.current = store.getSnapshot().peopleHidden;
        store.setPeopleHidden(true);
      } else {
        store.setPeopleHidden(peopleBefore.current);
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [host, store]);
  useEffect(() => {
    if (!active && document.fullscreenElement === host)
      document.exitFullscreen().catch(() => undefined);
  }, [active, host]);

  // Keys and pointer inside the call iframe don't reach this page, so listen in both.
  const first = watched[0];
  useEffect(() => {
    if (!active || !store) return undefined;
    const doc = callEmbed.document;
    const onKey = (evt: KeyboardEvent) => {
      if (evt.ctrlKey || evt.metaKey || evt.altKey || typing(evt.target)) return;
      const key = evt.key.toLowerCase();
      if (key === 'f') {
        evt.preventDefault();
        toggleFullscreen();
      } else if (key === 'm' && first?.hasSound) {
        evt.preventDefault();
        store.setMuted(first.id, !first.muted);
        wake();
      }
    };
    // Only movement over the share itself, not the rest of the call or the app, wakes them.
    const onMove = (evt: MouseEvent) => {
      const share = rectRef.current;
      if (!share || !shareTile(callEmbed)?.contains(evt.target as Node)) {
        closePeek();
        return;
      }
      wake();
      const x = callEmbed.iframe.getBoundingClientRect().left + evt.clientX;
      const edge = Math.max(PEEK_EDGE_MIN, share.width * PEEK_EDGE);
      if (x >= share.left + share.width - edge) openPeek();
      else closePeek();
    };
    const onDouble = (evt: MouseEvent) => {
      if (shareTile(callEmbed)?.contains(evt.target as Node)) toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    doc?.addEventListener('keydown', onKey);
    doc?.addEventListener('mousemove', onMove);
    doc?.addEventListener('dblclick', onDouble);
    doc?.documentElement.addEventListener('mouseleave', closePeek);
    return () => {
      doc?.documentElement.removeEventListener('mouseleave', closePeek);
      window.removeEventListener('keydown', onKey);
      doc?.removeEventListener('keydown', onKey);
      doc?.removeEventListener('mousemove', onMove);
      doc?.removeEventListener('dblclick', onDouble);
    };
  }, [active, store, callEmbed, first, toggleFullscreen, wake, openPeek, closePeek]);
  useEffect(() => {
    if (active) wake();
  }, [active, wake]);

  if (!store || !active || !rect || !host) return null;

  // Outside the picture, above or below it, the controls cover nothing, so they stay; over it
  // they fade while the pointer rests.
  const topAbove = !fullscreen && rect.above >= 48;
  const topAsleep = !awake && !topAbove;
  const below = !fullscreen && rect.below >= 52 ? rect.below : null;
  const names = watched.map((share) => share.name).join(', ');
  const several = watched.length > 1;

  return createPortal(
    <div
      className={css.LiveOverlay}
      style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
    >
      <div className={css.LiveCorners} onPointerMove={wake}>
        <div
          className={classNames(
            css.LiveTop,
            // A bar of its own above the picture when there's room, so the share stays uncovered.
            topAbove && css.LiveTopBar,
            topAsleep && css.LiveAsleep
          )}
        >
          <div className={classNames(css.LiveChip, css.LiveWho)}>
            <span className={css.LiveDot} />
            <Text size="T300" truncate>
              {names}
            </Text>
            <Text size="T200" className={css.LiveTag}>
              {tr('screen_share.badge', 'Live')}
            </Text>
          </div>
          <div className={css.LiveButtons}>
            {!fullscreen && (
              <TipIconButton
                label={
                  peopleHidden
                    ? tr('screen_share.show_people', 'Show people')
                    : tr('screen_share.hide_people', 'Hide people')
                }
                className={classNames(css.LiveChipButton, peopleHidden && css.LiveOff)}
                variant="Secondary"
                fill="None"
                size="400"
                radii="300"
                onClick={() => store.setPeopleHidden(!peopleHidden)}
              >
                <Glyph d={PEOPLE} />
              </TipIconButton>
            )}
            <TipIconButton
              label={`${
                fullscreen
                  ? tr('screen_share.exit_fullscreen', 'Exit fullscreen')
                  : tr('screen_share.fullscreen', 'Fullscreen')
              } (F)`}
              className={css.LiveChipButton}
              variant="Secondary"
              fill="None"
              size="400"
              radii="300"
              onClick={toggleFullscreen}
            >
              <Glyph d={fullscreen ? EXIT_FULL : ENTER_FULL} />
            </TipIconButton>
            {watched.map((share) => (
              <TipIconButton
                key={share.id}
                label={
                  several
                    ? `${tr('screen_share.stop_watching', 'Stop watching')}: ${share.name}`
                    : tr('screen_share.stop_watching', 'Stop watching')
                }
                className={css.LiveChipButton}
                variant="Secondary"
                fill="None"
                size="400"
                radii="300"
                onClick={() => store.unwatch(share.id)}
              >
                <Icon size="200" src={Icons.Cross} />
              </TipIconButton>
            ))}
          </div>
        </div>
        {/* With the people column showing, the list would only repeat it. */}
        {rail && (
          <LivePeople
            callEmbed={callEmbed}
            open={peek}
            onEnter={openPeek}
            onLeave={closePeek}
            onShowAll={() => {
              // Fullscreen hides the column; leaving it brings the column back instead of what
              // was before.
              if (fullscreen) {
                peopleBefore.current = false;
                document.exitFullscreen().catch(() => undefined);
              } else {
                store.setPeopleHidden(false);
              }
            }}
          />
        )}
        <LiveCallButtons
          callEmbed={callEmbed}
          width={rect.width}
          fullscreen={fullscreen}
          below={below}
          asleep={!awake && below === null}
        >
          <div className={css.LiveSound}>
            {watched
              .filter((share) => share.hasSound)
              .map((share) => (
                <div key={share.id} className={css.LiveVolume}>
                  <TipIconButton
                    label={`${
                      share.muted
                        ? tr('screen_share.unmute', 'Unmute share')
                        : tr('screen_share.mute', 'Mute share')
                    } (M)`}
                    className={classNames(css.LiveChipButton, share.muted && css.LiveOff)}
                    variant="Secondary"
                    fill="None"
                    size="400"
                    radii="300"
                    onClick={() => store.setMuted(share.id, !share.muted)}
                  >
                    <Icon size="200" src={share.muted ? Icons.VolumeMute : Icons.VolumeHigh} />
                  </TipIconButton>
                  <input
                    className={classNames(css.Slider, css.LiveVolumeSlider)}
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={share.muted ? 0 : share.volume}
                    aria-label={
                      several
                        ? `${tr('screen_share.volume', 'Share volume')}: ${share.name}`
                        : tr('screen_share.volume', 'Share volume')
                    }
                    onChange={(evt) => {
                      const volume = Number(evt.currentTarget.value);
                      if (share.muted && volume > 0) store.setMuted(share.id, false);
                      store.setVolume(share.id, volume);
                    }}
                    onPointerUp={(evt) =>
                      saveVolume(() => localStorage, Number(evt.currentTarget.value))
                    }
                    onKeyUp={(evt) =>
                      saveVolume(() => localStorage, Number(evt.currentTarget.value))
                    }
                  />
                </div>
              ))}
          </div>
        </LiveCallButtons>
      </div>
    </div>,
    host
  );
}
