import React, { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { Button, Text } from 'folds';
import { ToastCard } from '../../components/toast';
import { callEmbedAtom } from '../../state/callEmbed';
import { tr } from '../translation/tr';
import { publishedEntry, runningEntry } from './appVersion';

const CHECK_EVERY_MS = 5 * 60 * 1000;

// Asks the server, now and then and whenever the tab comes back, whether a newer build is out.
function useNewVersion(): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    // The dev server has no built entry to compare.
    if (import.meta.env.DEV) return undefined;
    const running = runningEntry();
    if (!running) return undefined;

    let stopped = false;
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      publishedEntry()
        .then((published) => {
          if (!stopped && published && published !== running) setAvailable(true);
        })
        .catch(() => undefined);
    };

    check();
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('online', check);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('online', check);
    };
  }, []);

  return available;
}

/**
 * A card in the toast stack when blazeroom was updated since this tab loaded. Reloading would
 * drop a call (and any screen share), so during one it only says so; the Update button comes
 * back once the call is over. "Later" hides it until the tab is loaded again.
 */
export function AppUpdateBanner() {
  const available = useNewVersion();
  const inCall = !!useAtomValue(callEmbedAtom);
  const [later, setLater] = useState(false);
  if (!available || later) return null;

  return (
    <ToastCard
      text={
        inCall
          ? tr(
              'app_update.available_in_call',
              'A new version of blazeroom is out. Update after the call.'
            )
          : tr('app_update.available', 'A new version of blazeroom is out.')
      }
      actions={
        <>
          <Button
            onClick={() => setLater(true)}
            size="300"
            radii="300"
            variant="Secondary"
            fill="None"
          >
            <Text size="B300">{tr('common.later', 'Later')}</Text>
          </Button>
          {!inCall && (
            <Button
              onClick={() => window.location.reload()}
              size="300"
              radii="300"
              variant="Primary"
              fill="Solid"
            >
              <Text size="B300">{tr('app_update.reload', 'Update')}</Text>
            </Button>
          )}
        </>
      }
    />
  );
}
