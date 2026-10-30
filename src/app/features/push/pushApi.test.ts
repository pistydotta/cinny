import { describe, expect, it } from 'vitest';
import { PUSH_APP_ID, pushSupport, vapidKeyBytes, webPusher } from './pushApi';

const config = { gatewayUrl: 'https://matrix.x/_matrix/push/v1/notify', vapidKey: 'AQAB-_' };
const CHROME = 'Mozilla/5.0 (Windows NT 10.0) Chrome/141.0';
const DESKTOP_APP = 'Mozilla/5.0 (Windows NT 10.0) Blazeroom/0.1 Chrome/140 Electron/45.1.0';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1';

describe('vapidKeyBytes', () => {
  it('decodes URL-safe base64 without padding', () => {
    expect(Array.from(vapidKeyBytes('AQAB-_'))).toEqual([1, 0, 1, 251]);
  });
});

describe('webPusher', () => {
  it('registers this browser with the gateway', () => {
    const pusher = webPusher(
      { endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'pub', auth: 'sec' } },
      config,
      'pt'
    );
    expect(pusher).toMatchObject({
      kind: 'http',
      app_id: PUSH_APP_ID,
      pushkey: 'pub',
      lang: 'pt',
      data: {
        url: config.gatewayUrl,
        endpoint: 'https://fcm.googleapis.com/x',
        auth: 'sec',
        events_only: true,
        default_payload: { lang: 'pt' },
      },
    });
  });

  it('refuses a subscription with no keys', () => {
    expect(() => webPusher({ endpoint: 'https://x', keys: {} }, config, 'pt')).toThrow();
  });
});

describe('pushSupport', () => {
  const browser = { serviceWorker: true, pushManager: true, notification: true, standalone: false };

  it('is available in a browser with push', () => {
    expect(pushSupport({ ...browser, userAgent: CHROME, configured: true })).toBe('available');
  });

  it('is off when the server has no gateway set up', () => {
    expect(pushSupport({ ...browser, userAgent: CHROME, configured: false })).toBe('unavailable');
  });

  it('is off inside the Windows app, which has no push service', () => {
    expect(pushSupport({ ...browser, userAgent: DESKTOP_APP, configured: true })).toBe(
      'unavailable'
    );
  });

  it('asks an iPhone to install to the home screen first', () => {
    expect(
      pushSupport({ ...browser, pushManager: false, userAgent: IPHONE, configured: true })
    ).toBe('install_first');
  });

  it('is off when the browser has no push', () => {
    expect(
      pushSupport({ ...browser, pushManager: false, userAgent: CHROME, configured: true })
    ).toBe('unavailable');
  });
});
