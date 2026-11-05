import React from 'react';
import { Room } from 'matrix-js-sdk';
import { CallMembership } from 'matrix-js-sdk/lib/matrixrtc/CallMembership';
import { Avatar, Box, Icon, Icons, Text, config } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { UserAvatar } from '../../components/user-avatar';
import { getMemberAvatarMxc, getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { uniqueCallUserIds } from './callMembers';

function CallMemberRow({ room, userId }: { room: Room; userId: string }) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const name = getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId;
  const avatarMxc = getMemberAvatarMxc(room, userId);
  const avatarUrl = avatarMxc
    ? mxcUrlToHttp(mx, avatarMxc, useAuthentication, 48, 48) ?? undefined
    : undefined;

  return (
    <Box as="li" alignItems="Center" gap="200" style={{ minWidth: 0 }}>
      <Avatar size="200" radii="Pill">
        <UserAvatar
          userId={userId}
          src={avatarUrl}
          alt=""
          renderFallback={() => <Icon size="50" src={Icons.User} filled />}
        />
      </Avatar>
      <Text size="T300" priority="300" truncate title={name}>
        {name}
      </Text>
    </Box>
  );
}

// Discord-style: who's in the voice room, one row per person under its name.
// Listening controls live in the call bar, not here.
export function CallMemberAvatars({ room, members }: { room: Room; members: CallMembership[] }) {
  const userIds = uniqueCallUserIds(members);
  if (userIds.length === 0) return null;

  return (
    <Box
      as="ul"
      direction="Column"
      gap="100"
      style={{
        listStyle: 'none',
        margin: 0,
        padding: `${config.space.S100} ${config.space.S200} ${config.space.S200} 2.25rem`,
      }}
    >
      {userIds.map((userId) => (
        <CallMemberRow key={userId} room={room} userId={userId} />
      ))}
    </Box>
  );
}
