import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  Header,
  Icon,
  IconButton,
  Icons,
  Input,
  Line,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Scroll,
  Spinner,
  Text,
  config,
  toRem,
} from 'folds';
import { Room } from 'matrix-js-sdk';
import FocusTrap from 'focus-trap-react';
import { stopPropagation } from '../../utils/keyboard';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useDirectUsers } from '../../hooks/useDirectUsers';
import { useAlive } from '../../hooks/useAlive';
import { useToast } from '../../components/toast';
import { UserAvatar } from '../../components/user-avatar';
import { useFriends } from '../friends/useFriends';
import { friendDisplayName } from '../friends/userDisplay';
import { useParentSpaceMembers } from '../space-rooms/useSpaceMembers';
import { canInviteToRoom } from '../space-rooms/spaceRoomAccess';
import {
  isMissingUserError,
  resolveInviteUserId,
} from '../../components/invite-user-prompt/inviteUserId';
import { tr } from '../translation/tr';
import { InviteRow, InviteState, Person, inviteRows, inviteState } from './inviteRows';
import { RoomCodePanel } from './RoomCodePanel';

// What the server's directory finds for the query; anyone on the server, not only people you
// share a room with (homeserver.yaml's user_directory.search_all_users).
const useDirectorySearch = (query: string): Person[] => {
  const mx = useMatrixClient();
  const [found, setFound] = useState<Person[]>([]);

  useEffect(() => {
    const term = query.trim().replace(/^@/, '');
    if (!term) {
      setFound([]);
      return undefined;
    }
    let live = true;
    const timer = setTimeout(() => {
      mx.searchUserDirectory({ term, limit: 30 })
        .then(({ results }) => {
          if (!live) return;
          setFound(
            results.map((r) => ({
              userId: r.user_id,
              name: r.display_name || friendDisplayName(mx, r.user_id),
              avatarMxc: r.avatar_url,
            }))
          );
        })
        .catch(() => undefined);
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [mx, query]);

  return found;
};

function PersonAvatar({ person }: { person: Person }) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const mxc = person.avatarMxc ?? mx.getUser(person.userId)?.avatarUrl;
  const src = mxc
    ? mx.mxcUrlToHttp(mxc, 96, 96, 'crop', undefined, false, useAuthentication) ?? undefined
    : undefined;
  return (
    <Avatar size="300">
      <UserAvatar
        userId={person.userId}
        src={src}
        alt={person.name}
        renderFallback={() => <Icon size="100" src={Icons.User} filled />}
      />
    </Avatar>
  );
}

const stateLabel = (state: InviteState): string => {
  switch (state) {
    case 'member':
      return tr('invite_dialog.member', 'Member');
    case 'invited':
      return tr('invite_dialog.invited', 'Invited');
    case 'banned':
      return tr('invite_dialog.banned', 'Banned');
    case 'outside_space':
      return tr('invite_dialog.outside_space', 'Not in the space');
    default:
      return '';
  }
};

type PersonRowProps = {
  row: InviteRow;
  busy: boolean;
  onInvite: (userId: string) => void;
};
function PersonRow({ row, busy, onInvite }: PersonRowProps) {
  return (
    <Box
      alignItems="Center"
      gap="300"
      style={{ padding: `${config.space.S200} ${config.space.S300}` }}
    >
      <PersonAvatar person={row} />
      <Box grow="Yes" direction="Column" style={{ minWidth: 0 }}>
        <Text size="T300" truncate>
          <b>{row.name}</b>
        </Text>
        <Text size="T200" priority="300" truncate>
          {row.userId}
        </Text>
      </Box>
      {row.state === 'can_invite' ? (
        <Button
          type="button"
          size="300"
          variant="Primary"
          fill="Soft"
          radii="300"
          disabled={busy}
          before={busy ? <Spinner size="100" variant="Primary" fill="Soft" /> : undefined}
          onClick={() => onInvite(row.userId)}
        >
          <Text size="B300">{tr('invite_dialog.invite', 'Invite')}</Text>
        </Button>
      ) : (
        <Chip
          variant={row.state === 'member' || row.state === 'invited' ? 'Success' : 'SurfaceVariant'}
          radii="Pill"
          before={
            row.state === 'member' || row.state === 'invited' ? (
              <Icon size="50" src={Icons.Check} />
            ) : undefined
          }
          title={
            row.state === 'outside_space'
              ? tr(
                  'invite_dialog.outside_space_tip',
                  'Only members of the space can join its rooms. Invite them to the space first.'
                )
              : undefined
          }
        >
          <Text size="T200">{stateLabel(row.state)}</Text>
        </Chip>
      )}
    </Box>
  );
}

type InviteDialogProps = {
  room: Room;
  requestClose: () => void;
};

// Invite people to a room or space: search anyone on the server by name, invite with one
// click, or share a code or link (RoomCodePanel).
export function InviteDialog({ room, requestClose }: InviteDialogProps) {
  const mx = useMatrixClient();
  const alive = useAlive();
  const toast = useToast();
  const myUserId = mx.getSafeUserId();
  const domain = mx.getDomain() ?? '';
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  // Invited from here; the room's member list may not have caught up yet.
  const [invitedIds, setInvitedIds] = useState<ReadonlySet<string>>(new Set());

  const { lists: friendLists, refresh: refreshFriends } = useFriends();
  useEffect(() => {
    refreshFriends();
  }, [refreshFriends]);

  const directUsers = useDirectUsers();
  // Rooms inside a space only take the space's members (features/space-rooms).
  const spaceMembers = useParentSpaceMembers(room);
  const directory = useDirectorySearch(query);

  const toPerson = useCallback(
    (userId: string): Person => ({ userId, name: friendDisplayName(mx, userId) }),
    [mx]
  );
  const friends = useMemo(
    () => (friendLists?.friends ?? []).map((f) => toPerson(f.userId)),
    [friendLists, toPerson]
  );
  const known = useMemo(() => {
    const ids = new Set<string>([...directUsers, ...(spaceMembers ?? [])]);
    mx.getRooms()
      .filter((r) => r.getMyMembership() === 'join')
      .forEach((r) => r.getJoinedMembers().forEach((m) => ids.add(m.userId)));
    return [...ids].map(toPerson);
  }, [mx, directUsers, spaceMembers, toPerson]);

  // Only what's written as an ID ("@ana" or "ana:server"); a plain name is left to the search.
  const typedId = /^@|:/.test(query.trim()) ? resolveInviteUserId(query, domain) : undefined;
  const rows = useMemo(
    () =>
      inviteRows({
        query,
        myUserId,
        domain,
        friends,
        known,
        directory,
        typed: typedId ? toPerson(typedId) : undefined,
        stateOf: (userId) =>
          inviteState(
            room.getMember(userId)?.membership,
            invitedIds.has(userId),
            canInviteToRoom(userId, spaceMembers)
          ),
      }),
    [
      query,
      myUserId,
      domain,
      friends,
      known,
      directory,
      typedId,
      toPerson,
      room,
      invitedIds,
      spaceMembers,
    ]
  );

  const handleInvite = (userId: string) => {
    if (busyIds.has(userId)) return;
    setBusyIds((ids) => new Set(ids).add(userId));
    const name = friendDisplayName(mx, userId);
    // Synapse accepts an invite to a local username nobody registered, so ask for the profile
    // first. Any other lookup failure lets the invite through.
    mx.getProfileInfo(userId)
      .catch((e: unknown) => {
        if (isMissingUserError(e)) {
          throw new Error(tr('invite_dialog.missing', "This user doesn't exist."));
        }
      })
      .then(() => mx.invite(room.roomId, userId))
      .then(() => {
        if (!alive()) return;
        setInvitedIds((ids) => new Set(ids).add(userId));
        toast(tr('invite_dialog.done', 'Invited {{name}}', { name }));
      })
      .catch((e: unknown) => {
        if (!alive()) return;
        const message = e instanceof Error ? e.message : '';
        toast(
          tr('invite_dialog.failed', "Couldn't invite {{name}}. {{message}}", { name, message }),
          'Critical'
        );
      })
      .finally(() => {
        if (!alive()) return;
        setBusyIds((ids) => {
          const next = new Set(ids);
          next.delete(userId);
          return next;
        });
      });
  };

  const searching = query.trim().length > 0;
  const isSpace = room.isSpaceRoom();

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: () => inputRef.current,
            clickOutsideDeactivates: true,
            onDeactivate: requestClose,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Dialog style={{ width: toRem(480), maxWidth: '100%' }}>
            <Box grow="Yes" direction="Column">
              <Header
                size="500"
                style={{ padding: `0 ${config.space.S200} 0 ${config.space.S400}` }}
              >
                <Box grow="Yes" direction="Column" style={{ minWidth: 0 }}>
                  <Text size="H4" truncate>
                    {isSpace
                      ? tr('invite_dialog.title_space', 'Invite to {{name}}', { name: room.name })
                      : tr('invite_dialog.title_room', 'Invite to #{{name}}', { name: room.name })}
                  </Text>
                </Box>
                <IconButton size="300" radii="300" onClick={requestClose}>
                  <Icon src={Icons.Cross} />
                </IconButton>
              </Header>
              <Box direction="Column" gap="300" style={{ padding: `0 ${config.space.S400}` }}>
                {spaceMembers && (
                  <Text size="T200" priority="300">
                    {tr(
                      'invite_dialog.space_room_hint',
                      'This room is in a space: only people who are in the space can be invited.'
                    )}
                  </Text>
                )}
                <Input
                  ref={inputRef}
                  size="500"
                  variant="Background"
                  radii="400"
                  value={query}
                  onChange={(evt) => setQuery(evt.currentTarget.value)}
                  placeholder={tr('invite_dialog.search', 'Search by name or @username')}
                  before={<Icon size="200" src={Icons.Search} />}
                  after={
                    query ? (
                      <IconButton
                        size="300"
                        radii="300"
                        variant="Background"
                        aria-label={tr('invite_dialog.clear', 'Clear')}
                        onClick={() => {
                          setQuery('');
                          inputRef.current?.focus();
                        }}
                      >
                        <Icon size="100" src={Icons.Cross} />
                      </IconButton>
                    ) : undefined
                  }
                  autoComplete="off"
                />
                {(searching || rows.length > 0) && (
                  <Text size="L400" priority="300">
                    {searching
                      ? tr('invite_dialog.results', 'People')
                      : tr('invite_dialog.friends', 'Friends')}
                  </Text>
                )}
              </Box>
              <Scroll size="300" hideTrack style={{ height: toRem(300) }}>
                <Box
                  direction="Column"
                  style={{ padding: `${config.space.S100} ${config.space.S100}` }}
                >
                  {rows.map((row) => (
                    <PersonRow
                      key={row.userId}
                      row={row}
                      busy={busyIds.has(row.userId)}
                      onInvite={handleInvite}
                    />
                  ))}
                  {rows.length === 0 && (
                    <Box
                      direction="Column"
                      alignItems="Center"
                      justifyContent="Center"
                      gap="200"
                      style={{ padding: config.space.S700, textAlign: 'center' }}
                    >
                      <Icon size="400" src={Icons.User} style={{ opacity: 0.5 }} />
                      <Text size="T300" priority="300">
                        {searching
                          ? tr('invite_dialog.nobody', 'Nobody found with that name.')
                          : tr(
                              'invite_dialog.type_to_search',
                              'Type a name to find anyone on blazeroom.'
                            )}
                      </Text>
                    </Box>
                  )}
                </Box>
              </Scroll>
              <Line variant="Surface" size="300" />
              <Box style={{ padding: config.space.S400 }}>
                <RoomCodePanel room={room} />
              </Box>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
