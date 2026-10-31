import React from 'react';
import { Box, Button, Text } from 'folds';
import { SequenceCard } from '../../components/sequence-card';
import { SettingTile } from '../../components/setting-tile';
import { SequenceCardStyle } from '../settings/styles.css';
import { getLanguage, Language, saveLanguage } from './language';
import { tr } from './tr';

const LANGUAGES: { id: Language; name: string }[] = [
  { id: 'pt', name: 'Português' },
  { id: 'en', name: 'English' },
];

export function LanguageSetting() {
  const current = getLanguage();

  // Text is translated as it renders and dates take the language at start, so a reload is
  // the simplest way to switch everything at once.
  const handleSelect = (language: Language) => {
    if (language === current) return;
    saveLanguage(language);
    window.location.reload();
  };

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">{tr('settings.language', 'Language')}</Text>
      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title={tr('settings.language_title', 'App Language')}
          description={tr(
            'settings.language_description',
            'Some less-used screens are only in English.'
          )}
          after={
            <Box gap="200">
              {LANGUAGES.map(({ id, name }) => (
                <Button
                  key={id}
                  size="300"
                  radii="300"
                  variant={id === current ? 'Primary' : 'Secondary'}
                  fill={id === current ? 'Solid' : 'Soft'}
                  onClick={() => handleSelect(id)}
                  aria-pressed={id === current}
                >
                  <Text size="B300">{name}</Text>
                </Button>
              ))}
            </Box>
          }
        />
      </SequenceCard>
    </Box>
  );
}
