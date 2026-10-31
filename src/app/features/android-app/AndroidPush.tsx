import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, Spinner, Switch, Text, color } from 'folds';
import { IPusherRequest, MatrixClient } from 'matrix-js-sdk';
import { SequenceCard } from '../../components/sequence-card';
import { SequenceCardStyle } from '../settings/styles.css';
import { SettingTile } from '../../components/setting-tile';
import { useClientConfig } from '../../hooks/useClientConfig';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getLanguage } from '../translation/language';
import { tr } from '../translation/tr';
import {
  ANDROID_PUSH_APP_ID,
  ANDROID_PUSH_OFF_KEY,
  androidPusher,
  isAndroidApp,
  shouldRegister,
} from './androidApp';
import { androidBridge } from './androidBridge';

type TokenResult = { token?: string; problem?: 'denied' | 'failed' };

// Android's permission prompt can sit open for a while, so this waits for a person's answer.
const TOKEN_TIMEOUT_MS = 120000;

const requestToken = (): Promise<TokenResult> =>
  new Promise((resolve) => {
    const offs: (() => void)[] = [];
    const finish = (result: TokenResult) => {
      offs.forEach((off) => off());
      resolve(result);
    };
    const timeout = window.setTimeout(() => finish({ problem: 'failed' }), TOKEN_TIMEOUT_MS);
    offs.push(
      () => window.clearTimeout(timeout),
      androidBridge.on('pushToken', ({ token }) =>
        finish(typeof token === 'string' && token ? { token } : { problem: 'failed' })
      ),
      androidBridge.on('pushDenied', () => finish({ problem: 'denied' })),
      androidBridge.on('pushFailed', () => finish({ problem: 'failed' }))
    );
    androidBridge.send({ type: 'getPushToken' });
  });

const isOff = (): boolean => {
  try {
    return localStorage.getItem(ANDROID_PUSH_OFF_KEY) === '1';
  } catch {
    return false;
  }
};

const setOff = (off: boolean) => {
  try {
    if (off) localStorage.setItem(ANDROID_PUSH_OFF_KEY, '1');
    else localStorage.removeItem(ANDROID_PUSH_OFF_KEY);
  } catch {
    // Without storage it just registers again next time.
  }
};

const register = (mx: MatrixClient, token: string, gatewayUrl: string) =>
  mx.setPusher(androidPusher(token, gatewayUrl, getLanguage()) as unknown as IPusherRequest);

const useAndroidGateway = (): string | undefined => {
  const { push } = useClientConfig();
  return isAndroidApp(navigator.userAgent) && androidBridge.available()
    ? push?.gatewayUrl
    : undefined;
};

// Registers on every open, since Android can change the token at any time and only the site can
// tell Synapse.
export function AndroidPushRegistrar() {
  const mx = useMatrixClient();
  const gatewayUrl = useAndroidGateway();

  useEffect(() => {
    if (!gatewayUrl || isOff()) return;
    requestToken()
      .then(({ token }) => {
        if (shouldRegister({ off: isOff(), token }) && token) {
          return register(mx, token, gatewayUrl);
        }
        return undefined;
      })
      .catch((e: unknown) => {
        // eslint-disable-next-line no-console
        console.warn("Couldn't register for notifications", e);
      });
  }, [mx, gatewayUrl]);

  return null;
}

type TileState = 'loading' | 'on' | 'off' | 'denied' | 'failed';

// In Settings > Notifications, in place of the browser's switch.
export function AndroidPushTile() {
  const mx = useMatrixClient();
  const gatewayUrl = useAndroidGateway();
  const [state, setState] = useState<TileState>('loading');

  const turnOn = useCallback(async () => {
    if (!gatewayUrl) return;
    setState('loading');
    const { token, problem } = await requestToken();
    if (!token) {
      setState(problem ?? 'failed');
      return;
    }
    try {
      await register(mx, token, gatewayUrl);
      setOff(false);
      setState('on');
    } catch {
      setState('failed');
    }
  }, [mx, gatewayUrl]);

  const turnOff = useCallback(async () => {
    setState('loading');
    setOff(true);
    const { token } = await requestToken();
    try {
      if (token) {
        await mx.setPusher({
          pushkey: token,
          app_id: ANDROID_PUSH_APP_ID,
          kind: null,
        } as unknown as IPusherRequest);
      }
      setState('off');
    } catch {
      setOff(false);
      setState('failed');
    }
  }, [mx]);

  useEffect(() => {
    if (!gatewayUrl) return;
    if (isOff()) setState('off');
    else turnOn();
  }, [gatewayUrl, turnOn]);

  if (!gatewayUrl) return null;

  return (
    <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
      <SettingTile
        title={tr('push.title', 'Notifications with the app closed')}
        description={tr(
          'android_app.push_body',
          'Get notified on this phone even when the app is closed. Encrypted messages show who wrote, not the text.'
        )}
        after={
          <Box direction="Column" gap="100" alignItems="End">
            {state === 'loading' ? (
              <Spinner size="200" variant="Secondary" />
            ) : (
              <Switch
                value={state === 'on'}
                onChange={(value) => (value ? turnOn() : turnOff()).catch(() => undefined)}
              />
            )}
            {state === 'denied' && (
              <Text size="T200" style={{ color: color.Critical.Main }}>
                <b>
                  {tr(
                    'android_app.push_denied',
                    "Notifications are blocked. Turn them on in Android's settings for Blazeroom."
                  )}
                </b>
              </Text>
            )}
            {state === 'failed' && (
              <Text size="T200" style={{ color: color.Critical.Main }}>
                <b>{tr('push.failed', "Couldn't change this. Try again.")}</b>
              </Text>
            )}
          </Box>
        }
      />
      <SettingTile
        title={tr('android_app.calls_title', 'Calls on the locked phone')}
        description={tr(
          'android_app.calls_body',
          "For a call to light up the screen, Android needs a setting turned on for Blazeroom. On Xiaomi phones there's a second one: Show on Lock screen."
        )}
        after={
          <Button
            size="300"
            variant="Secondary"
            fill="Soft"
            radii="300"
            onClick={() => androidBridge.send({ type: 'openCallSettings' })}
          >
            <Text size="B300">{tr('android_app.calls_open', 'Open')}</Text>
          </Button>
        }
      />
    </SequenceCard>
  );
}
