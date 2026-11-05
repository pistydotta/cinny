import React, { useRef } from 'react';
import { atom, useSetAtom } from 'jotai';
import { Button, Text } from 'folds';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { useCallEmbedPlacementSync } from '../../hooks/useCallEmbed';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { tr } from '../translation/tr';
import { LiveCards } from './LiveCards';
import { WatchControls } from './WatchControls';
import * as css from './styles.css';

export const floatingCallHiddenAtom = atom(false);

// Repositions the existing iframe; a second call or media connection is never created.
export function FloatingCall({ callEmbed }: { callEmbed: CallEmbed }) {
  const stage = useRef<HTMLDivElement>(null);
  useCallEmbedPlacementSync(stage);
  const hide = useSetAtom(floatingCallHiddenAtom);
  const { navigateRoom } = useRoomNavigate();
  return (
    <aside
      className={css.FloatingCall}
      aria-label={tr('screen_share.floating', 'Floating call viewer')}
    >
      <div className={css.FloatingHeader}>
        <Button size="300" onClick={() => navigateRoom(callEmbed.roomId)}>
          <Text size="B300">{tr('screen_share.return_call', 'Return to call')}</Text>
        </Button>
        <Button size="300" onClick={() => hide(true)}>
          <Text size="B300">{tr('screen_share.hide_viewer', 'Hide viewer')}</Text>
        </Button>
      </div>
      <div ref={stage} className={css.FloatingStage} />
      <div className={css.FloatingControls}>
        <LiveCards callEmbed={callEmbed} />
        <WatchControls callEmbed={callEmbed} />
      </div>
    </aside>
  );
}
