import React from 'react';
import { Box, Scroll, Text, config, toRem } from 'folds';
import { Page, PageContent } from '../../components/page';
import { WhatsNewCard } from '../whats-new/WhatsNewCard';
import { tr } from '../translation/tr';
import { WelcomeCard } from './WelcomeCard';
import { JokeLine } from './JokeLine';

// Visão geral: the greeting with what's left to set up, then the latest news. Nothing here
// opens by itself.
export function HomeOverview() {
  return (
    <Page>
      <Scroll hideTrack visibility="Hover">
        <PageContent>
          <Box
            direction="Column"
            gap="700"
            style={{
              maxWidth: toRem(640),
              margin: '0 auto',
              paddingTop: config.space.S700,
              paddingBottom: config.space.S700,
            }}
          >
            <WelcomeCard />
            <WhatsNewCard />
            <JokeLine />
            <Text size="T200" priority="300">
              {tr('welcome.built_on', 'Built on')}{' '}
              <a
                href="https://github.com/cinnyapp/cinny/releases"
                target="_blank"
                rel="noreferrer noopener"
              >
                Cinny v4.12.8
              </a>
              {' · '}
              <a
                href="https://github.com/pistydotta/cinny"
                target="_blank"
                rel="noreferrer noopener"
              >
                {tr('welcome.source_code', 'Source code')}
              </a>
            </Text>
          </Box>
        </PageContent>
      </Scroll>
    </Page>
  );
}
