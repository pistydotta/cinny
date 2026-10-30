import React, { useState } from 'react';
import { Box, Button, Text } from 'folds';
import { SettingTile } from '../../components/setting-tile';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useUserProfile } from '../../hooks/useUserProfile';
import { getMxIdLocalPart } from '../../utils/matrix';
import { EncryptionFlow, useEncryptionStep } from '../encryption-setup/EncryptionSetup';
import { DESKTOP_DOWNLOAD_URL, showDesktopDownload } from '../desktop-download/desktopDownload';
import { tr } from '../translation/tr';
import { WelcomeItem, welcomeItems } from './welcomeItems';
import { CardList, ItemTitle } from './CardList';

function WelcomeRow({ item, onEncryption }: { item: WelcomeItem; onEncryption: () => void }) {
  if (item === 'protect' || item === 'verify') {
    const protect = item === 'protect';
    return (
      <SettingTile
        title={
          <ItemTitle>
            {protect
              ? tr('encryption.protect_title', 'Protect your messages')
              : tr('encryption.verify_title', 'Verify this device')}
          </ItemTitle>
        }
        description={
          protect
            ? tr(
                'encryption.banner_create',
                'Create a recovery key to read your messages on other devices.'
              )
            : tr('encryption.banner_unlock', "This device can't read your encrypted messages yet.")
        }
        after={
          <Button size="300" radii="300" variant="Primary" onClick={onEncryption}>
            <Text size="B300">
              {protect ? tr('encryption.set_up', 'Set up') : tr('encryption.verify', 'Verify')}
            </Text>
          </Button>
        }
      />
    );
  }

  if (item === 'windows') {
    return (
      <SettingTile
        title={<ItemTitle>{tr('welcome.windows_title', 'Windows app')}</ItemTitle>}
        description={tr('welcome.windows_body', 'Use blazeroom without opening the browser.')}
        after={
          <Button
            as="a"
            href={DESKTOP_DOWNLOAD_URL}
            download
            size="300"
            radii="300"
            variant="Secondary"
            fill="Soft"
          >
            <Text size="B300">{tr('welcome.download', 'Download')}</Text>
          </Button>
        }
      />
    );
  }

  return (
    <SettingTile
      title={<ItemTitle>{tr('settings.language', 'Language')}</ItemTitle>}
      description={tr(
        'welcome.language_body',
        'To change it, open Settings (your avatar, bottom left) > General > Language.'
      )}
    />
  );
}

// The greeting on Visão geral, with what's left to set up. It replaces the dialogs that used
// to open on their own when someone logged in.
export function WelcomeCard() {
  const mx = useMatrixClient();
  const userId = mx.getSafeUserId();
  const { displayName } = useUserProfile(userId);
  const name = displayName || getMxIdLocalPart(userId) || userId;
  const encryptionStep = useEncryptionStep();
  const [encryptionOpen, setEncryptionOpen] = useState(false);

  const items = welcomeItems({
    encryptionStep,
    canDownloadDesktop: showDesktopDownload(navigator.userAgent),
  });

  return (
    <Box direction="Column" gap="400">
      <Box direction="Column" gap="100">
        <Text size="H3">{tr('welcome.greeting', 'Hi, {{name}}!', { name })}</Text>
        <Text size="T300" priority="400">
          {tr('welcome.subtitle', 'Welcome to blazeroom.')}
        </Text>
      </Box>
      <CardList>
        {items.map((item) => (
          <WelcomeRow key={item} item={item} onEncryption={() => setEncryptionOpen(true)} />
        ))}
      </CardList>
      {encryptionOpen && (
        <EncryptionFlow step={encryptionStep} onClose={() => setEncryptionOpen(false)} />
      )}
    </Box>
  );
}
