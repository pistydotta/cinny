import React, { useMemo } from 'react';
import { Icon, Icons, MenuItem, Text } from 'folds';
import { useAccountData } from '../../hooks/useAccountData';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { tr } from '../translation/tr';
import { PINNED_CHATS, parsePinnedChats, togglePinnedChat } from './pinnedChats';

export const usePinnedChats = (): string[] => {
  const event = useAccountData(PINNED_CHATS);
  return useMemo(() => parsePinnedChats(event?.getContent()), [event]);
};

type PinChatMenuItemProps = {
  roomId: string;
  requestClose: () => void;
};
export function PinChatMenuItem({ roomId, requestClose }: PinChatMenuItemProps) {
  const mx = useMatrixClient();
  const pinned = usePinnedChats();

  const handleClick = () => {
    mx.setAccountData(PINNED_CHATS as never, { rooms: togglePinnedChat(pinned, roomId) } as never);
    requestClose();
  };

  return (
    <MenuItem
      onClick={handleClick}
      size="300"
      after={<Icon size="100" src={Icons.Pin} />}
      radii="300"
    >
      <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
        {pinned.includes(roomId)
          ? tr('pinned_chats.unpin', 'Unpin from top')
          : tr('pinned_chats.pin', 'Pin to top')}
      </Text>
    </MenuItem>
  );
}
