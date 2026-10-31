import React from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { Avatar, Box, Icon, Icons, Text } from 'folds';
import { NavButton, NavItem, NavItemContent } from '../../components/nav';
import { getHomePath } from '../../pages/pathUtils';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { UnreadBadge, UnreadBadgeCenter } from '../../components/unread-badge';
import { tr } from '../translation/tr';
import { useWhatsNewSeen } from '../whats-new/whatsNewSeen';

// Opens the home page (WelcomePage) from the Home nav. Without it, the Home tab returns to the
// last open room and the home page can't be reached once a room was opened. A dot shows while
// there's news the user hasn't seen there.
export function HomeOverviewNavItem() {
  const navigate = useNavigate();
  const selected = !!useMatch({ path: getHomePath(), caseSensitive: true, end: true });
  const screenSize = useScreenSizeContext();
  const { unseen } = useWhatsNewSeen();

  // On mobile the home path shows this nav itself, not the home page.
  if (screenSize === ScreenSize.Mobile) return null;

  return (
    <NavItem variant="Background" radii="400" aria-selected={selected}>
      <NavButton onClick={() => navigate(getHomePath())}>
        <NavItemContent>
          <Box as="span" grow="Yes" alignItems="Center" gap="200">
            <Avatar size="200" radii="400">
              <Icon src={Icons.Home} size="100" filled={selected} />
            </Avatar>
            <Box as="span" grow="Yes">
              <Text as="span" size="Inherit" truncate>
                {tr('home.overview', 'Overview')}
              </Text>
            </Box>
            {unseen && (
              <UnreadBadgeCenter>
                <UnreadBadge count={0} />
              </UnreadBadgeCenter>
            )}
          </Box>
        </NavItemContent>
      </NavButton>
    </NavItem>
  );
}
