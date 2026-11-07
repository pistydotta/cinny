import React from 'react';
import { Badge, Box, Button, Icon, Icons, Text } from 'folds';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';
import { useShares } from './useShares';
import { readSavedVolume } from './watchRules';
import * as css from './styles.css';

// One card per share in the call that the person isn't watching yet. The floating viewer is too
// narrow for the card, so it gets one row per share instead.
export function LiveCards({ callEmbed, compact }: { callEmbed: CallEmbed; compact?: boolean }) {
  const { store, remotes } = useShares(callEmbed.control);
  const waiting = remotes.filter((share) => !share.watching);
  if (!store || waiting.length === 0) return null;
  const watch = (id: string) =>
    store.watch(
      id,
      readSavedVolume(() => localStorage)
    );

  if (compact) {
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

  return (
    <Box className={css.Cards} direction="Column" gap="200">
      {waiting.map((share) => (
        <Box key={share.id} className={css.Card} direction="Column" alignItems="Center" gap="300">
          <Box className={css.LivePreview} alignItems="Center" justifyContent="Center">
            <Icon size="600" src={Icons.ScreenShare} />
            <Badge className={css.LiveBadge} variant="Critical" fill="Solid" size="400">
              <Text size="L400">{tr('screen_share.badge', 'Live')}</Text>
            </Badge>
          </Box>
          <Box className={css.LiveName}>
            <Text size="T300" truncate>
              {tr('screen_share.is_live', '{{name}} is live', { name: share.name })}
            </Text>
          </Box>
          <Button
            className={css.WatchButton}
            size="400"
            variant="Primary"
            fill="Solid"
            radii="300"
            onClick={() => watch(share.id)}
          >
            <Icon size="200" src={Icons.Play} />
            <Text size="B400">{tr('screen_share.watch_screen', 'Watch screen')}</Text>
          </Button>
        </Box>
      ))}
    </Box>
  );
}
