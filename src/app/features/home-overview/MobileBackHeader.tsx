import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Icon, IconButton, Icons, Text } from 'folds';
import { PageHeader } from '../../components/page';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { getHomePath } from '../../pages/pathUtils';

// On mobile a page under Home replaces the nav, so it needs its own way back.
export function MobileBackHeader({ title }: { title?: string }) {
  const navigate = useNavigate();
  const screenSize = useScreenSizeContext();

  if (screenSize !== ScreenSize.Mobile) return null;

  return (
    <PageHeader balance>
      <Box grow="Yes" alignItems="Center" gap="200">
        <Box grow="Yes" basis="No">
          <IconButton onClick={() => navigate(getHomePath())}>
            <Icon src={Icons.ArrowLeft} />
          </IconButton>
        </Box>
        {title && (
          <Text size="H3" truncate>
            {title}
          </Text>
        )}
        <Box grow="Yes" basis="No" />
      </Box>
    </PageHeader>
  );
}
