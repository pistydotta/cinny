import React from 'react';
import { Box, Scroll, Text, config, toRem } from 'folds';
import { Page, PageContent } from '../../components/page';
import { MobileBackHeader } from '../home-overview/MobileBackHeader';
import { tr } from '../translation/tr';

// Only says thanks for now: no payment and no data yet.
export function CoffeePage() {
  return (
    <Page>
      <MobileBackHeader />
      <Scroll hideTrack visibility="Hover">
        <PageContent>
          <Box
            direction="Column"
            gap="200"
            style={{
              maxWidth: toRem(640),
              margin: '0 auto',
              paddingTop: config.space.S700,
              paddingBottom: config.space.S700,
            }}
          >
            <Text size="H3">{tr('coffee.title', 'Thanks for the thought!')}</Text>
            <Text size="T400" priority="400">
              {tr(
                'coffee.body',
                'Blazeroom is kept going together by the people who use the server and are part of my life. For now there is no way to donate here.'
              )}
            </Text>
          </Box>
        </PageContent>
      </Scroll>
    </Page>
  );
}
