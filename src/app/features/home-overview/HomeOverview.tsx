import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Scroll, Text, config, toRem } from 'folds';
import { Page, PageContent } from '../../components/page';
import { WhatsNewCard } from '../whats-new/WhatsNewCard';
import { tr } from '../translation/tr';
import { WelcomeCard } from './WelcomeCard';
import { sourceUrl } from '../source/sourceUrl';
import { AppsCard } from './AppsCard';
import { JokeLine } from './JokeLine';
import { MobileBackHeader } from './MobileBackHeader';
import { HappeningNow } from './HappeningNow';
import { getHomeCoffeePath } from '../../pages/pathUtils';

// Visão geral: the greeting with what's left to set up, who's in a call now, then the latest
// news. Nothing here opens by itself.
export function HomeOverview() {
  return (
    <Page>
      <MobileBackHeader title={tr('home.overview', 'Overview')} />
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
            <HappeningNow />
            <AppsCard />
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
              <a href={sourceUrl} target="_blank" rel="noreferrer noopener">
                {tr('welcome.source_code', 'Source code')}
              </a>
              {' · '}
              <Link to={getHomeCoffeePath()}>{tr('coffee.nav', 'Buy me a coffee')}</Link>
            </Text>
          </Box>
        </PageContent>
      </Scroll>
    </Page>
  );
}
