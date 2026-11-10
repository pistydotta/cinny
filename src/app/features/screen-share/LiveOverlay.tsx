import React, { useEffect, useRef, useState } from 'react';
import { Icon, Icons } from 'folds';
import classNames from 'classnames';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';
import { useShares } from './useShares';
import { readControlsDim, saveControlsDim, saveVolume } from './watchRules';
import * as css from './styles.css';

type Rect = { top: number; left: number; width: number; height: number };
const sameRect = (a: Rect | null, b: Rect | null) =>
  a === b ||
  (!!a &&
    !!b &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height);

// Below this the share has no room for buttons at both ends (a phone on its side), so they line
// up at the top instead.
const COMPACT_HEIGHT = 260;
// The buttons spring in one after another.
const STAGGER_MS = 70;

// Where Element Call draws the watched share, in this page's coordinates. Its spotlight tile is
// the parent of the corner buttons; the iframe is the same origin, so its document is readable.
const shareRect = (callEmbed: CallEmbed): Rect | null => {
  const tile = callEmbed.document
    ?.querySelector('[class*="_bottomRightButtons_"]')
    ?.parentElement?.getBoundingClientRect();
  if (!tile || tile.width === 0) return null;
  const frame = callEmbed.iframe.getBoundingClientRect();
  return {
    top: frame.top + tile.top,
    left: frame.left + tile.left,
    width: tile.width,
    height: tile.height,
  };
};

// Stop watching, the people column and the share's sound, as loose buttons over the right edge
// of the watched share in the call room: stop in the top corner, the sound at the bottom.
// They can be faded until pointed at, for a share that needs the whole picture.
export function LiveOverlay({ callEmbed }: { callEmbed: CallEmbed }) {
  const { store, remotes } = useShares(callEmbed.control);
  const watched = remotes.filter((share) => share.watching);
  const peopleHidden = store?.getSnapshot().peopleHidden ?? false;
  const [rect, setRect] = useState<Rect | null>(null);
  const [dim, setDim] = useState(() => readControlsDim(() => localStorage));
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

  // Unwatching everything brings the people back for the next share.
  useEffect(() => {
    if (!active) store?.setPeopleHidden(false);
  }, [active, store]);

  if (!store || !active || !rect) return null;

  let order = 0;
  const springIn = () => {
    order += 1;
    return { animationDelay: `${(order - 1) * STAGGER_MS}ms` };
  };
  const toggleDim = () => {
    setDim(!dim);
    saveControlsDim(() => localStorage, !dim);
  };

  return (
    <div
      className={classNames(
        css.LiveOverlay,
        rect.height < COMPACT_HEIGHT && css.LiveOverlayCompact,
        dim && css.LiveOverlayDim
      )}
      style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
    >
      <div className={css.LiveOverlayGroup}>
        {watched.map((share) => (
          <TipIconButton
            key={share.id}
            label={
              watched.length > 1
                ? `${tr('screen_share.stop_watching', 'Stop watching')}: ${share.name}`
                : tr('screen_share.stop_watching', 'Stop watching')
            }
            className={css.LiveFloatStop}
            style={springIn()}
            variant="Critical"
            fill="Solid"
            size="400"
            radii="Pill"
            onClick={() => store.unwatch(share.id)}
          >
            <Icon size="200" src={Icons.Cross} />
          </TipIconButton>
        ))}
        <TipIconButton
          label={
            dim
              ? tr('screen_share.show_controls', 'Always show controls')
              : tr('screen_share.dim_controls', 'Fade controls')
          }
          aria-pressed={dim}
          className={css.LiveFloat}
          style={springIn()}
          variant="Secondary"
          fill="None"
          size="400"
          radii="Pill"
          onClick={toggleDim}
        >
          <Icon size="200" src={dim ? Icons.Eye : Icons.EyeBlind} />
        </TipIconButton>
      </div>
      <div className={css.LiveOverlayGroup}>
        <TipIconButton
          label={
            peopleHidden
              ? tr('screen_share.show_people', 'Show people')
              : tr('screen_share.hide_people', 'Hide people')
          }
          aria-pressed={peopleHidden}
          className={css.LiveFloat}
          style={springIn()}
          variant="Secondary"
          fill="None"
          size="400"
          radii="Pill"
          onClick={() => store.setPeopleHidden(!peopleHidden)}
        >
          <Icon size="200" src={Icons.User} filled={!peopleHidden} />
        </TipIconButton>
        {watched
          .filter((share) => share.hasSound)
          .map((share) => (
            <div key={share.id} className={css.LiveVolume} style={springIn()}>
              <TipIconButton
                label={
                  share.muted
                    ? tr('screen_share.unmute', 'Unmute share')
                    : tr('screen_share.mute', 'Mute share')
                }
                className={share.muted ? undefined : css.LiveVolumeButton}
                variant={share.muted ? 'Warning' : 'Secondary'}
                fill="None"
                size="400"
                radii="Pill"
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
                  watched.length > 1
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
                onKeyUp={(evt) => saveVolume(() => localStorage, Number(evt.currentTarget.value))}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
