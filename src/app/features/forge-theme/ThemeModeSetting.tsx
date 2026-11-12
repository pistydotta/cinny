import React from 'react';
import { Box, Button, Text } from 'folds';
import { SettingTile } from '../../components/setting-tile';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { tr } from '../translation/tr';
import { modeFromSettings, settingsForMode, ThemeMode } from './themeMode';

const MODES: ThemeMode[] = ['system', 'light', 'dark'];

const modeName = (mode: ThemeMode): string => {
  if (mode === 'system') return tr('forge.system', 'System');
  return mode === 'light' ? tr('forge.light', 'Light') : tr('forge.dark', 'Dark');
};

export function ThemeModeSetting() {
  const [useSystemTheme, setUseSystemTheme] = useSetting(settingsAtom, 'useSystemTheme');
  const [themeId, setThemeId] = useSetting(settingsAtom, 'themeId');
  const current = modeFromSettings({ useSystemTheme, themeId });

  const handleSelect = (mode: ThemeMode) => {
    const next = settingsForMode(mode);
    setUseSystemTheme(next.useSystemTheme);
    // "System" keeps the last manual choice, so switching back lands where the person was.
    if (next.themeId) setThemeId(next.themeId);
  };

  return (
    <SettingTile
      title={tr('forge.theme', 'Theme')}
      description={tr(
        'forge.theme_description',
        'System follows your device’s light or dark mode.'
      )}
      after={
        <Box gap="200">
          {MODES.map((mode) => (
            <Button
              key={mode}
              size="300"
              radii="300"
              variant={mode === current ? 'Primary' : 'Secondary'}
              fill={mode === current ? 'Solid' : 'Soft'}
              onClick={() => handleSelect(mode)}
              aria-pressed={mode === current}
            >
              <Text size="B300">{modeName(mode)}</Text>
            </Button>
          ))}
        </Box>
      }
    />
  );
}
