import React, { useRef } from 'react';
import { atom, useSetAtom } from 'jotai';
import { Icon, Icons } from 'folds';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { useCallEmbedPlacementSync } from '../../hooks/useCallEmbed';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';
import { LiveCards } from './LiveCards';
import { WatchControls } from './WatchControls';
import { useShares } from './useShares';
import * as css from './styles.css';

export const floatingCallHiddenAtom = atom(false);

// Repositions the existing iframe; a second call or media connection is never created.
// The iframe shows the watched share by itself, so the box only grows when there is one.
export function FloatingCall({ callEmbed }: { callEmbed: CallEmbed }) {
  const stage = useRef<HTMLDivElement>(null);
  const { remotes } = useShares(callEmbed.control);
  const watching = remotes.some((share) => share.watching);
  useCallEmbedPlacementSync(stage);
  const hide = useSetAtom(floatingCallHiddenAtom);
  const { navigateRoom } = useRoomNavigate();
  return (
    <aside
      className={css.FloatingCall({ watching })}
      aria-label={tr('screen_share.floating', 'Floating call viewer')}
    >
      <div className={css.FloatingHeader}>
        <TipIconButton
          label={tr('screen_share.return_call', 'Return to call')}
          variant="Surface"
          fill="Soft"
          size="300"
          radii="300"
          onClick={() => navigateRoom(callEmbed.roomId)}
        >
          <Icon size="100" src={Icons.ArrowGoLeft} />
        </TipIconButton>
        <TipIconButton
          label={tr('screen_share.hide_viewer', 'Hide viewer')}
          variant="Surface"
          fill="Soft"
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
