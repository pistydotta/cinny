import React from 'react';
import { Button, Icon, Icons, Text } from 'folds';
import { tr } from '../translation/tr';
import { DESKTOP_DOWNLOAD_URL, showDesktopDownload } from './desktopDownload';

export function DesktopDownloadButton() {
  if (!showDesktopDownload(navigator.userAgent)) return null;

  return (
    <Button
      as="a"
      href={DESKTOP_DOWNLOAD_URL}
      download
      variant="Primary"
      before={<Icon size="200" src={Icons.Download} />}
    >
      <Text as="span" size="B400" truncate>
        {tr('desktop_download.button', 'Download for Windows')}
      </Text>
    </Button>
  );
}
