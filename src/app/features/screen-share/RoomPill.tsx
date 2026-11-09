import React, { useRef } from 'react';
import { Room } from 'matrix-js-sdk';
import { Avatar, Icon, Icons, Text } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useCallMembers, useCallSession } from '../../hooks/useCall';
import { useCallSpeakers } from '../../hooks/useCallSpeakers';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { UserAvatar } from '../../components/user-avatar';
import { getMemberAvatarMxc, getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { uniqueCallUserIds } from '../room-nav/callMembers';
import { tr } from '../translation/tr';
import { keepFaceOrder, SHOWN_FACES } from './roomFaces';
import { SpeakerWaves } from './SpeakerWaves';
import { useCallSpaceName } from './useCallSpaceName';
import * as css from './styles.css';

const nameOf = (room: Room, userId: string) =>
  getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId;

// Who is in the call, in an order that stays put while they talk.
export const useCallPeople = (callEmbed: CallEmbed) => {
  const userIds = uniqueCallUserIds(useCallMembers(useCallSession(callEmbed.room)));
  const speakers = useCallSpeakers(callEmbed);
  const order = useRef<string[]>([]);
  order.current = keepFaceOrder(order.current, userIds, speakers, SHOWN_FACES);
  return { people: order.current, speakers };
};

function Face({
  room,
  userId,
  speaking,
  small,
}: {
  room: Room;
  userId: string;
  speaking: boolean;
  small: boolean;
}) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const name = nameOf(room, userId);
  const mxc = getMemberAvatarMxc(room, userId);
  const src = mxc ? mxcUrlToHttp(mx, mxc, useAuthentication, 64, 64) ?? undefined : undefined;
  return (
    <Avatar
      className={css.Face({ speaking, small })}
      size={small ? '200' : '300'}
      radii="Pill"
      title={name}
    >
      <UserAvatar
        userId={userId}
        src={src}
        alt={name}
        renderFallback={() => <Icon size="50" src={Icons.User} filled />}
      />
    </Avatar>
  );
}

// Overlapping faces; whoever is talking now rises a little, ringed green.
export function Faces({
  room,
  people,
  speakers,
  max = SHOWN_FACES,
  small = false,
  showMore = true,
}: {
  room: Room;
  people: string[];
  speakers: Set<string>;
  max?: number;
  small?: boolean;
  showMore?: boolean;
}) {
  const extra = showMore && people.length > max ? people.length - (max - 1) : 0;
  const shown = people.slice(0, extra ? max - 1 : max);
  return (
    <div className={css.Faces} aria-hidden>
      {shown.map((userId) => (
        <Face
          key={userId}
          room={room}
          userId={userId}
          speaking={speakers.has(userId)}
          small={small}
        />
      ))}
      {extra > 0 && <span className={css.FaceMore}>+{extra}</span>}
    </div>
  );
}

// The floating box while no share is watched: the room on top, the people and Go below.
export function RoomCard({
  callEmbed,
  onOpen,
  hideButton,
}: {
  callEmbed: CallEmbed;
  onOpen: () => void;
  hideButton: React.ReactNode;
}) {
  const { room } = callEmbed;
  const mx = useMatrixClient();
  const space = useCallSpaceName(room);
  const { people: inCall, speakers } = useCallPeople(callEmbed);
  // Alone, your own face says it; it also covers the moment before the call lists you.
  const myId = mx.getSafeUserId();
  const people = inCall.length > 0 ? inCall : [myId];
  const talking = people.filter((userId) => speakers.has(userId));
  const goLabel = tr('screen_share.go_to_room', 'Go to {{room}}', { room: room.name });

  let status: string | undefined;
  if (talking.length > 0) {
    status = tr('screen_share.talking', '{{name}} talking', { name: nameOf(room, talking[0]) });
  } else if (people.length > 1) {
    status = tr('screen_share.in_room_count', '{{count}} in the room', { count: people.length });
  }

  return (
    <>
      <div className={css.RoomCardHeader}>
        <span className={css.RoomCardPlate}>
          <SpeakerWaves talking={talking.length > 0} inCall size={18} />
        </span>
        <div className={css.RoomCardTitle} title={space ? `${room.name} · ${space}` : room.name}>
          <Text className={css.RoomCardName} size="T400" truncate>
            {room.name}
          </Text>
          {space && (
            <Text className={css.RoomCardSpace} size="T200" truncate>
              {space}
            </Text>
          )}
        </div>
        {hideButton}
      </div>
      <div className={css.RoomCardPeople}>
        <Faces room={room} people={people} speakers={speakers} />
        <Text className={css.RoomCardStatus} size="T200" truncate>
          {status}
        </Text>
        <button
          type="button"
          className={css.GoToRoom}
          onClick={onOpen}
          aria-label={goLabel}
          title={goLabel}
        >
          {tr('screen_share.go', 'Go')}
          <Icon size="50" src={Icons.ArrowRight} />
        </button>
      </div>
    </>
  );
}
