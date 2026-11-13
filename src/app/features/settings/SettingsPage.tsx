import React, { ReactNode } from 'react';
import { Box, Icon, IconButton, Icons, Scroll, Text } from 'folds';
import { Page, PageContent, PageHeader } from '../../components/page';
import { SequenceCard } from '../../components/sequence-card';
import { SectionDescription, SectionHeading, SectionName, SequenceCardStyle } from './styles.css';

type SettingsPageProps = {
  title: string;
  requestClose: () => void;
  children: ReactNode;
};
// The frame every settings tab shares; the settings shell hides the header and shows its own.
export function SettingsPage({ title, requestClose, children }: SettingsPageProps) {
  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              {title}
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
              {children}
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}

type SectionTitleProps = {
  title: string;
  description?: string;
};
// The left column of a section; the shell numbers it and marks the one in view.
export function SectionTitle({ title, description }: SectionTitleProps) {
  return (
    <div className={SectionHeading}>
      <Text as="p" size="L400" className={SectionName}>
        {title}
      </Text>
      {description && (
        <Text as="p" size="T200" className={SectionDescription}>
          {description}
        </Text>
      )}
    </div>
  );
}

// A section: its title on the left, its rows on the right (see settingsShell.css.ts).
export function SettingsSection({
  title,
  description,
  children,
}: SectionTitleProps & { children: ReactNode }) {
  return (
    <Box direction="Column" gap="100">
      <SectionTitle title={title} description={description} />
      {children}
    </Box>
  );
}
export function SettingsRow({ children }: { children: ReactNode }) {
  return (
    <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
      {children}
    </SequenceCard>
  );
}
