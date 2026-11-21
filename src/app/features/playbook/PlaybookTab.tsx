import React, { ReactElement } from 'react';
import { Icon, IconSrc } from 'folds';
import { useMatch, useNavigate } from 'react-router-dom';
import { SidebarAvatar, SidebarItem, SidebarItemTooltip } from '../../components/sidebar';
import { tr } from '../translation/tr';
import { PLAYBOOK_PATH } from './paths';

// Same narrowing as GamesTab: upstream's tooltip returns ReactNode, rejected as a JSX component.
const Tooltip = SidebarItemTooltip as (
  props: Parameters<typeof SidebarItemTooltip>[0]
) => ReactElement | null;

const RING = 'M12 4.5a7.5 7.5 0 1 1 0 15a7.5 7.5 0 1 1 0-15Z';
const TICKS = 'M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5';

/** A crosshair, in the folds icon format. */
export function PlaybookIcon(filled?: boolean): ReturnType<IconSrc> {
  return (
    <>
      <path d={RING} fill="none" stroke="currentColor" strokeWidth={filled ? 2.2 : 1.5} />
      <path
        d={TICKS}
        fill="none"
        stroke="currentColor"
        strokeWidth={filled ? 2.2 : 1.5}
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r={filled ? 1.8 : 1.3} fill="currentColor" />
    </>
  );
}

export function PlaybookTab() {
  const navigate = useNavigate();
  const selected = !!useMatch({ path: PLAYBOOK_PATH, end: false });
  return (
    <SidebarItem active={selected}>
      <Tooltip tooltip={tr('playbook.title', 'Playbook')}>
        {(triggerRef) => (
          <SidebarAvatar
            as="button"
            ref={triggerRef}
            outlined
            onClick={() => navigate(PLAYBOOK_PATH)}
          >
            <Icon src={PlaybookIcon} filled={selected} />
          </SidebarAvatar>
        )}
      </Tooltip>
    </SidebarItem>
  );
}
