import React, {
  PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { atom, useSetAtom } from 'jotai';
import { Icon, Icons, Text } from 'folds';
import classNames from 'classnames';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { useCallEmbedPlacementSync, useCallEmbedRef } from '../../hooks/useCallEmbed';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';
import { LiveCards } from './LiveCards';
import { RoomCard } from './RoomPill';
import { useShares } from './useShares';
import { Glyph, RETURN_TO_CALL } from './Glyph';
import {
  clampPos,
  clampWidth,
  FloatingPos,
  loadPos,
  loadWidth,
  savePos,
  saveWidth,
} from './floatingPosition';
import * as css from './styles.css';

export const floatingCallHiddenAtom = atom(false);

const viewSize = () => ({ width: window.innerWidth, height: window.innerHeight });

type Corner = 'nw' | 'ne' | 'sw' | 'se';
const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se'];
type Resize = { corner: Corner; x: number; left: number; top: number; width: number };
type BoxRect = { top: number; left: number; width: number; height: number };

// How long the resize grip stays after the pointer stops moving over the live.
const AWAKE_MS = 2500;

// Repositions the existing iframe; a second call or media connection is never created.
// While a share is watched the box is a small window: a title bar with who is live and the
// buttons, then the share. Any corner resizes it; the iframe sits above the box, so the corners
// are drawn in a layer of their own above it.
export function FloatingCall({ callEmbed }: { callEmbed: CallEmbed }) {
  const box = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const embedRef = useCallEmbedRef();
  const { store, remotes } = useShares(callEmbed.control);
  const watched = remotes.filter((share) => share.watching);
  const watching = watched.length > 0;
  const syncEmbed = useCallEmbedPlacementSync(stage);
  const hide = useSetAtom(floatingCallHiddenAtom);
  const { navigateRoom } = useRoomNavigate();

  const [pos, setPos] = useState<FloatingPos | undefined>(loadPos);
  const drag = useRef<{ dx: number; dy: number } | undefined>(undefined);
  const [dragging, setDragging] = useState(false);
  const [width, setWidth] = useState<number | undefined>(loadWidth);
  const resize = useRef<Resize | undefined>(undefined);
  const [boxRect, setBoxRect] = useState<BoxRect>();
  const [awake, setAwake] = useState(true);
  const sleepTimer = useRef<number>();

  const wake = useCallback(() => {
    setAwake(true);
    window.clearTimeout(sleepTimer.current);
    sleepTimer.current = window.setTimeout(() => setAwake(false), AWAKE_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(sleepTimer.current), []);

  const fit = useCallback((p: FloatingPos): FloatingPos => {
    const el = box.current;
    if (!el) return p;
    return clampPos(p, { width: el.offsetWidth, height: el.offsetHeight }, viewSize());
  }, []);

  // The stage moves without resizing, so the resize observer alone won't move the iframe, and
  // the corners' layer follows the box the same way.
  const readStage = useCallback(() => {
    syncEmbed();
    const rect = box.current?.getBoundingClientRect();
    setBoxRect((old) =>
      rect &&
      !(
        old &&
        old.top === rect.top &&
        old.left === rect.left &&
        old.width === rect.width &&
        old.height === rect.height
      )
        ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
        : old
    );
  }, [syncEmbed]);
  useLayoutEffect(() => {
    readStage();
  }, [pos, width, watching, readStage]);

  // Keep a saved spot reachable when the window shrinks or the box grows.
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const refit = () => {
      setPos((p) => {
        if (!p) return p;
        const next = fit(p);
        return next.x === p.x && next.y === p.y ? p : next;
      });
      readStage();
    };
    refit();
    const observer = new ResizeObserver(refit);
    observer.observe(el);
    window.addEventListener('resize', refit);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', refit);
    };
  }, [fit, readStage]);

  // Keep a saved width inside a window that shrank.
  useEffect(() => {
    const refit = () => setWidth((w) => (w === undefined ? w : clampWidth(w, window.innerWidth)));
    refit();
    window.addEventListener('resize', refit);
    return () => window.removeEventListener('resize', refit);
  }, []);

  // While dragging or resizing, the iframe must not swallow the pointer.
  useEffect(() => {
    const embed = embedRef.current;
    if (!embed || !dragging) return undefined;
    embed.style.pointerEvents = 'none';
    return () => {
      embed.style.pointerEvents = '';
    };
  }, [dragging, embedRef]);

  // The live's bottom corners are rounded like the box it sits in, under the title bar.
  useEffect(() => {
    const embed = embedRef.current;
    if (!embed || !watching) return undefined;
    embed.style.borderRadius = '0 0 11px 11px';
    embed.style.overflow = 'hidden';
    return () => {
      embed.style.borderRadius = '';
      embed.style.overflow = '';
    };
  }, [watching, embedRef]);

  const endGesture = (evt: PointerEvent<HTMLElement>) => {
    setDragging(false);
    if (evt.currentTarget.hasPointerCapture(evt.pointerId)) {
      evt.currentTarget.releasePointerCapture(evt.pointerId);
    }
    setPos((p) => {
      savePos(p);
      return p;
    });
  };

  const handleDown = (evt: PointerEvent<HTMLElement>) => {
    if (evt.button !== 0 || (evt.target as HTMLElement).closest('button')) return;
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    evt.currentTarget.setPointerCapture(evt.pointerId);
    drag.current = { dx: evt.clientX - rect.left, dy: evt.clientY - rect.top };
    setDragging(true);
  };
  const handleMove = (evt: PointerEvent<HTMLElement>) => {
    const start = drag.current;
    if (!start) return;
    setPos(fit({ x: evt.clientX - start.dx, y: evt.clientY - start.dy }));
  };
  const handleUp = (evt: PointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    drag.current = undefined;
    endGesture(evt);
  };
  // The live itself drags the box too. It is the call iframe, so its presses are heard in the
  // call page; once the pointer has moved a few pixels the iframe stops taking it (dragging) and
  // the rest arrives here. A click or double-click without moving stays a click. Only the title
  // bar shows the grab cursor.
  useEffect(() => {
    const frame = callEmbed.control.iframe;
    const doc = frame.contentDocument;
    if (!doc || !watching) return undefined;
    let start: { x: number; y: number; dx: number; dy: number } | undefined;
    let moving = false;
    const pagePoint = (evt: MouseEvent, inFrame: boolean) => {
      if (!inFrame) return { x: evt.clientX, y: evt.clientY };
      const r = frame.getBoundingClientRect();
      return { x: evt.clientX + r.left, y: evt.clientY + r.top };
    };
    const onDown = (evt: MouseEvent) => {
      if (evt.button !== 0 || (evt.target as Element | null)?.closest?.('button')) return;
      const rect = box.current?.getBoundingClientRect();
      if (!rect) return;
      const p = pagePoint(evt, true);
      start = { ...p, dx: p.x - rect.left, dy: p.y - rect.top };
    };
    const onMove = (inFrame: boolean) => (evt: MouseEvent) => {
      if (!start) return;
      const p = pagePoint(evt, inFrame);
      if (!moving) {
        if (Math.hypot(p.x - start.x, p.y - start.y) < 4) return;
        moving = true;
        setDragging(true);
      }
      setPos(fit({ x: p.x - start.dx, y: p.y - start.dy }));
    };
    const onUp = () => {
      start = undefined;
      if (!moving) return;
      moving = false;
      setDragging(false);
      setPos((p) => {
        savePos(p);
        return p;
      });
    };
    const moveInFrame = onMove(true);
    const moveHere = onMove(false);
    doc.addEventListener('mousedown', onDown);
    doc.addEventListener('mousemove', moveInFrame);
    doc.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', moveHere);
    window.addEventListener('mouseup', onUp);
    return () => {
      doc.removeEventListener('mousedown', onDown);
      doc.removeEventListener('mousemove', moveInFrame);
      doc.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', moveHere);
      window.removeEventListener('mouseup', onUp);
    };
  }, [callEmbed, watching, fit]);

  const resetPos = () => {
    savePos(undefined);
    setPos(undefined);
  };

  // A corner sizes the box and the opposite corner stays put. The share keeps its 16:9 stage,
  // so the height follows the width.
  const handleResizeDown = (corner: Corner) => (evt: PointerEvent<HTMLElement>) => {
    if (evt.button !== 0) return;
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    evt.preventDefault();
    evt.stopPropagation();
    evt.currentTarget.setPointerCapture(evt.pointerId);
    resize.current = {
      corner,
      x: evt.clientX,
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: rect.width,
    };
    setPos({ x: Math.round(rect.left), y: Math.round(rect.top) });
    setDragging(true);
  };
  const handleResizeMove = (evt: PointerEvent<HTMLElement>) => {
    const start = resize.current;
    if (!start) return;
    const dx = evt.clientX - start.x;
    const grows = start.corner.endsWith('e') ? dx : -dx;
    const next = clampWidth(start.width + grows, window.innerWidth);
    const change = next - start.width;
    setWidth(next);
    setPos({
      x: start.corner.endsWith('w') ? start.left - change : start.left,
      y: start.corner.startsWith('n') ? Math.round(start.top - (change * 9) / 16) : start.top,
    });
  };
  const handleResizeUp = (evt: PointerEvent<HTMLElement>) => {
    if (!resize.current) return;
    resize.current = undefined;
    setWidth((w) => {
      saveWidth(w);
      return w;
    });
    endGesture(evt);
  };
  const resetSize = () => {
    saveWidth(undefined);
    setWidth(undefined);
  };

  const { roomId } = callEmbed;
  const openCall = () => navigateRoom(roomId);
  const dragHint = tr('screen_share.drag_hint', 'Drag to move. Double-click to put it back.');

  // The box only has room for the share, so the sharer's small picture over it and the tile's
  // own name tag go away. The iframe sits over the stage and takes its pointer, so moving over
  // it and a double click are heard in the call page.
  useEffect(() => {
    if (!store) return undefined;
    store.setPipHidden(true);
    const callDocument = callEmbed.control.iframe.contentDocument;
    const root = callDocument?.documentElement;
    if (root && watching) root.dataset.blazeroomWatching = '';
    const openFromCall = () => navigateRoom(roomId);
    callDocument?.addEventListener('dblclick', openFromCall);
    callDocument?.addEventListener('mousemove', wake);
    return () => {
      store.setPipHidden(false);
      if (root) delete root.dataset.blazeroomWatching;
      callDocument?.removeEventListener('dblclick', openFromCall);
      callDocument?.removeEventListener('mousemove', wake);
    };
  }, [store, callEmbed, roomId, navigateRoom, watching, wake]);

  const hideButton = (
    <TipIconButton
      label={tr('screen_share.minimize', 'Minimize to the call bar')}
      variant="Surface"
      fill="None"
      size="300"
      radii="300"
      onClick={() => hide(true)}
    >
      <Icon size="100" src={Icons.ChevronBottom} />
    </TipIconButton>
  );

  const first = watched[0];
  const names = watched.map((share) => share.name).join(', ');
  const bar = watching && store && (
    <div
      className={css.FloatingBar}
      title={dragHint}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onDoubleClick={resetPos}
      style={dragging ? { cursor: 'grabbing' } : undefined}
    >
      <div className={css.FloatingWho}>
        <span className={css.LiveDot} />
        <Text size="T300" truncate>
          {names}
        </Text>
      </div>
      <div className={css.FloatingButtons}>
        {first?.hasSound && (
          <TipIconButton
            label={
              first.muted
                ? tr('screen_share.unmute', 'Unmute live')
                : tr('screen_share.mute', 'Mute live')
            }
            className={classNames(css.FloatingKey, first.muted && css.FloatingKeyOff)}
            variant="Secondary"
            fill="None"
            size="300"
            radii="300"
            onClick={() => store.setMuted(first.id, !first.muted)}
          >
            <Icon size="100" src={first.muted ? Icons.VolumeMute : Icons.VolumeHigh} />
          </TipIconButton>
        )}
        <TipIconButton
          label={tr('screen_share.return_call', 'Return to call')}
          className={css.FloatingKey}
          variant="Secondary"
          fill="None"
          size="300"
          radii="300"
          onClick={openCall}
        >
          <Glyph d={RETURN_TO_CALL} size={16} />
        </TipIconButton>
        <TipIconButton
          label={tr('screen_share.minimize', 'Minimize to the call bar')}
          className={css.FloatingKey}
          variant="Secondary"
          fill="None"
          size="300"
          radii="300"
          onClick={() => hide(true)}
        >
          <Icon size="100" src={Icons.ChevronBottom} />
        </TipIconButton>
        <TipIconButton
          label={tr('screen_share.stop_watching', 'Stop watching')}
          className={classNames(css.FloatingKey, css.FloatingKeyClose)}
          variant="Secondary"
          fill="None"
          size="300"
          radii="300"
          onClick={() => watched.forEach((share) => store.unwatch(share.id))}
        >
          <Icon size="100" src={Icons.Cross} />
        </TipIconButton>
      </div>
    </div>
  );
  // The corners sit over the iframe too, so they live in a layer of their own above it.
  const corners =
    watching && boxRect
      ? createPortal(
          <div className={css.FloatingChrome} style={boxRect}>
            {CORNERS.map((corner) => (
              <div
                key={corner}
                className={css.FloatingCorner({ corner })}
                title={tr(
                  'screen_share.resize_hint',
                  'Drag to resize. Double-click for the default size.'
                )}
                onPointerDown={handleResizeDown(corner)}
                onPointerMove={handleResizeMove}
                onPointerUp={handleResizeUp}
                onPointerCancel={handleResizeUp}
                onDoubleClick={resetSize}
              />
            ))}
            <span
              className={classNames(css.FloatingGrip, (awake || dragging) && css.FloatingGripAwake)}
            />
          </div>,
          document.body
        )
      : null;

  return (
    <aside
      ref={box}
      className={css.FloatingCall({ watching })}
      style={{
        ...(pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : {}),
        ...(watching && width ? { width } : {}),
      }}
      aria-label={tr('screen_share.floating', 'Floating call viewer')}
    >
      {bar}
      {!watching && (
        <div
          className={css.RoomPill}
          style={dragging ? { cursor: 'grabbing' } : undefined}
          title={dragHint}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
          onDoubleClick={resetPos}
        >
          <RoomCard callEmbed={callEmbed} onOpen={openCall} hideButton={hideButton} />
        </div>
      )}
      <div ref={stage} className={css.FloatingStage({ watching })} onDoubleClick={openCall} />
      {/* Someone else live too: a row to start watching them, under the share. */}
      <LiveCards callEmbed={callEmbed} />
      {corners}
    </aside>
  );
}
