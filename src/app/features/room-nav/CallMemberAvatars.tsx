import React, { useMemo } from 'react';
import classNames from 'classnames';
import { Room } from 'matrix-js-sdk';
import { CallMembership } from 'matrix-js-sdk/lib/matrixrtc/CallMembership';
import { Avatar, Box, Icon, Icons, Text, config } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { UserAvatar } from '../../components/user-avatar';
import { getMemberAvatarMxc, getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { uniqueCallUserIds } from './callMembers';
import { CallMemberPopout } from '../call-member-card/CallMemberPopout';
import { useCallAudioReports } from '../call-member-card/callAudioStatus';
import { userAudioStatus } from '../call-member-card/audioStatus';
import { tr } from '../translation/tr';
import { useCallEmbed } from '../../hooks/useCallEmbed';
import { useCallSpeakers } from '../../hooks/useCallSpeakers';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import * as css from './styles.css';
import { useShares } from '../screen-share/useShares';
import { readSavedVolume } from '../screen-share/watchRules';

// Someone sharing their screen in the call I'm in: clicking their Live badge watches it.
type LiveShare = { watching: boolean; watch: () => void };

function CallMemberRow({
  room,
  userId,
  muted,
  deafened,
  speaking,
  live,
}: {
  room: Room;
  userId: string;
  muted: boolean;
  deafened: boolean;
  speaking: boolean;
  live?: LiveShare;
}) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const name = getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId;
  const avatarMxc = getMemberAvatarMxc(room, userId);
  const avatarUrl = avatarMxc
    ? mxcUrlToHttp(mx, avatarMxc, useAuthentication, 48, 48) ?? undefined
    : undefined;

  return (
    <Box as="li" alignItems="Center" gap="100" style={{ minWidth: 0 }}>
      <CallMemberPopout room={room} userId={userId}>
        {(open, opened) => (
          <Box
            as="button"
            type="button"
            onClick={open}
            aria-haspopup="menu"
            aria-expanded={opened}
            alignItems="Center"
            gap="200"
            style={{
              width: '100%',
              minWidth: 0,
              padding: 0,
              border: 'none',
              background: 'none',
              color: 'inherit',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Avatar
              size="200"
              radii="Pill"
              className={classNames(
                css.CallMemberAvatar,
                live && !speaking && css.CallMemberLiveRing,
                speaking && css.CallMemberSpeaking
              )}
            >
              <UserAvatar
                userId={userId}
                src={avatarUrl}
                alt=""
                renderFallback={() => <Icon size="50" src={Icons.User} filled />}
              />
            </Avatar>
            <Text
              size="T300"
              priority={speaking ? '500' : '300'}
              className={speaking ? css.CallMemberNameSpeaking : undefined}
              truncate
              title={name}
            >
              {name}
            </Text>
            <Box gap="100" shrink="No" style={{ marginLeft: 'auto', opacity: 0.65 }}>
              {muted && (
                <span
                  role="img"
                  aria-label={tr('call_status.muted', 'Microphone muted')}
                  title={tr('call_status.muted', 'Microphone muted')}
                >
                  <Icon size="50" src={Icons.MicMute} />
                </span>
              )}
              {deafened && (
                <span
                  role="img"
                  aria-label={tr('call_status.deafened', 'Call audio off')}
                  title={tr('call_status.deafened', 'Call audio off')}
                >
                  <Icon size="50" src={Icons.HeadphoneMute} />
                </span>
              )}
            </Box>
          </Box>
        )}
      </CallMemberPopout>
      {live &&
        (live.watching ? (
          <span className={css.CallMemberLive}>{tr('screen_share.badge', 'Live')}</span>
        ) : (
          <button
            type="button"
            className={css.CallMemberLive}
            onClick={live.watch}
            title={tr('screen_share.watch_named', "Watch {{name}}'s screen", { name })}
            aria-label={tr('screen_share.watch_named', "Watch {{name}}'s screen", { name })}
          >
            {tr('screen_share.badge', 'Live')}
          </button>
        ))}
    </Box>
  );
}

// Discord-style: who's in the voice room, one row per person under its name.
// Clicking someone opens a card with their profile and my volume for them.
type ListProps = { room: Room; members: CallMembership[] };
const NOBODY = new Set<string>();
const NO_SHARES = new Map<string, LiveShare>();

function CallMemberList({
  room,
  members,
  speakers,
  live,
}: ListProps & { speakers: Set<string>; live: Map<string, LiveShare> }) {
  const { reports, liveMuted } = useCallAudioReports(room, members);
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
        <CallMemberRow
          key={userId}
          room={room}
          userId={userId}
          {...userAudioStatus(reports, members, userId)}
          muted={liveMuted.get(userId) ?? userAudioStatus(reports, members, userId).muted}
          speaking={speakers.has(userId)}
          live={live.get(userId)}
        />
      ))}
    </Box>
  );
}

// Only the call I'm in can say who is talking and who is live: both come from the call page.
function SpeakingList({ callEmbed, ...props }: ListProps & { callEmbed: CallEmbed }) {
  const { store, remotes } = useShares(callEmbed.control);
  const live = useMemo(() => {
    const byUser = new Map<string, LiveShare>();
    remotes.forEach((share) => {
      if (byUser.get(share.userId)?.watching === false) return;
      byUser.set(share.userId, {
        watching: share.watching,
        watch: () =>
          store?.watch(
            share.id,
            readSavedVolume(() => localStorage)
          ),
      });
    });
    return byUser;
  }, [remotes, store]);
  return <CallMemberList {...props} speakers={useCallSpeakers(callEmbed)} live={live} />;
}

export function CallMemberAvatars({ room, members }: ListProps) {
  const callEmbed = useCallEmbed();
  return callEmbed?.roomId === room.roomId ? (
    <SpeakingList callEmbed={callEmbed} room={room} members={members} />
  ) : (
    <CallMemberList room={room} members={members} speakers={NOBODY} live={NO_SHARES} />
  );
}
