import React from 'react';
import { Box, Scroll, Text, config, toRem } from 'folds';
import { Page, PageContent } from '../../components/page';
import { MobileBackHeader } from '../home-overview/MobileBackHeader';
import { tr } from '../translation/tr';
import { FeedbackForm } from './FeedbackForm';

const intro = () =>
  tr('feedback.intro', 'Report a bug, suggest an improvement or tell us anything else.');

export function FeedbackPage() {
  return (
    <Page>
      <MobileBackHeader />
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

// The feedback form as a settings section, on the Help & about tab.
export function FeedbackSection() {
  return (
    <Box direction="Column" gap="100">
      <Box direction="Column" gap="100">
        <Text size="L400">{tr('feedback.send_title', 'Send feedback')}</Text>
        <Text size="T200" priority="300">
          {intro()}
        </Text>
      </Box>
      <FeedbackForm />
    </Box>
  );
}
