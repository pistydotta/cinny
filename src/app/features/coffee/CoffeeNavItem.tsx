import React from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { Avatar, Box, Icon, Icons, Text } from 'folds';
import { NavButton, NavItem, NavItemContent } from '../../components/nav';
import { getHomeCoffeePath } from '../../pages/pathUtils';
import { tr } from '../translation/tr';

export function CoffeeNavItem() {
  const navigate = useNavigate();
  const path = getHomeCoffeePath();
  const selected = !!useMatch({ path, caseSensitive: true, end: true });

  return (
    <NavItem variant="Background" radii="400" aria-selected={selected}>
      <NavButton onClick={() => navigate(path)}>
        <NavItemContent>
          <Box as="span" grow="Yes" alignItems="Center" gap="200">
            <Avatar size="200" radii="400">
              <Icon src={Icons.Cup} size="100" filled={selected} />
            </Avatar>
            <Box as="span" grow="Yes">
              <Text as="span" size="Inherit" truncate>
                {tr('coffee.nav', 'Buy me a coffee')}
              </Text>
            </Box>
          </Box>
        </NavItemContent>
      </NavButton>
    </NavItem>
  );
}
