import React from 'react';
import { Switch } from 'folds';
import { SettingTile } from '../../components/setting-tile';
import { setAppBackgroundEnabled, useAppBackgroundEnabled } from './backgroundSetting';

export function AppBackgroundSetting() {
  const enabled = useAppBackgroundEnabled();
  return (
    <SettingTile
      title="Background Image"
      description="Show the wallpaper behind the app. Off uses the theme's solid color."
      after={<Switch variant="Primary" value={enabled} onChange={setAppBackgroundEnabled} />}
    />
  );
}
