import React, { useCallback, useEffect, useState } from 'react';
import { Box, Spinner, Switch, Text, color } from 'folds';
import { IPusherRequest } from 'matrix-js-sdk';
import { SequenceCard } from '../../components/sequence-card';
import { SequenceCardStyle } from '../settings/styles.css';
import { SettingTile } from '../../components/setting-tile';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { useClientConfig } from '../../hooks/useClientConfig';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { getLanguage } from '../translation/language';
import { tr } from '../translation/tr';
import { PUSH_APP_ID, PushConfig, pushSupport, vapidKeyBytes, webPusher } from './pushApi';

const usePushSupport = () => {
  const { push } = useClientConfig();
  return pushSupport({
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notification: 'Notification' in window,
    standalone: window.matchMedia('(display-mode: standalone)').matches,
    userAgent: navigator.userAgent,
    configured: !!push?.gatewayUrl && !!push.vapidKey,
  });
};

const currentSubscription = async () =>
  (await navigator.serviceWorker.ready).pushManager.getSubscription();

// On in this browser only if the browser is subscribed and Synapse still has its pusher: a new
// login or an account switch leaves a subscription with no pusher.
const useIsPushOn = (): [boolean | undefined, (on: boolean) => void] => {
  const mx = useMatrixClient();
  const [on, setOn] = useState<boolean>();

  useEffect(() => {
    let current = true;
    (async () => {
      const subscription = await currentSubscription();
      const pushkey = subscription?.toJSON().keys?.p256dh;
      const { pushers } = await mx.getPushers();
      if (current) setOn(!!pushkey && !!pushers?.some((pusher) => pusher.pushkey === pushkey));
    })().catch(() => {
      if (current) setOn(false);
    });
    return () => {
      current = false;
    };
  }, [mx]);

  return [on, setOn];
};

function PushSwitch({ config }: { config: PushConfig }) {
  const mx = useMatrixClient();
  const [on, setOn] = useIsPushOn();

  const [changeState, change] = useAsyncCallback<void, unknown, [boolean]>(
    useCallback(
      async (enable: boolean) => {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();

        if (!enable) {
          const pushkey = existing?.toJSON().keys?.p256dh;
          if (pushkey) {
            await mx.setPusher({
              pushkey,
              app_id: PUSH_APP_ID,
              kind: null,
            } as unknown as IPusherRequest);
          }
          await existing?.unsubscribe();
          setOn(false);
          return;
        }

        // Has to come from the user's tap: iPhones refuse it otherwise.
        if ((await Notification.requestPermission()) !== 'granted') {
          throw new Error('permission');
        }
        const subscription =
          existing ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidKeyBytes(config.vapidKey),
          }));
        await mx.setPusher(
          webPusher(subscription.toJSON(), config, getLanguage()) as unknown as IPusherRequest
        );
        setOn(true);
      },
      [mx, config, setOn]
    )
  );
  const busy = on === undefined || changeState.status === AsyncStatus.Loading;

  return (
    <Box direction="Column" gap="100" alignItems="End">
      {busy ? (
        <Spinner size="200" variant="Secondary" />
      ) : (
        <Switch value={!!on} onChange={(value) => change(value).catch(() => undefined)} />
      )}
      {changeState.status === AsyncStatus.Error && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          <b>
            {Notification.permission === 'denied'
              ? tr('push.blocked', 'Notifications are blocked in your browser settings.')
              : tr('push.failed', "Couldn't change this. Try again.")}
          </b>
        </Text>
      )}
    </Box>
  );
}

// In Settings > Notifications. Each browser or phone turns this on for itself.
export function PushNotificationsTile() {
  const { push } = useClientConfig();
  const support = usePushSupport();
  if (support === 'unavailable') return null;

  return (
    <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
      <SettingTile
        title={tr('push.title', 'Notifications with the app closed')}
        description={
          support === 'install_first'
            ? tr(
                'push.install_first',
                'On iPhone, first add blazeroom to your home screen: Share > Add to Home Screen. Then open it from there and turn this on.'
              )
            : tr(
                'push.body',
                'Get notified on this device even when blazeroom is closed. Encrypted messages show who wrote, not the text.'
              )
        }
        after={support === 'available' && push ? <PushSwitch config={push} /> : undefined}
      />
    </SequenceCard>
  );
}

// Opens the room of a tapped notification: told by the service worker when a window was already
// open, or by the address when it had to open a new one.
export function PushRoomOpener() {
  const { navigateRoom } = useRoomNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('push_room');
    if (!roomId) return;
    window.history.replaceState(null, '', window.location.pathname);
    navigateRoom(roomId, params.get('push_event') ?? undefined);
  }, [navigateRoom]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const handleMessage = (evt: MessageEvent) => {
      if (evt.data?.type === 'openRoom' && typeof evt.data.roomId === 'string') {
        navigateRoom(evt.data.roomId, evt.data.eventId);
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [navigateRoom]);

  return null;
}
