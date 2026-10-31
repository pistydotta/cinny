import React, { useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Avatar, Box, Icon, Icons, Text } from 'folds';
import { useNavigate } from 'react-router-dom';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { factoryRoomIdByActivity } from '../../utils/sort';
import {
  NavButton,
  NavCategory,
  NavCategoryHeader,
  NavItem,
  NavItemContent,
} from '../../components/nav';
import {
  getRoomNotificationMode,
  useRoomsNotificationPreferencesContext,
} from '../../hooks/useRoomsNotificationPreferences';
import { getDirectCreatePath, getDirectRoomPath } from '../../pages/pathUtils';
import { getCanonicalAliasOrRoomId } from '../../utils/matrix';
import { useSelectedRoom } from '../../hooks/router/useSelectedRoom';
import { RoomNavCategoryButton, RoomNavItem } from '../room-nav';
import { makeNavCategoryId } from '../../state/closedNavCategories';
import { roomToUnreadAtom } from '../../state/room/roomToUnread';
import { useCategoryHandler } from '../../hooks/useCategoryHandler';
import { useDirectRooms } from '../../pages/client/direct/useDirectRooms';
import { useClosedNavCategoriesAtom } from '../../state/hooks/closedNavCategories';
import { useDirectCreateSelected } from '../../hooks/router/useDirectSelected';
import { AccountDataEvent } from '../../../types/matrix/accountData';
import { useAccountData } from '../../hooks/useAccountData';
import { visibleDirects } from '../self-chat/selfChat';
import { useSelfChatHidden } from '../self-chat/SelfChatHiding';
import { pinnedFirst } from '../pinned-chats/pinnedChats';
import { usePinnedChats } from '../pinned-chats/PinChatMenuItem';
import { tr } from '../translation/tr';

// Same id as the Direct page's category, so collapsing it carries over.
const CATEGORY_ID = makeNavCategoryId('direct', 'direct');

// The Direct Messages list, shown on the Home page so one sidebar tab holds both.
// A group of friends has few DMs, so this skips the Direct page's virtualized list.
export function HomeDirects() {
  const mx = useMatrixClient();
  const allDirects = useDirectRooms();
  const selfChatHidden = useSelfChatHidden();
  const directsEvent = useAccountData(AccountDataEvent.Direct);
  const notificationPreferences = useRoomsNotificationPreferencesContext();
  const roomToUnread = useAtomValue(roomToUnreadAtom);
  const navigate = useNavigate();
  const selectedRoomId = useSelectedRoom();
  const directs = useMemo(
    () =>
      visibleDirects(
        allDirects,
        directsEvent?.getContent(),
        mx.getSafeUserId(),
        selfChatHidden,
        selectedRoomId
      ),
    [allDirects, directsEvent, mx, selfChatHidden, selectedRoomId]
  );
  const createSelected = useDirectCreateSelected();
  const [closedCategories, setClosedCategories] = useAtom(useClosedNavCategoriesAtom());
  const closed = closedCategories.has(CATEGORY_ID);
  const pinned = usePinnedChats();

  const sortedDirects = useMemo(() => {
    const items = pinnedFirst(Array.from(directs).sort(factoryRoomIdByActivity(mx)), pinned);
    if (closed) return items.filter((rId) => roomToUnread.has(rId) || rId === selectedRoomId);
    return items;
  }, [mx, directs, closed, roomToUnread, selectedRoomId, pinned]);

  const handleCategoryClick = useCategoryHandler(setClosedCategories, (categoryId) =>
    closedCategories.has(categoryId)
  );

  return (
    <NavCategory>
      <NavCategoryHeader>
        <RoomNavCategoryButton
          closed={closed}
          data-category-id={CATEGORY_ID}
          onClick={handleCategoryClick}
        >
          {tr('nav.direct_messages', 'Direct Messages')}
        </RoomNavCategoryButton>
      </NavCategoryHeader>
      {!closed && (
        <NavItem variant="Background" radii="400" aria-selected={createSelected}>
          <NavButton onClick={() => navigate(getDirectCreatePath())}>
            <NavItemContent>
              <Box as="span" grow="Yes" alignItems="Center" gap="200">
                <Avatar size="200" radii="400">
                  <Icon src={Icons.Plus} size="100" />
                </Avatar>
                <Box as="span" grow="Yes">
                  <Text as="span" size="Inherit" truncate>
                    {tr('new_chat.title', 'New Chat')}
                  </Text>
                </Box>
              </Box>
            </NavItemContent>
          </NavButton>
        </NavItem>
      )}
      {sortedDirects.map((roomId) => {
        const room = mx.getRoom(roomId);
        if (!room) return null;
        return (
          <RoomNavItem
            key={roomId}
            room={room}
            selected={selectedRoomId === roomId}
            showAvatar
            direct
            linkPath={getDirectRoomPath(getCanonicalAliasOrRoomId(mx, roomId))}
            notificationMode={getRoomNotificationMode(notificationPreferences, roomId)}
          />
        );
      })}
    </NavCategory>
  );
}
