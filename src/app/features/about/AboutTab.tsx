import React from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { Icon, Icons } from 'folds';
import { SidebarAvatar, SidebarItem, SidebarItemTooltip } from '../../components/sidebar';
import { getAboutPath } from '../../pages/pathUtils';
import { tr } from '../translation/tr';

export function AboutTab() {
  const navigate = useNavigate();
  const path = getAboutPath();
  const selected = !!useMatch({ path, caseSensitive: true, end: true });

  return (
    <SidebarItem active={selected}>
      <SidebarItemTooltip tooltip={tr('about.nav', 'About')}>
        {(triggerRef) => (
          <SidebarAvatar as="button" ref={triggerRef} outlined onClick={() => navigate(path)}>
            <Icon src={Icons.Info} filled={selected} />
          </SidebarAvatar>
        )}
      </SidebarItemTooltip>
    </SidebarItem>
  );
}
