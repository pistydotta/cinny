import React, { ReactElement } from 'react';
import { Icon } from 'folds';
import { useNavigate } from 'react-router-dom';
import {
  SidebarAvatar,
  SidebarItem,
  SidebarItemBadge,
  SidebarItemTooltip,
} from '../../../components/sidebar';
import { UnreadBadge } from '../../../components/unread-badge';
import { useGamesSelected } from '../../../hooks/router/useGamesSelected';
import { getGamesPath } from '../../pathUtils';
import { GamesIcon } from '../../../features/games/GamesIcon';
import { useLobby, useLobbyPoller } from '../../../features/games/poker/useLobby';
import { useLeaveOldPokerRooms } from '../../../features/games/legacy/useLeaveOldPokerRooms';
import { tr } from '../../../features/translation/tr';

// Same narrowing as FriendsTab: upstream's tooltip returns ReactNode, rejected as a JSX component.
const GamesTooltip = SidebarItemTooltip as (
  props: Parameters<typeof SidebarItemTooltip>[0]
) => ReactElement | null;

export function GamesTab() {
  const navigate = useNavigate();
  const gamesSelected = useGamesSelected();
  // The sidebar is always mounted, so this is the app's single lobby poller.
  useLobbyPoller();
  useLeaveOldPokerRooms();
  const { list } = useLobby();
  const inviteCount = list?.invites.length ?? 0;

  return (
    <SidebarItem active={gamesSelected}>
      <GamesTooltip tooltip={tr('games.nav.games', 'Games')}>
        {(triggerRef) => (
          <SidebarAvatar
            as="button"
            ref={triggerRef}
            outlined
            onClick={() => navigate(getGamesPath())}
          >
            <Icon src={GamesIcon} filled={gamesSelected} />
          </SidebarAvatar>
        )}
      </GamesTooltip>
      {inviteCount > 0 && (
        <SidebarItemBadge hasCount>
          <UnreadBadge highlight count={inviteCount} />
        </SidebarItemBadge>
      )}
    </SidebarItem>
  );
}
