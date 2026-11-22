import React, { RefObject, useRef } from 'react';
import { Box, color, Icon, Icons, Scroll, Text, toRem } from 'folds';
import { useCallEmbed, useCallJoined, useCallEmbedPlacementSync } from '../../hooks/useCallEmbed';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { PrescreenControls } from './PrescreenControls';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { useRoom } from '../../hooks/useRoom';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { StateEvent } from '../../../types/matrix/room';
import { useCallMembers, useCallSession } from '../../hooks/useCall';
import { CallMemberRenderer } from './CallMemberCard';
import * as css from './styles.css';
import { useLivekitSupport } from '../../hooks/useLivekitSupport';
import { webRTCSupported } from '../../utils/rtc';
import { LiveTiles } from '../screen-share/LiveTiles';
import { LiveOverlay } from '../screen-share/LiveOverlay';
import { ShareBar } from '../screen-share/ShareBar';
import { LiveCallBar } from '../screen-share/LiveCallBar';
import * as shareCss from '../screen-share/styles.css';
import { useShares } from '../screen-share/useShares';
import { CallEmbed } from '../../plugins/call';
import { tr } from '../translation/tr';

function LivekitServerMissingMessage() {
  return (
    <Text style={{ margin: 'auto', color: color.Critical.Main }} size="L400" align="Center">
      {tr('call_view.no_livekit', 'Your homeserver does not support calling.')}
    </Text>
  );
}

function WebRTCMissingError() {
  return (
    <Text style={{ margin: 'auto', color: color.Critical.Main }} size="L400" align="Center">
      {tr(
        'call_view.no_webrtc',
        'Your browser does not support WebRTC, which is required for calling.'
      )}
    </Text>
  );
}

function JoinMessage({
  livekitSupported,
  rtcSupported,
}: {
  livekitSupported?: boolean;
  rtcSupported?: boolean;
}) {
  if (rtcSupported === false) {
    return <WebRTCMissingError />;
  }

  if (livekitSupported === false) {
    return <LivekitServerMissingMessage />;
  }

  return null;
}

function NoPermissionMessage() {
  return (
    <Text style={{ margin: 'auto' }} size="L400" align="Center">
      {tr('call_view.no_permission', 'You don’t have permission to join!')}
    </Text>
  );
}

function CallPrescreen() {
  const mx = useMatrixClient();
  const room = useRoom();
  const livekitSupported = useLivekitSupport();
  const rtcSupported = webRTCSupported();

  const powerLevels = usePowerLevelsContext();
  const creators = useRoomCreators(room);

  const permissions = useRoomPermissions(creators, powerLevels);
  const hasPermission = permissions.stateEvent(
    StateEvent.GroupCallMemberPrefix,
    mx.getSafeUserId()
  );

  const callSession = useCallSession(room);
  const callMembers = useCallMembers(callSession);
  const hasParticipant = callMembers.length > 0;

  const canJoin = hasPermission && livekitSupported && rtcSupported;

  return (
    <Scroll variant="Surface" hideTrack>
      <Box className={css.CallViewContent} alignItems="Center" justifyContent="Center">
        <Box className={css.PrejoinCard} direction="Column" gap="500">
          <Box direction="Column" alignItems="Center" gap="200">
            <span className={css.PrejoinIcon} aria-hidden>
              <Icon src={Icons.VolumeHigh} size="400" />
            </span>
            <h2 className={css.PrejoinTitle}>{room.name}</h2>
            <p className={css.PrejoinStatus}>
              {hasParticipant
                ? tr('call_view.n_in_call', '{{n}} in the call', { n: callMembers.length })
                : tr('call_view.empty', 'Voice chat’s empty — Be the first to hop in!')}
            </p>
          </Box>
          {hasParticipant && (
            <Box direction="Column" gap="100">
              <CallMemberRenderer members={callMembers} />
            </Box>
          )}
          <PrescreenControls canJoin={canJoin} />
          {!hasPermission && <NoPermissionMessage />}
          {hasPermission && (
            <JoinMessage livekitSupported={livekitSupported} rtcSupported={rtcSupported} />
          )}
        </Box>
      </Box>
    </Scroll>
  );
}

// While a share is watched its overlay carries the call's buttons, so the bar under it goes.
function BarUnlessWatching({ callEmbed }: { callEmbed: CallEmbed }) {
  const { remotes } = useShares(callEmbed.control);
  if (remotes.some((share) => share.watching)) return null;
  return <LiveCallBar callEmbed={callEmbed} />;
}

type CallJoinedProps = {
  containerRef: RefObject<HTMLDivElement>;
  joined: boolean;
};
function CallJoined({ joined, containerRef }: CallJoinedProps) {
  const callEmbed = useCallEmbed();

  return (
    <Box grow="Yes" direction="Column" className={shareCss.CallDark}>
      <Box grow="Yes" className={css.CallStage}>
        <Box grow="Yes" ref={containerRef} />
        {callEmbed && joined && <LiveTiles callEmbed={callEmbed} />}
        {callEmbed && joined && <LiveOverlay callEmbed={callEmbed} />}
      </Box>
      {callEmbed && joined && <ShareBar callEmbed={callEmbed} />}
      {callEmbed && joined && <BarUnlessWatching callEmbed={callEmbed} />}
    </Box>
  );
}

export function CallView() {
  const room = useRoom();
  const callContainerRef = useRef<HTMLDivElement>(null);

  const callEmbed = useCallEmbed();
  const callJoined = useCallJoined(callEmbed);

  const currentJoined = callEmbed?.roomId === room.roomId && callJoined;
  useCallEmbedPlacementSync(callContainerRef, currentJoined);

  return (
    <Box
      className={ContainerColor({ variant: 'Surface' })}
      style={{ minWidth: toRem(280) }}
      grow="Yes"
    >
      {!currentJoined && <CallPrescreen />}
      <CallJoined joined={currentJoined} containerRef={callContainerRef} />
    </Box>
  );
}
