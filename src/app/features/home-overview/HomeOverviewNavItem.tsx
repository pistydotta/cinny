import React from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { Avatar, Box, Button, Icon, Icons, Text } from 'folds';
import { NavButton, NavItem, NavItemContent } from '../../components/nav';
import { getHomeOverviewPath, getHomePath } from '../../pages/pathUtils';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { UnreadBadge, UnreadBadgeCenter } from '../../components/unread-badge';
import { tr } from '../translation/tr';
import { useWhatsNewSeen } from '../whats-new/whatsNewSeen';

// With no rooms the Home nav shows an empty state instead of its items. On desktop the home page
// is already beside it, but someone new on a phone still has to reach it.
export function HomeOverviewEmptyButton() {
  const navigate = useNavigate();
  const screenSize = useScreenSizeContext();

  if (screenSize !== ScreenSize.Mobile) return null;

  return (
    <Button
      onClick={() => navigate(getHomeOverviewPath())}
      variant="Secondary"
      fill="Soft"
      size="300"
    >
      <Text size="B300" truncate>
        {tr('home.overview', 'Overview')}
      </Text>
    </Button>
  );
}

// Opens the home page (WelcomePage) from the Home nav. Without it, the Home tab returns to the
// last open room and the home page can't be reached once a room was opened. A dot shows while
// there's news the user hasn't seen there.
export function HomeOverviewNavItem() {
  const navigate = useNavigate();
  const screenSize = useScreenSizeContext();
  // On mobile the home path shows this nav itself, so the home page has its own path.
  const path = screenSize === ScreenSize.Mobile ? getHomeOverviewPath() : getHomePath();
  const selected = !!useMatch({ path, caseSensitive: true, end: true });
  const { unseen } = useWhatsNewSeen();

  return (
    <NavItem variant="Background" radii="400" aria-selected={selected}>
      <NavButton onClick={() => navigate(path)}>
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
