import React from 'react';
import { Badge, Text } from 'folds';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { tr } from '../translation/tr';
import { useShares } from './useShares';

// Shown in the call status bar for as long as this person is sharing, even from another room.
export function LiveBadge({ callEmbed }: { callEmbed: CallEmbed }) {
  const { local } = useShares(callEmbed.control);
  if (!local) return null;

  return (
    <Badge variant="Critical" fill="Solid" size="400">
      <Text as="span" size="L400" truncate>
        {tr('screen_share.badge', 'Live')}
      </Text>
    </Badge>
  );
}
