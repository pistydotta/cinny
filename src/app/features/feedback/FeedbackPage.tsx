import React from 'react';
import { Box, Icon, IconButton, Icons, Scroll, Text, config, toRem } from 'folds';
import { Page, PageContent, PageHeader } from '../../components/page';
import { tr } from '../translation/tr';
import { FeedbackForm } from './FeedbackForm';

const intro = () =>
  tr('feedback.intro', 'Report a bug, suggest an improvement or tell us anything else.');

export function FeedbackPage() {
  return (
    <Page>
      <Scroll hideTrack visibility="Hover">
        <PageContent>
          <Box
            direction="Column"
            gap="400"
            style={{
              maxWidth: toRem(640),
              margin: '0 auto',
              paddingTop: config.space.S700,
              paddingBottom: config.space.S700,
            }}
          >
            <Box direction="Column" gap="100">
              <Text size="H3">{tr('feedback.title', 'Help & feedback')}</Text>
              <Text size="T300" priority="400">
                {intro()}
              </Text>
            </Box>
            <FeedbackForm />
          </Box>
        </PageContent>
      </Scroll>
    </Page>
  );
}

// Visão geral isn't shown on mobile, so this is how phones get to the form.
export function FeedbackSettings({ requestClose }: { requestClose: () => void }) {
  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              {tr('feedback.title', 'Help & feedback')}
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
            <Box direction="Column" gap="400">
              <Text size="T300" priority="400">
                {intro()}
              </Text>
              <FeedbackForm />
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
