import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spinner, Text } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { getCanonicalAliasOrRoomId, getMxIdServer } from '../../utils/matrix';
import { getSpaceLobbyPath } from '../../pages/pathUtils';
import { Membership } from '../../../types/matrix/room';
import { PromptCard } from '../app-prompt/PromptCard';
import { tr } from '../translation/tr';
import {
  COMMUNITY_SPACE_ID,
  isCommunityOfferPending,
  markCommunityOffered,
  readFirstLogin,
} from './firstLogin';

// Shown once, on the first visit after signing up.
export function CommunityPrompt() {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const userId = mx.getSafeUserId();
  const [open, setOpen] = useState(
    () =>
      isCommunityOfferPending(readFirstLogin(userId)) &&
      mx.getRoom(COMMUNITY_SPACE_ID)?.getMyMembership() !== Membership.Join
  );

  useEffect(() => {
    markCommunityOffered(userId);
  }, [userId]);

  const [joinState, join] = useAsyncCallback<unknown, Error, []>(
    useCallback(() => {
      const server = getMxIdServer(userId);
      return mx.joinRoom(COMMUNITY_SPACE_ID, { viaServers: server ? [server] : undefined });
    }, [mx, userId])
  );
  const joining = joinState.status === AsyncStatus.Loading;

  if (!open) return null;

  const handleJoin = () => {
    join().then(() => {
      setOpen(false);
      navigate(getSpaceLobbyPath(getCanonicalAliasOrRoomId(mx, COMMUNITY_SPACE_ID)));
    });
  };

  return (
    <PromptCard
      text={
        joinState.status === AsyncStatus.Error
          ? tr('first_login.community_failed', "Couldn't join the community. Try again.")
          : tr('first_login.community', 'Want to join the blazeroom community?')
      }
    >
      <Button
        onClick={() => setOpen(false)}
        size="300"
        radii="300"
        variant="Secondary"
        fill="None"
        disabled={joining}
      >
        <Text size="B300">{tr('app_prompt.not_now', 'Not now')}</Text>
      </Button>
      <Button
        onClick={handleJoin}
        size="300"
        radii="300"
        variant="Primary"
        fill="Solid"
        disabled={joining}
        before={joining && <Spinner size="100" variant="Primary" fill="Solid" />}
      >
        <Text size="B300">{tr('first_login.community_join', 'Join')}</Text>
      </Button>
    </PromptCard>
  );
}
