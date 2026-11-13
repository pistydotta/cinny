import React, { useEffect, useState } from 'react';
import { Box, Button, Icon, Icons, Text, config, color } from 'folds';
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

/** A strip at the top when blazeroom was updated since this tab loaded: one click loads it. */
export function AppUpdateBanner() {
  const available = useNewVersion();
  if (!available) return null;

  return (
    <Box
      shrink="No"
      alignItems="Center"
      justifyContent="Center"
      gap="300"
      wrap="Wrap"
      style={{
        padding: `${config.space.S200} ${config.space.S400}`,
        background: color.Primary.Container,
        color: color.Primary.OnContainer,
      }}
    >
      <Icon size="100" src={Icons.ArrowUp} />
      <Text size="T300">{tr('app_update.available', 'A new version of blazeroom is out.')}</Text>
      <Button size="300" radii="300" variant="Primary" onClick={() => window.location.reload()}>
        <Text size="B300">{tr('app_update.reload', 'Update now')}</Text>
      </Button>
    </Box>
  );
}
