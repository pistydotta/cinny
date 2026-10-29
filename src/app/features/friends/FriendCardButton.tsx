import React, { useState } from 'react';
import { Button, Icon, Icons, Spinner, Text } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getMxIdServer } from '../../utils/matrix';
import { useFriends, useFriendsApi } from './useFriends';
import { getFriendStatus } from './friendStatus';
import { sendErrorMessage } from './addFriendMessages';

// The add / accept friend button on a user's profile card. Hidden for friends, yourself and
// users of other servers, who can't be added.
export function FriendCardButton({ userId }: { userId: string }) {
  const mx = useMatrixClient();
  const api = useFriendsApi();
  const { lists, refresh } = useFriends();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const myUserId = mx.getSafeUserId();
  const status = getFriendStatus(lists, userId);
  if (
    userId === myUserId ||
    getMxIdServer(userId) !== getMxIdServer(myUserId) ||
    status === 'unknown' ||
    status === 'friend'
  ) {
    return null;
  }

  const handleClick = async () => {
    setBusy(true);
    setError(undefined);
    try {
      if (status === 'incoming') await api.accept(userId);
      else await api.sendRequest(userId);
    } catch (e) {
      setError(sendErrorMessage(e, userId));
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  const requested = status === 'outgoing';
  return (
    <Button
      size="300"
      variant={requested ? 'Secondary' : 'Success'}
      fill="Soft"
      radii="300"
      disabled={busy || requested}
      title={error}
      before={
        busy ? (
          <Spinner size="50" variant="Success" fill="Soft" />
        ) : (
          <Icon size="50" src={requested ? Icons.Check : Icons.UserPlus} />
        )
      }
      onClick={handleClick}
    >
      <Text size="B300">
        {error
          ? 'Try again'
          : { incoming: 'Accept friend', outgoing: 'Requested', none: 'Add friend' }[status]}
      </Text>
    </Button>
  );
}
