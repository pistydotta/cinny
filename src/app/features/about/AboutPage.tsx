import React from 'react';
import { Box, Scroll, Text, config, toRem } from 'folds';
import { Page, PageContent } from '../../components/page';
import { MobileBackHeader } from '../home-overview/MobileBackHeader';
import { tr } from '../translation/tr';

function AboutSection({ title, body }: { title: string; body: string }) {
  return (
    <Box direction="Column" gap="200">
      <Text size="H4">{title}</Text>
      <Text size="T400" priority="400">
        {body}
      </Text>
    </Box>
  );
}

export function AboutPage() {
  return (
    <Page>
      <MobileBackHeader />
      <Scroll hideTrack visibility="Hover">
        <PageContent>
          <Box
            direction="Column"
            gap="600"
            style={{
              maxWidth: toRem(640),
              margin: '0 auto',
              paddingTop: config.space.S700,
              paddingBottom: config.space.S700,
            }}
          >
            <AboutSection
              title={tr('about.title', 'About blazeroom')}
              body={tr(
                'about.what',
                'Blazeroom is a Discord-style chat, with servers, rooms, direct messages and voice calls. It is a private server that I run for myself and the people in my life.'
              )}
            />
            <AboutSection
              title={tr('about.how_title', 'How it is made')}
              body={tr(
                'about.how',
                'It runs on Matrix, an open messaging protocol also used by the German armed forces and the French government. The server is Synapse and the app is a modified version of Cinny, both open source.'
              )}
            />
            <AboutSection
              title={tr('about.files_title', 'How long files stay')}
              body={tr(
                'about.files',
                'Files have no expiry date: they stay on the server until I remove them. Deleting a message does not delete its file from the server. Each file can be up to 100 MB. If space runs out, this may change.'
              )}
            />
            <AboutSection
              title={tr('about.cost_title', 'What it costs')}
              body={tr(
                'about.cost',
                'It is free. There may be a VIP in the future, to unlock specific features and support the server, but buying it will never be required.'
              )}
            />
          </Box>
        </PageContent>
      </Scroll>
    </Page>
  );
}
