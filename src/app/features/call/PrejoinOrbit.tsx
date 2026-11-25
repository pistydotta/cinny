import React from 'react';
import { Room } from 'matrix-js-sdk';
import { CallMembership } from 'matrix-js-sdk/lib/matrixrtc/CallMembership';
import { Avatar, Icon, Icons } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { UserAvatar } from '../../components/user-avatar';
import { getMemberAvatarMxc, getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { uniqueCallUserIds } from '../room-nav/callMembers';
import { CallMemberPopout } from '../call-member-card/CallMemberPopout';
import { useCallAudioReports } from '../call-member-card/callAudioStatus';
import { userAudioStatus } from '../call-member-card/audioStatus';
import { tr } from '../translation/tr';
import { orbitPlaces } from './orbitPlaces';
import * as css from './styles.css';

const memberName = (room: Room, userId: string) =>
  getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId;

function OrbitPerson({ room, userId, muted }: { room: Room; userId: string; muted: boolean }) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const name = memberName(room, userId);
  const avatarMxc = getMemberAvatarMxc(room, userId);
  const avatarUrl = avatarMxc
    ? mxcUrlToHttp(mx, avatarMxc, useAuthentication, 96, 96) ?? undefined
    : undefined;

  return (
    <CallMemberPopout room={room} userId={userId}>
      {(open, opened) => (
        <button
          type="button"
          className={css.OrbitPerson}
          onClick={open}
          aria-haspopup="menu"
          aria-expanded={opened}
          title={name}
        >
          <Avatar size="300" radii="Pill" className={css.OrbitAvatar}>
            <UserAvatar
              userId={userId}
              src={avatarUrl}
              alt=""
              renderFallback={() => <Icon size="200" src={Icons.User} filled />}
            />
          </Avatar>
          {muted && (
            <span
              className={css.OrbitMuted}
              role="img"
              aria-label={tr('call_status.muted', 'Microphone muted')}
            >
              <Icon size="50" src={Icons.MicMute} filled />
            </span>
          )}
          <span className={css.OrbitName}>{name}</span>
        </button>
      )}
    </CallMemberPopout>
  );
}

// The room as an ember with the people in its call around it, in place of a list of cards.
export function PrejoinOrbit({ room, members }: { room: Room; members: CallMembership[] }) {
  const { reports, liveMuted } = useCallAudioReports(room, members);
  const userIds = uniqueCallUserIds(members);
  const { people, more } = orbitPlaces(userIds);
  const others = more ? userIds.slice(people.length).map((id) => memberName(room, id)) : [];

  return (
    <div className={userIds.length > 0 ? css.Orbit : css.OrbitEmpty}>
      <span className={css.OrbitRingOuter} aria-hidden />
      <span className={css.OrbitRingInner} aria-hidden />
      <span className={css.OrbitEmber} aria-hidden>
        <Icon src={Icons.VolumeHigh} size="600" />
      </span>
      {userIds.length > 0 && (
        <ul className={css.OrbitPeople}>
          {people.map(({ item: userId, x, y }) => (
            <li key={userId} className={css.OrbitPlace} style={{ left: `${x}%`, top: `${y}%` }}>
              <OrbitPerson
                room={room}
                userId={userId}
                muted={liveMuted.get(userId) ?? userAudioStatus(reports, members, userId).muted}
              />
            </li>
          ))}
          {more && (
            <li
              className={css.OrbitPlace}
              style={{ left: `${more.x}%`, top: `${more.y}%` }}
              title={others.join(', ')}
            >
              <span className={css.OrbitMore}>+{more.count}</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
