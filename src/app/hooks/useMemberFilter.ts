import { useMemo } from 'react';
import { RoomMember } from 'matrix-js-sdk';
import { Membership } from '../../types/matrix/room';
import { tr } from '../features/translation/tr';

export const MembershipFilter = {
  filterJoined: (m: RoomMember) => m.membership === Membership.Join,
  filterInvited: (m: RoomMember) => m.membership === Membership.Invite,
  filterLeaved: (m: RoomMember) =>
    m.membership === Membership.Leave &&
    m.events.member?.getStateKey() === m.events.member?.getSender(),
  filterKicked: (m: RoomMember) =>
    m.membership === Membership.Leave &&
    m.events.member?.getStateKey() !== m.events.member?.getSender(),
  filterBanned: (m: RoomMember) => m.membership === Membership.Ban,
};

export type MembershipFilterFn = (m: RoomMember) => boolean;

export type MembershipFilterItem = {
  name: string;
  filterFn: MembershipFilterFn;
};

export const useMembershipFilterMenu = (): MembershipFilterItem[] =>
  useMemo(
    () => [
      {
        name: tr('members.filter_joined', 'Joined'),
        filterFn: MembershipFilter.filterJoined,
      },
      {
        name: tr('members.filter_invited', 'Invited'),
        filterFn: MembershipFilter.filterInvited,
      },
      {
        name: tr('members.filter_left', 'Left'),
        filterFn: MembershipFilter.filterLeaved,
      },
      {
        name: tr('members.filter_kicked', 'Kicked'),
        filterFn: MembershipFilter.filterKicked,
      },
      {
        name: tr('members.filter_banned', 'Banned'),
        filterFn: MembershipFilter.filterBanned,
      },
    ],
    []
  );

export const useMembershipFilter = (
  index: number,
  membershipFilter: MembershipFilterItem[]
): MembershipFilterItem => {
  const filter = membershipFilter[index] ?? membershipFilter[0];
  return filter;
};
