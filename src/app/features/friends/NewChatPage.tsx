import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Checkbox,
  Icon,
  IconButton,
  Icons,
  Input,
  MenuItem,
  Scroll,
  Spinner,
  Text,
  color,
  config,
} from 'folds';
import { MatrixError } from 'matrix-js-sdk/lib/http-api/errors';
import {
  Page,
  PageContent,
  PageContentCenter,
  PageHeader,
  PageHero,
  PageHeroSection,
} from '../../components/page';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { AsyncStatus } from '../../hooks/useAsyncCallback';
import { useAlive } from '../../hooks/useAlive';
import { ErrorCode } from '../../cs-errorcode';
import { getDirectCreateSearchParams } from '../../pages/pathSearchParam';
import { getDirectPath, getDirectRoomPath, getFriendsPath } from '../../pages/pathUtils';
import { useFriends } from './useFriends';
import { useFindDM, useStartChat } from './useStartChat';
import { filterFriends } from './newChat';
import { friendDisplayName } from './userDisplay';
import { FriendAvatar } from './FriendAvatar';
import { tr } from '../translation/tr';

function ErrorLine({ error }: { error: Error | MatrixError }) {
  const message =
    error instanceof MatrixError && error.name === ErrorCode.M_LIMIT_EXCEEDED
      ? tr('common.server_busy', 'The server is busy. Try again in a moment.')
      : error.message;
  return (
    <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="200">
      <Icon src={Icons.Warning} filled size="100" />
      <Text size="T300" style={{ color: color.Critical.Main }}>
        <b>{message}</b>
      </Text>
    </Box>
  );
}

type FriendPickerProps = {
  friendIds: string[];
  busy: boolean;
  onStart: (userIds: string[], name?: string) => void;
};
function FriendPicker({ friendIds, busy, onStart }: FriendPickerProps) {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState('');

  const nameOf = useCallback((id: string) => friendDisplayName(mx, id), [mx]);
  const sorted = useMemo(
    () => [...friendIds].sort((a, b) => nameOf(a).localeCompare(nameOf(b))),
    [friendIds, nameOf]
  );
  const shown = filterFriends(sorted, query, nameOf);
  const group = picked.length > 1;

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  if (friendIds.length === 0) {
    return (
      <Box direction="Column" alignItems="Center" gap="300">
        <Text size="T300" align="Center">
          {tr('new_chat.no_friends', 'You can chat with your friends here. Add some first.')}
        </Text>
        <Button
          size="400"
          variant="Secondary"
          radii="400"
          onClick={() => navigate(getFriendsPath())}
        >
          <Text size="B400">{tr('new_chat.go_to_friends', 'Go to Friends')}</Text>
        </Button>
      </Box>
    );
  }

  return (
    <Box direction="Column" gap="400">
      <Input
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        placeholder={tr('new_chat.search_friends', 'Search friends')}
        variant="SurfaceVariant"
        size="500"
        radii="400"
        autoFocus
        autoComplete="off"
        before={<Icon size="100" src={Icons.Search} />}
      />
      <Box direction="Column" gap="100" style={{ maxHeight: '40vh', overflowY: 'auto' }}>
        {shown.length === 0 && (
          <Text size="T300" priority="300" align="Center">
            {tr('new_chat.no_match', 'No friend matches “{{query}}”.', { query: query.trim() })}
          </Text>
        )}
        {shown.map((id) => {
          const checked = picked.includes(id);
          return (
            <MenuItem
              key={id}
              style={{ padding: `${config.space.S100} ${config.space.S200}`, height: 'auto' }}
              variant={checked ? 'Primary' : 'Background'}
              radii="400"
              aria-pressed={checked}
              disabled={busy}
              onClick={() => toggle(id)}
              before={<FriendAvatar userId={id} />}
              after={<Checkbox checked={checked} size="50" variant="Primary" tabIndex={-1} />}
            >
              <Box grow="Yes" direction="Column">
                <Text size="T400" truncate>
                  {nameOf(id)}
                </Text>
                <Text size="T200" priority="300" truncate>
                  {id}
                </Text>
              </Box>
            </MenuItem>
          );
        })}
      </Box>
      {group && (
        <Box direction="Column" gap="100">
          <Text size="L400">{tr('new_chat.group_name', 'Group name (optional)')}</Text>
          <Input
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder={picked.map(nameOf).join(', ')}
            variant="SurfaceVariant"
            size="500"
            radii="400"
            maxLength={100}
            autoComplete="off"
            disabled={busy}
          />
        </Box>
      )}
      <Button
        size="500"
        variant="Primary"
        radii="400"
        disabled={busy || picked.length === 0}
        onClick={() => onStart(picked, name)}
        before={busy && <Spinner variant="Primary" fill="Solid" size="200" />}
      >
        <Text size="B500">
          {group
            ? tr('new_chat.create_group', 'Create group with {{n}} friends', { n: picked.length })
            : tr('new_chat.start_chat', 'Start chat')}
        </Text>
      </Button>
    </Box>
  );
}

