import React, { MouseEventHandler, useMemo, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { isKeyHotkey } from 'is-hotkey';
import { MatrixClient } from 'matrix-js-sdk';
import {
  Box,
  Button,
  config,
  Icon,
  Icons,
  Input,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Scroll,
  Spinner,
  Text,
  toRem,
} from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useAllJoinedRoomsSet } from '../../hooks/useGetRoom';
import { stopPropagation } from '../../utils/keyboard';
import { getStateEvent } from '../../utils/room';
import { getPowersLevelFromMatrixEvent } from '../../hooks/usePowerLevels';
import { getRoomCreatorsForRoomId } from '../../hooks/useRoomCreators';
import { getRoomPermissionsAPI } from '../../hooks/useRoomPermissions';
import { Membership, StateEvent } from '../../../types/matrix/room';
import { useToast } from '../../components/toast';
import { ServerChoice, ServerChoiceList, serverChoiceList } from './serverChoices';

// Servers (spaces) you've joined, may invite to, and `userId` isn't already in.
const invitableServers = (
  mx: MatrixClient,
  joined: Set<string>,
  userId: string
): ServerChoice[] => {
  const myUserId = mx.getSafeUserId();
  return [...joined].flatMap((roomId) => {
    const space = mx.getRoom(roomId);
    if (!space?.isSpaceRoom()) return [];

    const membership = space.getMember(userId)?.membership;
    if (
      membership === Membership.Join ||
      membership === Membership.Invite ||
      membership === Membership.Ban
    ) {
      return [];
    }
    const powerLevels = getPowersLevelFromMatrixEvent(
      getStateEvent(space, StateEvent.RoomPowerLevels)
    );
    const permissions = getRoomPermissionsAPI(getRoomCreatorsForRoomId(mx, roomId), powerLevels);
    if (!permissions.action('invite', myUserId)) return [];

    const lastActive = Math.max(
      space.getLastActiveTimestamp(),
      ...space.currentState
        .getStateEvents(StateEvent.SpaceChild)
        .map((event) => mx.getRoom(event.getStateKey())?.getLastActiveTimestamp() ?? 0)
    );
    return [{ roomId, name: space.name, lastActive }];
  });
};

type ServerMenuProps = {
  list: ServerChoiceList;
  inviting?: string;
  onSearch: (query: string) => void;
  onPick: (choice: ServerChoice) => void;
};
function ServerMenu({ list, inviting, onSearch, onPick }: ServerMenuProps) {
  const renderChoice = (choice: ServerChoice) => (
    <MenuItem
      key={choice.roomId}
      size="300"
      radii="300"
      variant="Surface"
      disabled={!!inviting}
      onClick={() => onPick(choice)}
      before={
        inviting === choice.roomId ? (
          <Spinner size="50" variant="Secondary" />
        ) : (
          <Icon size="50" src={Icons.Space} />
        )
      }
    >
      <Text size="T300" truncate>
        {choice.name}
      </Text>
    </MenuItem>
  );

  const empty = list.recent.length === 0 && list.others.length === 0;
  return (
    <Menu style={{ width: toRem(240) }}>
      <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
        <Input
          size="300"
          radii="300"
          variant="Background"
          placeholder="Search servers"
          autoFocus
          before={<Icon size="50" src={Icons.Search} />}
          onChange={(evt) => onSearch(evt.currentTarget.value)}
        />
        <Scroll size="300" hideTrack style={{ maxHeight: toRem(260) }}>
          <Box direction="Column" gap="100">
            {list.recent.length > 0 && (
              <Text size="L400" style={{ padding: `${config.space.S100} ${config.space.S200}` }}>
                Most used
              </Text>
            )}
            {list.recent.map(renderChoice)}
            {list.recent.length > 0 && list.others.length > 0 && (
              <Text size="L400" style={{ padding: `${config.space.S100} ${config.space.S200}` }}>
                All servers
              </Text>
            )}
            {list.others.map(renderChoice)}
            {empty && (
              <Text size="T300" priority="300" style={{ padding: config.space.S200 }}>
                No server found.
              </Text>
            )}
          </Box>
        </Scroll>
      </Box>
    </Menu>
  );
}

// On a user's profile card: invite them to one of your servers. Hidden when there's no
// server you may invite them to.
export function InviteToServerButton({ userId }: { userId: string }) {
  const mx = useMatrixClient();
  const toast = useToast();
  const joined = useAllJoinedRoomsSet();
  const [cords, setCords] = useState<RectCords>();
  const [query, setQuery] = useState('');
  const [inviting, setInviting] = useState<string>();

  // Read again when the menu opens, so it reflects what changed since the card rendered.
  const choices = useMemo(
    () => invitableServers(mx, joined, userId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mx, joined, userId, cords]
  );
  const list = useMemo(() => serverChoiceList(choices, query), [choices, query]);

  if (userId === mx.getSafeUserId() || choices.length === 0) return null;

  const close = () => {
    setCords(undefined);
    setQuery('');
  };
  const open: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setCords(evt.currentTarget.getBoundingClientRect());
  };

  const handlePick = (choice: ServerChoice) => {
    setInviting(choice.roomId);
    mx.invite(choice.roomId, userId)
      .then(() => {
        toast(`Invited to ${choice.name}`);
        close();
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : 'Unknown error';
        toast(`Couldn't invite to ${choice.name}: ${message}`, 'Critical');
      })
      .finally(() => setInviting(undefined));
  };

  return (
    <PopOut
      anchor={cords}
      position="Bottom"
      align="End"
      offset={4}
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: close,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
            isKeyForward: (evt: KeyboardEvent) => isKeyHotkey('arrowdown', evt),
            isKeyBackward: (evt: KeyboardEvent) => isKeyHotkey('arrowup', evt),
          }}
        >
          <ServerMenu list={list} inviting={inviting} onSearch={setQuery} onPick={handlePick} />
        </FocusTrap>
      }
    >
      <Button
        size="300"
        variant="Secondary"
        fill="Soft"
        radii="300"
        before={<Icon size="50" src={Icons.Space} />}
        onClick={open}
        aria-pressed={!!cords}
      >
        <Text size="B300">Invite to server</Text>
      </Button>
    </PopOut>
  );
}
