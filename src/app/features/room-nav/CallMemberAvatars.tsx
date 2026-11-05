import React from 'react';
import { Room } from 'matrix-js-sdk';
import { CallMembership } from 'matrix-js-sdk/lib/matrixrtc/CallMembership';
import { Avatar, Box, Button, Icon, Icons, Text, Tooltip, TooltipProvider, config } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { UserAvatar } from '../../components/user-avatar';
import { getMemberAvatarMxc, getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { uniqueCallUserIds } from './callMembers';
import { tr } from '../translation/tr';
import { useCallEmbed } from '../../hooks/useCallEmbed';
import { useCallControlState } from '../../plugins/call';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { WatchControls } from '../screen-share/WatchControls';

const MAX_SHOWN = 8;

function SidebarCallAudio({ embed }: { embed: CallEmbed }) {
  const { sound } = useCallControlState(embed.control);
  return (
    <Box direction="Column" gap="200">
      <Button size="300" onClick={() => embed.control.toggleSound()} aria-pressed={!sound}>
        {sound
          ? tr('screen_share.mute_call', 'Mute call audio')
          : tr('screen_share.unmute_call', 'Unmute call audio')}
      </Button>
      <WatchControls callEmbed={embed} />
    </Box>
  );
}

function CallMemberAvatar({ room, userId }: { room: Room; userId: string }) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const name = getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId;
  const avatarMxc = getMemberAvatarMxc(room, userId);
  const avatarUrl = avatarMxc
    ? mxcUrlToHttp(mx, avatarMxc, useAuthentication, 48, 48) ?? undefined
    : undefined;

  return (
    <TooltipProvider
      position="Top"
      offset={4}
      tooltip={
        <Tooltip>
          <Text size="T300">{name}</Text>
        </Tooltip>
      }
    >
      {(triggerRef) => (
        <Avatar ref={triggerRef} size="200" radii="Pill" aria-label={name}>
          <UserAvatar
            userId={userId}
            src={avatarUrl}
            alt={name}
            renderFallback={() => <Icon size="50" src={Icons.User} filled />}
          />
        </Avatar>
      )}
    </TooltipProvider>
  );
}

// Discord-style: who's in the voice room, as a row of faces under its name.
export function CallMemberAvatars({ room, members }: { room: Room; members: CallMembership[] }) {
  const embed = useCallEmbed();
  const userIds = uniqueCallUserIds(members);
  if (userIds.length === 0) return null;
  const hidden = userIds.length - MAX_SHOWN;

  return (
    <details style={{ paddingLeft: '2.25rem' }}>
      <summary
        style={{ cursor: 'pointer' }}
        aria-label={tr('screen_share.members', 'Call participants ({{count}})', {
          count: userIds.length,
        })}
      >
        <Box
          wrap="Wrap"
          alignItems="Center"
          gap="100"
          style={{ padding: `${config.space.S100} ${config.space.S200} ${config.space.S200} 0` }}
        >
          {userIds.slice(0, MAX_SHOWN).map((userId) => (
            <CallMemberAvatar key={userId} room={room} userId={userId} />
          ))}
          {hidden > 0 && (
            <Text size="T200" priority="300">
              +{hidden}
            </Text>
          )}
          <Text size="T200">
            {tr('screen_share.people', '{{count}} people · names and audio', {
              count: userIds.length,
            })}
          </Text>
        </Box>
      </summary>
      <Box direction="Column" gap="200" style={{ padding: config.space.S200 }}>
        {userIds.map((userId) => (
          <Text key={userId} size="T300">
            {getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId}
          </Text>
        ))}
        {embed?.roomId === room.roomId && <SidebarCallAudio embed={embed} />}
      </Box>
    </details>
  );
}