// Replaces Cinny's "enter a user ID" form. Pick friends for a DM or a group chat; a link with
// ?userId= (a friend's Message button, a profile) opens or starts that one DM straight away.
export function NewChatPage() {
  const mx = useMatrixClient();
  const alive = useAlive();
  const navigate = useNavigate();
  const screenSize = useScreenSizeContext();
  const [searchParams] = useSearchParams();
  const { userId } = getDirectCreateSearchParams(searchParams);
  const { lists, error: friendsError } = useFriends();
  const [state, startChat] = useStartChat();

  const busy = state.status === AsyncStatus.Loading;
  const friendIds = useMemo(() => lists?.friends.map((f) => f.userId) ?? [], [lists]);
  const friendsLoaded = !!lists || !!friendsError;

  const start = useCallback(
    (userIds: string[], name?: string) => {
      startChat(userIds, name)
        .then((roomId) => {
          if (alive()) navigate(getDirectRoomPath(roomId), { replace: true });
        })
        .catch(() => {
          // shown from the async state
        });
    },
    [startChat, alive, navigate]
  );

  // An existing DM opens, and a friend's DM is created, without asking. Anyone else gets a
  // button, so a link alone never starts a chat with a stranger.
  const findDM = useFindDM();
  const isFriend = !!userId && (friendIds.includes(userId) || !!findDM(userId));
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!userId || !isFriend || autoStarted.current) return;
    autoStarted.current = true;
    start([userId]);
  }, [userId, isFriend, start]);

  const renderLinkTarget = (target: string) => {
    if (!friendsLoaded || isFriend) {
      return state.status === AsyncStatus.Error ? (
        <ErrorLine error={state.error} />
      ) : (
        <Box justifyContent="Center">
          <Spinner variant="Secondary" size="400" />
        </Box>
      );
    }
    return (
      <Box direction="Column" gap="400">
        <Box alignItems="Center" gap="300">
          <FriendAvatar userId={target} />
          <Box grow="Yes" direction="Column">
            <Text size="T400" truncate>
              {friendDisplayName(mx, target)}
            </Text>
            <Text size="T200" priority="300" truncate>
              {target}
            </Text>
          </Box>
        </Box>
        {state.status === AsyncStatus.Error && <ErrorLine error={state.error} />}
        <Button
          size="500"
          variant="Primary"
          radii="400"
          disabled={busy}
          onClick={() => start([target])}
          before={busy && <Spinner variant="Primary" fill="Solid" size="200" />}
        >
          <Text size="B500">{tr('new_chat.start_chat', 'Start chat')}</Text>
        </Button>
      </Box>
    );
  };

  return (
    <Page>
      {screenSize === ScreenSize.Mobile && (
        <PageHeader balance outlined={false}>
          <Box grow="Yes" alignItems="Center" gap="200">
            <IconButton
              aria-label={tr('common.back', 'Back')}
              onClick={() => navigate(getDirectPath())}
            >
              <Icon src={Icons.ArrowLeft} />
            </IconButton>
          </Box>
        </PageHeader>
      )}
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <PageContentCenter>
              <PageHeroSection>
                <Box direction="Column" gap="700">
                  <PageHero
                    icon={<Icon size="600" src={Icons.Message} />}
                    title={tr('new_chat.title', 'New Chat')}
                    subTitle={tr(
                      'new_chat.subtitle',
                      'Pick a friend for a DM, or several for a group chat.'
                    )}
                  />
                  {userId ? (
                    renderLinkTarget(userId)
                  ) : (
                    <Box direction="Column" gap="400">
                      {!friendsLoaded ? (
                        <Box justifyContent="Center">
                          <Spinner variant="Secondary" size="400" />
                        </Box>
                      ) : (
                        <FriendPicker friendIds={friendIds} busy={busy} onStart={start} />
                      )}
                      {state.status === AsyncStatus.Error && <ErrorLine error={state.error} />}
                    </Box>
                  )}
                </Box>
              </PageHeroSection>
            </PageContentCenter>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
