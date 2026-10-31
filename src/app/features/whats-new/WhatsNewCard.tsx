import React, { useEffect } from 'react';
import { Box, Text } from 'folds';
import { SettingTile } from '../../components/setting-tile';
import { CardList, ItemTitle } from '../home-overview/CardList';
import { tr } from '../translation/tr';
import { isDesktopApp } from '../desktop-download/desktopDownload';
import { shownItems, WHATS_NEW } from './entries';
import { useWhatsNewSeen } from './whatsNewSeen';

// The latest entries, on Visão geral. Showing them counts as seen, which clears the Home
// nav's dot.
export function WhatsNewCard() {
  const { markSeen } = useWhatsNewSeen();

  useEffect(() => {
    markSeen();
  }, [markSeen]);

  const items = shownItems(WHATS_NEW, isDesktopApp(navigator.userAgent));
  if (items.length === 0) return null;

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">{tr('whats_new.title', "What's new")}</Text>
      <CardList>
        {items.map((item) => (
          <SettingTile
            key={item.title}
            title={<ItemTitle>{item.title}</ItemTitle>}
            description={item.body}
          />
        ))}
      </CardList>
    </Box>
  );
}
