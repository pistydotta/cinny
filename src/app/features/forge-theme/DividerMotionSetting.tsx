import React from 'react';
import { Switch } from 'folds';
import { SettingTile } from '../../components/setting-tile';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { tr } from '../translation/tr';

// Toggles the animated spark on the room-list divider. ThemeManager turns the choice into the
// `forge-static-divider` body class, which shell.css.ts reads to freeze the effect.
export function DividerMotionSetting() {
  const [animatedDivider, setAnimatedDivider] = useSetting(settingsAtom, 'animatedDivider');

  return (
    <SettingTile
      title={tr('forge.animated_divider', 'Animated divider')}
      description={tr(
        'forge.animated_divider_description',
        'The line beside the room list glows and a spark glides down it.'
      )}
      after={<Switch variant="Primary" value={animatedDivider} onChange={setAnimatedDivider} />}
    />
  );
}
