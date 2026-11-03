import React from 'react';
import { Badge, Text } from 'folds';
import { CallEmbed, useCallControlState } from '../../plugins/call';
import { tr } from '../translation/tr';
import { useShares } from './useShares';

// Shown in the call status bar for as long as this person is sharing, even from another room.
export function LiveBadge({ callEmbed }: { callEmbed: CallEmbed }) {
  const { local } = useShares(callEmbed.control);
  // The store can still hold the share for a moment after it ends, so ask the call too, like ShareBar.
  const { screenshare } = useCallControlState(callEmbed.control);
  if (!local || !screenshare) return null;

  return (
    <Badge variant="Critical" fill="Solid" size="400">
      <Text as="span" size="L400" truncate>
        {tr('screen_share.badge', 'Live')}
      </Text>
    </Badge>
  );
}
