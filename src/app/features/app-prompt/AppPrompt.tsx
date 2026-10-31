import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, Button, Text, color, config, toRem } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { ANDROID_DOWNLOAD_URL } from '../android-app/androidApp';
import { DESKTOP_DOWNLOAD_URL } from '../desktop-download/desktopDownload';
import { tr } from '../translation/tr';
import {
  AppPromptState,
  PromptedApp,
  appPromptKey,
  parsePromptState,
  promptedApp,
  recordDownload,
  recordShown,
  shouldPrompt,
} from './appPromptRules';

const APPS: Record<PromptedApp, { name: string; url: string }> = {
  android: { name: 'Android', url: ANDROID_DOWNLOAD_URL },
  windows: { name: 'Windows', url: DESKTOP_DOWNLOAD_URL },
};

// Without storage it couldn't remember being shown, so it would ask on every visit. Undefined then.
const readState = (key: string): AppPromptState | undefined => {
  try {
    return parsePromptState(localStorage.getItem(key));
  } catch {
    return undefined;
  }
};

const writeState = (key: string, state: AppPromptState) => {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Nothing else to do: it just can't remember this time.
  }
};

// A small card offering the app to someone using the site in a browser. It leaves the page usable,
// and appPromptRules decides how often it comes back.
export function AppPrompt() {
  const mx = useMatrixClient();
  const key = appPromptKey(mx.getUserId() ?? '');
  const app = promptedApp(navigator.userAgent);
  const [open, setOpen] = useState(() => {
    const state = app && readState(key);
    return !!state && shouldPrompt(state, Date.now());
  });

  useEffect(() => {
    if (!open) return;
    const state = readState(key);
    if (state) writeState(key, recordShown(state, Date.now()));
    // Counted once, when it appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open || !app) return null;

  const onDownload = () => {
    const state = readState(key);
    if (state) writeState(key, recordDownload(state));
    setOpen(false);
  };

  return createPortal(
    <Box
      justifyContent="Center"
      style={{
        position: 'fixed',
        left: config.space.S400,
        right: config.space.S400,
        bottom: config.space.S500,
        zIndex: 9998,
        pointerEvents: 'none',
      }}
    >
      <Box
        role="status"
        alignItems="Center"
        wrap="Wrap"
        gap="300"
        style={{
          pointerEvents: 'auto',
          maxWidth: toRem(480),
          padding: `${config.space.S200} ${config.space.S200} ${config.space.S200} ${config.space.S400}`,
          borderRadius: config.radii.R400,
          background: color.Surface.Container,
          color: color.Surface.OnContainer,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        }}
      >
        <Box grow="Yes">
          <Text size="T300">
            {tr('app_prompt.text', 'Blazeroom has an app for {{platform}}', {
              platform: APPS[app].name,
            })}
          </Text>
        </Box>
        <Box alignItems="Center" gap="200">
          <Button
            onClick={() => setOpen(false)}
            size="300"
            radii="300"
            variant="Secondary"
            fill="None"
          >
            <Text size="B300">{tr('app_prompt.not_now', 'Not now')}</Text>
          </Button>
          <Button
            as="a"
            href={APPS[app].url}
            download
            onClick={onDownload}
            size="300"
            radii="300"
            variant="Primary"
            fill="Solid"
          >
            <Text size="B300">{tr('apps.download', 'Download')}</Text>
          </Button>
        </Box>
      </Box>
    </Box>,
    document.body
  );
}
