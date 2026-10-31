import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, Icons, Spinner, Text } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { getDirectRoomPath } from '../../pages/pathUtils';
import { tr } from '../translation/tr';
import { ensureSelfChat } from './selfChatRoom';

// The Message button on your own card: opens your chat with yourself.
export function SelfChatButton({ onOpen }: { onOpen: () => void }) {
  const mx = useMatrixClient();
  const navigate = useNavigate();

  const [state, open] = useAsyncCallback<string, Error, []>(
    useCallback(() => ensureSelfChat(mx), [mx])
  );
  const loading = state.status === AsyncStatus.Loading;

  const handleClick = () => {
    open().then((roomId) => {
      onOpen();
      navigate(getDirectRoomPath(roomId));
    });
  };

  return (
    <>
      <Button
        size="300"
        variant="Primary"
        fill="Solid"
        radii="300"
        disabled={loading}
        before={
          loading ? (
            <Spinner size="50" variant="Primary" fill="Solid" />
          ) : (
            <Icon size="50" src={Icons.Message} filled />
          )
        }
        onClick={handleClick}
      >
        <Text size="B300">{tr('profile.message', 'Message')}</Text>
      </Button>
      {state.status === AsyncStatus.Error && <Text size="T200">{state.error.message}</Text>}
    </>
  );
}
