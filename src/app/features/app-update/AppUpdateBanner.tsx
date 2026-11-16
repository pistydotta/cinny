import React, { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { Box, Text, config, color } from 'folds';
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
 * A thin line at the top when blazeroom was updated since this tab loaded. Reloading would
 * drop a call (and any screen share), so during one it only says so; the reload link comes back
 * once the call is over.
 */
export function AppUpdateBanner() {
  const available = useNewVersion();
  const inCall = !!useAtomValue(callEmbedAtom);
  if (!available) return null;

  return (
    <Box
      shrink="No"
      alignItems="Center"
      justifyContent="Center"
      gap="200"
      wrap="Wrap"
      style={{
        padding: `${config.space.S100} ${config.space.S300}`,
        background: color.Background.Container,
        color: color.Background.OnContainer,
        borderBottom: `${config.borderWidth.B300} solid ${color.Background.ContainerLine}`,
      }}
    >
      <Text size="T200" priority="300">
        {inCall
          ? tr(
              'app_update.available_in_call',
              'A new version of blazeroom is out. Update after the call.'
            )
          : tr('app_update.available', 'A new version of blazeroom is out.')}
      </Text>
      {!inCall && (
        <Text
          as="button"
          type="button"
          size="T200"
          onClick={() => window.location.reload()}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: color.Primary.Main,
            textDecoration: 'underline',
          }}
        >
          {tr('app_update.reload', 'Update')}
        </Text>
      )}
    </Box>
  );
}
