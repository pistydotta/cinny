import React, {
  PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { atom, useSetAtom } from 'jotai';
import { Icon, Icons } from 'folds';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { useCallEmbedPlacementSync, useCallEmbedRef } from '../../hooks/useCallEmbed';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';
import { LiveCards } from './LiveCards';
import { WatchControls } from './WatchControls';
import { useShares } from './useShares';
import { clampPos, FloatingPos, loadPos, savePos } from './floatingPosition';
import * as css from './styles.css';

export const floatingCallHiddenAtom = atom(false);

const viewSize = () => ({ width: window.innerWidth, height: window.innerHeight });

// Repositions the existing iframe; a second call or media connection is never created.
// The iframe shows the watched share by itself, so the box only grows when there is one.
export function FloatingCall({ callEmbed }: { callEmbed: CallEmbed }) {
  const box = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const embedRef = useCallEmbedRef();
  const { remotes } = useShares(callEmbed.control);
  const watching = remotes.some((share) => share.watching);
  const syncEmbed = useCallEmbedPlacementSync(stage);
  const hide = useSetAtom(floatingCallHiddenAtom);
  const { navigateRoom } = useRoomNavigate();

  const [pos, setPos] = useState<FloatingPos | undefined>(loadPos);
  const drag = useRef<{ dx: number; dy: number } | undefined>(undefined);
  const [dragging, setDragging] = useState(false);

  const fit = useCallback((p: FloatingPos): FloatingPos => {
    const el = box.current;
    if (!el) return p;
    return clampPos(p, { width: el.offsetWidth, height: el.offsetHeight }, viewSize());
  }, []);

  // The stage moves without resizing, so the resize observer alone won't move the iframe.
  useLayoutEffect(() => {
    syncEmbed();
  }, [pos, syncEmbed]);

  // Keep a saved spot reachable when the window shrinks or the box grows.
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const refit = () =>
      setPos((p) => {
        if (!p) return p;
        const next = fit(p);
        return next.x === p.x && next.y === p.y ? p : next;
      });
    refit();
    const observer = new ResizeObserver(refit);
    observer.observe(el);
    window.addEventListener('resize', refit);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', refit);
    };
  }, [fit]);

  // While dragging, the iframe must not swallow the pointer.
  useEffect(() => {
    const embed = embedRef.current;
    if (!embed || !dragging) return undefined;
    embed.style.pointerEvents = 'none';
    return () => {
      embed.style.pointerEvents = '';
    };
  }, [dragging, embedRef]);

  const handleDown = (evt: PointerEvent<HTMLDivElement>) => {
    if (evt.button !== 0 || (evt.target as HTMLElement).closest('button')) return;
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    evt.currentTarget.setPointerCapture(evt.pointerId);
    drag.current = { dx: evt.clientX - rect.left, dy: evt.clientY - rect.top };
    setDragging(true);
  };
  const handleMove = (evt: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start) return;
    setPos(fit({ x: evt.clientX - start.dx, y: evt.clientY - start.dy }));
  };
  const handleUp = (evt: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = undefined;
    setDragging(false);
    if (evt.currentTarget.hasPointerCapture(evt.pointerId)) {
      evt.currentTarget.releasePointerCapture(evt.pointerId);
    }
    setPos((p) => {
      savePos(p);
      return p;
    });
  };
  const resetPos = () => {
    savePos(undefined);
    setPos(undefined);
  };

  return (
    <aside
      ref={box}
      className={css.FloatingCall({ watching })}
      style={pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined}
      aria-label={tr('screen_share.floating', 'Floating call viewer')}
    >
      <div
        className={css.FloatingHeader({ dragging })}
        title={tr('screen_share.drag_hint', 'Drag to move. Double-click to put it back.')}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onDoubleClick={resetPos}
      >
        <TipIconButton
          label={tr('screen_share.return_call', 'Return to call')}
          variant="Surface"
          fill="None"
          size="300"
          radii="300"
          onClick={() => navigateRoom(callEmbed.roomId)}
        >
          <Icon size="100" src={Icons.ArrowGoLeft} />
        </TipIconButton>
        <Icon className={css.FloatingGrip} size="100" src={Icons.HorizontalDots} />
        <TipIconButton
          label={tr('screen_share.hide_viewer', 'Hide viewer')}
          variant="Surface"
          fill="None"
          size="300"
          radii="300"
          onClick={() => hide(true)}
        >
          <Icon size="100" src={Icons.Cross} />
        </TipIconButton>
      </div>
      <div ref={stage} className={css.FloatingStage({ watching })} />
      <div className={css.FloatingControls}>
        <LiveCards callEmbed={callEmbed} />
        <WatchControls callEmbed={callEmbed} />
      </div>
    </aside>
  );
}
