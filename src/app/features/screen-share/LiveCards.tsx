import React from 'react';
import { Box, Button, Icon, Icons, Text } from 'folds';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { tr } from '../translation/tr';
import { useShares } from './useShares';
import { readSavedVolume } from './watchRules';
import * as css from './styles.css';

// One card per share in the call that the person isn't watching yet.
export function LiveCards({ callEmbed }: { callEmbed: CallEmbed }) {
  const { store, remotes } = useShares(callEmbed.control);
  const waiting = remotes.filter((share) => !share.watching);
  if (!store || waiting.length === 0) return null;

  return (
    <Box className={css.Cards} direction="Column" gap="200">
      {waiting.map((share) => (
        <Box key={share.id} className={css.Card} alignItems="Center" gap="300">
          <Icon size="200" src={Icons.ScreenShare} />
          <Box grow="Yes">
            <Text size="T300" truncate>
              {tr('screen_share.is_live', '{{name}} is live', { name: share.name })}
            </Text>
          </Box>
          <Button
            size="300"
            variant="Primary"
            radii="300"
            onClick={() => store.watch(share.id, readSavedVolume(localStorage))}
          >
            <Text size="B300">{tr('screen_share.watch', 'Watch')}</Text>
          </Button>
        </Box>
      ))}
    </Box>
  );
}
