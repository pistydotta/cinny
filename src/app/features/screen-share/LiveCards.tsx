import React from 'react';
import { Badge, Box, Icon, Icons, Text } from 'folds';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';
import { useShares } from './useShares';
import { readSavedVolume } from './watchRules';
import * as css from './styles.css';

// One row per share in the call that the person isn't watching yet, for the floating viewer.
// In the call itself each one is a tile in the grid (LiveTiles).
export function LiveCards({ callEmbed }: { callEmbed: CallEmbed }) {
  const { store, remotes } = useShares(callEmbed.control);
  const waiting = remotes.filter((share) => !share.watching);
  if (!store || waiting.length === 0) return null;
  const watch = (id: string) =>
    store.watch(
      id,
      readSavedVolume(() => localStorage)
    );

  return (
    <Box className={css.CompactCards} direction="Column" gap="100">
      {waiting.map((share) => (
        <Box key={share.id} className={css.CompactCard} alignItems="Center" gap="200">
          <Badge variant="Critical" fill="Solid" size="300">
            <Text size="L400">{tr('screen_share.badge', 'Live')}</Text>
          </Badge>
          <Box grow="Yes" className={css.LiveName}>
            <Text size="T200" truncate>
              {share.name}
            </Text>
          </Box>
          <TipIconButton
            label={tr('screen_share.watch_screen', 'Watch screen')}
            variant="Primary"
            fill="Solid"
            size="300"
            radii="300"
            onClick={() => watch(share.id)}
          >
            <Icon size="100" src={Icons.Play} />
          </TipIconButton>
        </Box>
      ))}
    </Box>
  );
}
