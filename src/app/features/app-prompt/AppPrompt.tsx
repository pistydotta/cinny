import React, { useEffect, useState } from 'react';
import { Button, Text } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { ANDROID_DOWNLOAD_URL } from '../android-app/androidApp';
import { DESKTOP_DOWNLOAD_URL } from '../desktop-download/desktopDownload';
import { isCommunityOfferPending, readFirstLogin } from '../first-login/firstLogin';
import { tr } from '../translation/tr';
import { PromptCard } from './PromptCard';
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
    // Only one card at a time: the community invite goes first.
    if (isCommunityOfferPending(readFirstLogin(mx.getSafeUserId()))) return false;
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

  return (
    <PromptCard
      text={tr('app_prompt.text', 'Blazeroom has an app for {{platform}}', {
        platform: APPS[app].name,
      })}
    >
      <Button onClick={() => setOpen(false)} size="300" radii="300" variant="Secondary" fill="None">
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
    </PromptCard>
  );
}
