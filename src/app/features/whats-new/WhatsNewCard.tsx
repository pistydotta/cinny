import React, { useEffect } from 'react';
import { Box, Text } from 'folds';
import { SequenceCard } from '../../components/sequence-card';
import { SettingTile } from '../../components/setting-tile';
import { SequenceCardStyle } from '../settings/styles.css';
import { tr } from '../translation/tr';
import { MAX_SHOWN, WHATS_NEW } from './entries';
import { useWhatsNewSeen } from './whatsNewSeen';

// The latest entries, on Visão geral. Showing them counts as seen, which clears the Home
// nav's dot.
export function WhatsNewCard() {
  const { markSeen } = useWhatsNewSeen();

  useEffect(() => {
    markSeen();
  }, [markSeen]);

  const items = WHATS_NEW.slice(0, MAX_SHOWN).flatMap((entry) => entry.items());
  if (items.length === 0) return null;

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">{tr('whats_new.title', "What's new")}</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        {items.map((item) => (
          <SettingTile key={item.title} title={item.title} description={item.body} />
        ))}
      </SequenceCard>
    </Box>
  );
}
