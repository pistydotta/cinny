import React from 'react';
import { Box, Button, Text, config, toRem } from 'folds';
import { SequenceCard } from '../../components/sequence-card';
import { SequenceCardStyle } from '../settings/styles.css';
import { DESKTOP_DOWNLOAD_URL } from '../desktop-download/desktopDownload';
import { tr } from '../translation/tr';
import { AppId, AppStatus, availableApps } from './availableApps';
import { ItemTitle } from './CardList';

// folds has no brand icons.
const LOGO_PATHS: Record<AppId, string> = {
  windows:
    'M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801',
  android:
    'M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-2.86-1.21-6.08-1.21-8.94 0L5.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L6.4 9.48C3.3 11.25 1.28 14.44 1 18h22c-.28-3.56-2.3-6.75-5.4-8.52zM7 15.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z',
  apple:
    'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701',
};

const APP_NAMES: Record<AppId, string> = {
  windows: 'Windows',
  android: 'Android',
  apple: 'Apple',
};

function AppStatusLine({ status }: { status: AppStatus }) {
  if (status === 'download') {
    return (
      <Button
        as="a"
        href={DESKTOP_DOWNLOAD_URL}
        download
        size="300"
        radii="300"
        variant="Primary"
        fill="Solid"
      >
        <Text size="B300">{tr('apps.download', 'Download')}</Text>
      </Button>
    );
  }
  return (
    <Text size="T200" priority="300">
      {status === 'current'
        ? tr('apps.current', "You're using it")
        : tr('apps.soon', 'In development')}
    </Text>
  );
}

// On Visão geral: which apps exist and how to get them.
export function AppsCard() {
  return (
    <Box direction="Column" gap="100">
      <Text size="L400">{tr('apps.title', 'Available apps')}</Text>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(${toRem(150)}, 1fr))`,
          gap: config.space.S100,
        }}
      >
        {availableApps(navigator.userAgent).map(({ id, status }) => (
          <SequenceCard
            key={id}
            className={SequenceCardStyle}
            variant="SurfaceVariant"
            direction="Column"
            alignItems="Center"
            gap="300"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
              style={{
                width: toRem(32),
                height: toRem(32),
                opacity: status === 'soon' ? 0.5 : 1,
              }}
            >
              <path d={LOGO_PATHS[id]} />
            </svg>
            <Text size="T300">
              <ItemTitle>{APP_NAMES[id]}</ItemTitle>
            </Text>
            <Box alignItems="Center" style={{ minHeight: toRem(32) }}>
              <AppStatusLine status={status} />
            </Box>
          </SequenceCard>
        ))}
      </div>
    </Box>
  );
}
