import React from 'react';
import { useAtomValue } from 'jotai';
import { Box, Icon, Icons, Text } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { callEmbedAtom } from '../../state/callEmbed';
import { roomsInCallAtom } from '../call-indicator/RoomsInCallTracker';
import { MemberGlance } from '../call-status/MemberGlance';
import { tr } from '../translation/tr';
import { CardList } from './CardList';
import * as css from './homeOverview.css';

// The room type without importing matrix-js-sdk, which this folder's type check can't resolve.
type Room = NonNullable<ReturnType<ReturnType<typeof useMatrixClient>['getRoom']>>;

const NO_SPEAKERS = new Set<string>();

function CallRow({ room, here }: { room: Room; here: boolean }) {
  const mx = useMatrixClient();
  const { navigateRoom } = useRoomNavigate();
  const roomToParents = useAtomValue(roomToParentsAtom);
  const [spaceId] = roomToParents.get(room.roomId) ?? [];
  const space = spaceId ? mx.getRoom(spaceId)?.name : undefined;
  const members = mx.matrixRTC.getRoomSession(room).memberships;

  return (
    <Box alignItems="Center" gap="300" className={css.LiveRow}>
      <Icon src={Icons.VolumeHigh} size="100" className={css.LiveIcon} />
      <Box
        as="button"
        type="button"
        onClick={() => navigateRoom(room.roomId)}
        direction="Column"
        grow="Yes"
        className={css.LiveName}
      >
        <Text size="T300" truncate>
          {room.name}
        </Text>
        <Text size="T200" priority="300" truncate>
          {[
            space,
            here
              ? tr('home.live_you_here', 'You are here')
              : tr('call_view.n_in_call', '{{n}} in the call', { n: members.length }),
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </Box>
      <MemberGlance room={room} members={members} speakers={NO_SPEAKERS} max={4} />
    </Box>
  );
}

// Who's around right now: the calls in your rooms, so the home page answers "is anyone on?".
// Joining is one click away on the room's own page; nothing here starts a call.
export function HappeningNow() {
  const mx = useMatrixClient();
  const inCall = useAtomValue(roomsInCallAtom);
  const embed = useAtomValue(callEmbedAtom);
  const rooms = [...inCall]
    .map((roomId) => mx.getRoom(roomId))
    .filter((room): room is Room => !!room)
    .sort((a, b) => Number(b.roomId === embed?.roomId) - Number(a.roomId === embed?.roomId));

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">{tr('home.happening_now', 'Happening now')}</Text>
      {rooms.length === 0 ? (
        <Text size="T300" priority="300" className={css.LiveEmpty}>
          {tr('home.live_empty', 'Nobody is in a call right now.')}
        </Text>
      ) : (
        <CardList>
          {rooms.map((room) => (
            <CallRow key={room.roomId} room={room} here={room.roomId === embed?.roomId} />
          ))}
        </CardList>
      )}
    </Box>
  );
}
