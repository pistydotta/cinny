import React from 'react';
import { Box, Spinner } from 'folds';
import { useAtom } from 'jotai';
import classNames from 'classnames';
import { floatingCallHiddenAtom } from '../screen-share/FloatingCall';
import { useSelectedRoom } from '../../hooks/router/useSelectedRoom';
import * as css from './styles.css';
import { CallControl } from './CallControl';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { useCallMembers, useCallSession } from '../../hooks/useCall';
import { ScreenSize, useScreenSize } from '../../hooks/useScreenSize';
import { MemberGlance } from './MemberGlance';
import { StatusDivider } from './components';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { useCallJoined } from '../../hooks/useCallEmbed';
import { useCallSpeakers } from '../../hooks/useCallSpeakers';
import { MemberSpeaking } from './MemberSpeaking';
import { LiveBadge } from '../screen-share/LiveBadge';
import { CallPresence } from './CallPresence';

type CallStatusProps = {
  callEmbed: CallEmbed;
};
export function CallStatus({ callEmbed }: CallStatusProps) {
  const [viewerHidden, setViewerHidden] = useAtom(floatingCallHiddenAtom);
  const selectedRoom = useSelectedRoom();
  const { room } = callEmbed;

  const callSession = useCallSession(room);
  const callMembers = useCallMembers(callSession);
  const screenSize = useScreenSize();
  const callJoined = useCallJoined(callEmbed);
  const speakers = useCallSpeakers(callEmbed);

  const compact = screenSize === ScreenSize.Mobile;

  const memberVisible = callJoined && callMembers.length > 0;

  const presence = (
    <CallPresence
      callEmbed={callEmbed}
      viewer={
        callJoined && selectedRoom !== callEmbed.roomId
          ? { hidden: viewerHidden, onShow: () => setViewerHidden(false) }
          : undefined
      }
    />
  );

  return (
    <Box
      className={classNames(css.CallStatus, ContainerColor({ variant: 'Background' }))}
      shrink="No"
      gap="400"
      alignItems={compact ? undefined : 'Center'}
      direction={compact ? 'Column' : 'Row'}
    >
      {/* Everything sits on the right, like Discord's voice panel: who is talking, the faces, then
          the room pill right under where the floating card opens, then the call buttons. */}
      {!compact && <Box grow="Yes" />}
      <Box
        grow={compact ? 'Yes' : 'No'}
        justifyContent={compact ? undefined : 'End'}
        alignItems="Center"
        gap="200"
        style={{ minWidth: 0 }}
      >
        {!compact && speakers.size > 0 && (
          <Box style={{ minWidth: 0 }}>
            <MemberSpeaking room={room} speakers={speakers} />
          </Box>
        )}
        {!memberVisible && <Spinner variant="Secondary" size="200" />}
        <LiveBadge callEmbed={callEmbed} />
        {memberVisible && (
          <Box shrink="No">
            <MemberGlance room={room} members={callMembers} speakers={speakers} />
          </Box>
        )}
      </Box>
      <Box alignItems="Center" gap="300" style={{ minWidth: 0 }}>
        <Box grow={compact ? 'Yes' : 'No'} style={{ minWidth: 0 }}>
          {presence}
        </Box>
        {!compact && <StatusDivider />}
        <Box shrink="No" alignItems="Center" gap="Inherit">
          <CallControl callJoined={callJoined} compact={compact} callEmbed={callEmbed} />
        </Box>
      </Box>
    </Box>
  );
}
