import React from 'react';
import { Box, Text, IconButton, Icon, Icons, Scroll, Button, config } from 'folds';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { clearCacheAndReload } from '../../../../client/initMatrix';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { sourceUrl } from '../../source/sourceUrl';
import { SettingsRow, SettingsSection, SectionTitle } from '../SettingsPage';
import { FeedbackSection } from '../../feedback/FeedbackPage';
import { tr } from '../../translation/tr';

export function ClearCacheSetting() {
  const mx = useMatrixClient();
  return (
    <SettingsRow>
      <SettingTile
        title={tr('settings.clear_cache', 'Clear cache and reload')}
        description={tr(
          'settings.clear_cache_description',
          'Clear all your locally stored data and reload from server.'
        )}
        after={
          <Button
            onClick={() => clearCacheAndReload(mx)}
            variant="Secondary"
            fill="Soft"
            size="300"
            radii="300"
            outlined
          >
            <Text size="B300">{tr('settings.clear_cache_button', 'Clear cache')}</Text>
          </Button>
        }
      />
    </SettingsRow>
  );
}

type AboutProps = {
  requestClose: () => void;
};
export function About({ requestClose }: AboutProps) {
  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              {tr('settings.tab.help_about', 'Help & about')}
            </Text>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="700">
              <FeedbackSection />
              <SettingsSection
                title={tr('settings.section.about', 'About')}
                description={tr('settings.about_section.about', 'The app and the code behind it.')}
              >
                <SettingsRow>
                  <SettingTile
                    title={tr('settings.about_version', 'blazeroom, built on Cinny v4.12.8')}
                    description={tr(
                      'settings.about_description',
                      'A Matrix client, open source like Cinny.'
                    )}
                    after={
                      <Box gap="200" wrap="Wrap">
                        <Button
                          as="a"
                          href={sourceUrl}
                          rel="noreferrer noopener"
                          target="_blank"
                          variant="Secondary"
                          fill="Soft"
                          size="300"
                          radii="300"
                          before={<Icon src={Icons.Code} size="100" filled />}
                        >
                          <Text size="B300">{tr('settings.source_code', 'Source code')}</Text>
                        </Button>
                        <Button
                          as="a"
                          href="https://cinny.in/#sponsor"
                          rel="noreferrer noopener"
                          target="_blank"
                          variant="Critical"
                          fill="Soft"
                          size="300"
                          radii="300"
                          before={<Icon src={Icons.Heart} size="100" filled />}
                        >
                          <Text size="B300">{tr('settings.support_cinny', 'Support Cinny')}</Text>
                        </Button>
                      </Box>
                    }
                  />
                </SettingsRow>
              </SettingsSection>
              <Box direction="Column" gap="100">
                <SectionTitle
                  title={tr('settings.section.credits', 'Credits')}
                  description={tr(
                    'settings.about_section.credits',
                    'Open projects blazeroom is built with.'
                  )}
                />
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                >
                  <Box
                    as="ul"
                    direction="Column"
                    gap="200"
                    style={{
                      margin: 0,
                      paddingLeft: config.space.S400,
                    }}
                  >
                    <li>
                      <Text size="T300">
                        The{' '}
                        <a
                          href="https://github.com/matrix-org/matrix-js-sdk"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          matrix-js-sdk
                        </a>{' '}
                        is ©{' '}
                        <a
                          href="https://matrix.org/foundation"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          The Matrix.org Foundation C.I.C
                        </a>{' '}
                        used under the terms of{' '}
                        <a
                          href="http://www.apache.org/licenses/LICENSE-2.0"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          Apache 2.0
                        </a>
                        .
                      </Text>
                    </li>
                    <li>
                      <Text size="T300">
                        The{' '}
                        <a
                          href="https://github.com/mozilla/twemoji-colr"
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          twemoji-colr
                        </a>{' '}
                        font is ©{' '}
                        <a href="https://mozilla.org/" target="_blank" rel="noreferrer noopener">
                          Mozilla Foundation
                        </a>{' '}
                        used under the terms of{' '}
                        <a
                          href="http://www.apache.org/licenses/LICENSE-2.0"
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Apache 2.0
                        </a>
                        .
                      </Text>
                    </li>
                    <li>
                      <Text size="T300">
                        The{' '}
                        <a
                          href="https://twemoji.twitter.com"
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Twemoji
                        </a>{' '}
                        emoji art is ©{' '}
                        <a
                          href="https://twemoji.twitter.com"
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Twitter, Inc and other contributors
                        </a>{' '}
                        used under the terms of{' '}
                        <a
                          href="https://creativecommons.org/licenses/by/4.0/"
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          CC-BY 4.0
                        </a>
                        .
                      </Text>
                    </li>
                    <li>
                      <Text size="T300">
                        The{' '}
                        <a
                          href="https://material.io/design/sound/sound-resources.html"
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Material sound resources
                        </a>{' '}
                        are ©{' '}
                        <a href="https://google.com" target="_blank" rel="noreferrer noopener">
                          Google
                        </a>{' '}
                        used under the terms of{' '}
                        <a
                          href="https://creativecommons.org/licenses/by/4.0/"
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          CC-BY 4.0
                        </a>
                        .
                      </Text>
                    </li>
                  </Box>
                </SequenceCard>
              </Box>
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
