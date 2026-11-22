import React from 'react';
import { Box } from 'folds';
import { SequenceCard } from '../../components/sequence-card';
import { SettingTile } from '../../components/setting-tile';
import { SequenceCardStyle } from '../settings/styles.css';
import { getLanguage, Language, saveLanguage } from './language';
import { tr } from './tr';
import { SectionTitle } from '../settings/SettingsPage';
import { Segmented } from '../forge-theme/Segmented';

const LANGUAGES: { value: Language; name: string }[] = [
  { value: 'pt', name: 'Português' },
  { value: 'en', name: 'English' },
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
      <SectionTitle
        title={tr('settings.language', 'Language')}
        description={tr(
          'settings.about_section.language',
          "The language of the app's menus and text."
        )}
      />
      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title={tr('settings.language_title', 'App Language')}
          description={tr(
            'settings.language_description',
            'Some less-used screens are only in English.'
          )}
          after={
            <Segmented
              label={tr('settings.language_title', 'App Language')}
              options={LANGUAGES}
              value={current}
              onChange={handleSelect}
            />
          }
        />
      </SequenceCard>
    </Box>
  );
}
