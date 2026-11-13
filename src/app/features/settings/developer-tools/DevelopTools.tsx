import React, { useCallback, useState } from 'react';
import { Box, Text, IconButton, Icon, Icons, Scroll, Switch, Button } from 'folds';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import {
  AccountDataEditor,
  AccountDataSubmitCallback,
} from '../../../components/AccountDataEditor';
import { copyToClipboard } from '../../../utils/dom';
import { AccountData } from './AccountData';
import { SettingsSection , SectionTitle } from '../SettingsPage';
import { HiddenEventsSetting } from '../general';
import { ClearCacheSetting } from '../about';
import { tr } from '../../translation/tr';

type DeveloperToolsProps = {
  requestClose: () => void;
};
export function DeveloperTools({ requestClose }: DeveloperToolsProps) {
  const mx = useMatrixClient();
  const [developerTools, setDeveloperTools] = useSetting(settingsAtom, 'developerTools');
  const [expand, setExpend] = useState(false);
  const [accountDataType, setAccountDataType] = useState<string | null>();

  const submitAccountData: AccountDataSubmitCallback = useCallback(
    async (type, content) => {
      await mx.setAccountData(type, content);
    },
    [mx]
  );

  if (accountDataType !== undefined) {
    return (
      <AccountDataEditor
        type={accountDataType ?? undefined}
        content={accountDataType ? mx.getAccountData(accountDataType)?.getContent() : undefined}
        submitChange={submitAccountData}
        requestClose={() => setAccountDataType(undefined)}
      />
    );
  }

  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              {tr('settings.tab.advanced', 'Advanced')}
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
              <SettingsSection
                title={tr('settings.section.timeline', 'Timeline')}
                description={tr(
                  'settings.about_section.debug_timeline',
                  'See what the app normally hides.'
                )}
              >
                <HiddenEventsSetting />
              </SettingsSection>
              <SettingsSection
                title={tr('settings.section.local_data', 'Local data')}
                description={tr(
                  'settings.about_section.local_data',
                  "What's stored on this device."
                )}
              >
                <ClearCacheSetting />
              </SettingsSection>
              <Box direction="Column" gap="100">
                <SectionTitle
                  title={tr('settings.section.developer', 'Developer')}
                  description={tr(
                    'settings.about_section.developer',
                    'Tools for people working on the code.'
                  )}
                />
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                >
                  <SettingTile
                    title={tr('settings.developer_tools', 'Developer tools')}
                    after={
                      <Switch
                        variant="Primary"
                        value={developerTools}
                        onChange={setDeveloperTools}
                      />
                    }
                  />
                </SequenceCard>
                {developerTools && (
                  <SequenceCard
                    className={SequenceCardStyle}
                    variant="SurfaceVariant"
                    direction="Column"
                    gap="400"
                  >
                    <SettingTile
                      title="Access Token"
                      description="Copy access token to clipboard."
                      after={
                        <Button
                          onClick={() =>
                            copyToClipboard(mx.getAccessToken() ?? '<NO_ACCESS_TOKEN_FOUND>')
                          }
                          variant="Secondary"
                          fill="Soft"
                          size="300"
                          radii="300"
                          outlined
                        >
                          <Text size="B300">Copy</Text>
                        </Button>
                      }
                    />
                  </SequenceCard>
                )}
              </Box>
              {developerTools && (
                <AccountData
                  expand={expand}
                  onExpandToggle={setExpend}
                  onSelect={setAccountDataType}
                />
              )}
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
