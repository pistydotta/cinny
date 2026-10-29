import React from 'react';
import { Icon } from 'folds';
import { useNavigate } from 'react-router-dom';
import { SidebarAvatar, SidebarItem, SidebarItemTooltip } from '../../../components/sidebar';
import { useGamesSelected } from '../../../hooks/router/useGamesSelected';
import { getGamesPath } from '../../pathUtils';
import { GamesIcon } from '../../../features/games';

export function GamesTab() {
  const navigate = useNavigate();
  const gamesSelected = useGamesSelected();

  return (
    <SidebarItem active={gamesSelected}>
      <SidebarItemTooltip tooltip="Jogos">
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
      </SidebarItemTooltip>
    </SidebarItem>
  );
}
