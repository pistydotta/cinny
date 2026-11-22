import React, { useEffect, useState } from 'react';
import { Box, Text } from 'folds';
import { SettingTile } from '../../components/setting-tile';
import { CardList, ItemTitle } from '../home-overview/CardList';
import { tr } from '../translation/tr';
import { isDesktopApp } from '../desktop-download/desktopDownload';
import { shownItems, WHATS_NEW } from './entries';
import { useWhatsNewSeen } from './whatsNewSeen';
import * as css from '../home-overview/homeOverview.css';

// Closed, the card is a headline list: the newest entries, one line each.
const FOLDED_SHOWN = 2;

// The latest entries, on Visão geral. Showing them counts as seen, which clears the Home
// nav's dot.
export function WhatsNewCard() {
  const { markSeen } = useWhatsNewSeen();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    markSeen();
  }, [markSeen]);

  const items = shownItems(WHATS_NEW, isDesktopApp(navigator.userAgent));
  if (items.length === 0) return null;
  const shown = open ? items : items.slice(0, FOLDED_SHOWN);

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">{tr('whats_new.title', "What's new")}</Text>
      <CardList>
        {shown.map((item) => (
          <SettingTile
            key={item.title}
            title={<ItemTitle>{item.title}</ItemTitle>}
            description={open ? item.body : <span className={css.NewsLine}>{item.body}</span>}
          />
        ))}
      </CardList>
      <button
        type="button"
        className={css.NewsMore}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Text as="span" size="T300">
          {open ? tr('whats_new.show_less', 'Show less') : tr('whats_new.show_all', 'See all news')}
        </Text>
      </button>
    </Box>
  );
}
