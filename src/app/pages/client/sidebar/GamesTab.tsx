import React, { ReactElement } from 'react';
import { Icon } from 'folds';
import { useNavigate } from 'react-router-dom';
import { SidebarAvatar, SidebarItem, SidebarItemTooltip } from '../../../components/sidebar';
import { useGamesSelected } from '../../../hooks/router/useGamesSelected';
import { getGamesPath } from '../../pathUtils';
import { GamesIcon } from '../../../features/games/GamesIcon';
import { tr } from '../../../features/translation/tr';

// Same narrowing as FriendsTab: upstream's tooltip returns ReactNode, rejected as a JSX component.
const GamesTooltip = SidebarItemTooltip as (
  props: Parameters<typeof SidebarItemTooltip>[0]
) => ReactElement | null;

export function GamesTab() {
  const navigate = useNavigate();
  const gamesSelected = useGamesSelected();

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
    </SidebarItem>
  );
}
