import React, { useEffect, useRef, useState } from 'react';
import { Icon, Icons } from 'folds';
import classNames from 'classnames';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';
import { useShares } from './useShares';
import { saveVolume } from './watchRules';
import * as css from './styles.css';

type Rect = { top: number; left: number; width: number };
const sameRect = (a: Rect | null, b: Rect | null) =>
  a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width);

// How long the controls stay after the pointer stops moving over the call.
const IDLE_MS = 2500;

// Where Element Call draws the watched share, in this page's coordinates. Its spotlight tile is
// the parent of the corner buttons; the iframe is the same origin, so its document is readable.
const shareRect = (callEmbed: CallEmbed): Rect | null => {
  const tile = callEmbed.document
    ?.querySelector('[class*="_bottomRightButtons_"]')
    ?.parentElement?.getBoundingClientRect();
  if (!tile || tile.width === 0) return null;
  const frame = callEmbed.iframe.getBoundingClientRect();
  return { top: frame.top + tile.top, left: frame.left + tile.left, width: tile.width };
};

// The watched share's sound, the people column and stop watching, over the top of the share in
// the call room, the way a video player keeps its controls on the video. They show while the
// pointer moves over the call and fade out after a moment, like the call's own name tags.
export function LiveOverlay({ callEmbed }: { callEmbed: CallEmbed }) {
  const { store, remotes } = useShares(callEmbed.control);
  const watched = remotes.filter((share) => share.watching);
  const peopleHidden = store?.getSnapshot().peopleHidden ?? false;
  const [rect, setRect] = useState<Rect | null>(null);
  const [awake, setAwake] = useState(true);
  const [held, setHeld] = useState(false);
  const active = watched.length > 0;

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

  // The pointer is over the iframe, so listen in its document.
  useEffect(() => {
    if (!active) return undefined;
    const doc = callEmbed.document;
    let timer = window.setTimeout(() => setAwake(false), IDLE_MS);
    const wake = () => {
      setAwake(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setAwake(false), IDLE_MS);
    };
    doc?.addEventListener('pointermove', wake);
    doc?.addEventListener('pointerdown', wake);
    return () => {
      window.clearTimeout(timer);
      doc?.removeEventListener('pointermove', wake);
      doc?.removeEventListener('pointerdown', wake);
    };
  }, [active, callEmbed]);

  // Unwatching everything brings the people back for the next share.
  useEffect(() => {
    if (!active) store?.setPeopleHidden(false);
  }, [active, store]);

  if (!store || !active || !rect) return null;

  return (
    <div
      className={classNames(css.LiveOverlay, (awake || held) && css.LiveOverlayShown)}
      style={{ top: rect.top, left: rect.left, width: rect.width }}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      {watched.map((share, i) => (
        <div key={share.id} className={css.LiveOverlayBar}>
          {share.hasSound && (
            <>
              <TipIconButton
                label={
                  share.muted
                    ? tr('screen_share.unmute', 'Unmute share')
                    : tr('screen_share.mute', 'Mute share')
                }
                className={share.muted ? undefined : css.LiveOverlayButton}
                variant={share.muted ? 'Warning' : 'Secondary'}
                fill="None"
                size="300"
                radii="Pill"
                onClick={() => store.setMuted(share.id, !share.muted)}
              >
                <Icon size="200" src={share.muted ? Icons.VolumeMute : Icons.VolumeHigh} />
              </TipIconButton>
              <input
                className={classNames(css.Slider, css.LiveOverlaySlider)}
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={share.muted ? 0 : share.volume}
                aria-label={tr('screen_share.volume', 'Share volume')}
                onChange={(evt) => {
                  const volume = Number(evt.currentTarget.value);
                  if (share.muted && volume > 0) store.setMuted(share.id, false);
                  store.setVolume(share.id, volume);
                }}
                onPointerUp={(evt) =>
                  saveVolume(() => localStorage, Number(evt.currentTarget.value))
                }
                onKeyUp={(evt) => saveVolume(() => localStorage, Number(evt.currentTarget.value))}
              />
              <span className={css.LiveOverlayDivider} />
            </>
          )}
          {i === 0 && (
            <TipIconButton
              label={
                peopleHidden
                  ? tr('screen_share.show_people', 'Show people')
                  : tr('screen_share.hide_people', 'Hide people')
              }
              aria-pressed={peopleHidden}
              className={css.LiveOverlayButton}
              variant="Secondary"
              fill="None"
              size="300"
              radii="Pill"
              onClick={() => store.setPeopleHidden(!peopleHidden)}
            >
              <Icon size="200" src={Icons.User} filled={!peopleHidden} />
            </TipIconButton>
          )}
          <TipIconButton
            label={tr('screen_share.stop_watching', 'Stop watching')}
            variant="Critical"
            fill="Solid"
            size="300"
            radii="Pill"
            onClick={() => store.unwatch(share.id)}
          >
            <Icon size="200" src={Icons.EyeBlind} />
          </TipIconButton>
        </div>
      ))}
    </div>
  );
}
