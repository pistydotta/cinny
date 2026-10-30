import { isAndroidApp } from '../android-app/androidApp';
import { isDesktopApp } from '../desktop-download/desktopDownload';

// Matches `apps:` in templates/sygnal.yaml (blazeroom repo).
export const PUSH_APP_ID = 'br.com.blazeroom.web';

export type PushConfig = { gatewayUrl: string; vapidKey: string };

export const vapidKeyBytes = (key: string): Uint8Array => {
  const base64 = key.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (char) =>
    char.charCodeAt(0)
  );
};

type SubscriptionJson = {
  endpoint?: string;
  keys?: Record<string, string>;
};

// What Synapse needs to reach this browser through Sygnal. `events_only` leaves out the pushes
// that only update unread counts, and `default_payload` comes back in every push, which is how
// the service worker learns the language.
export const webPusher = (subscription: SubscriptionJson, config: PushConfig, lang: string) => {
  const { endpoint, keys } = subscription;
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error('incomplete push subscription');
  return {
    kind: 'http' as const,
    app_id: PUSH_APP_ID,
    pushkey: keys.p256dh,
    app_display_name: 'blazeroom',
    device_display_name: 'blazeroom web',
    lang,
    data: {
      url: config.gatewayUrl,
      endpoint,
      auth: keys.auth,
      events_only: true,
      default_payload: { lang },
    },
  };
};

export type PushSupport = 'available' | 'install_first' | 'unavailable';

// iPhones only have push once the site is installed to the home screen.
export const pushSupport = ({
  serviceWorker,
  pushManager,
  notification,
  standalone,
  userAgent,
  configured,
}: {
  serviceWorker: boolean;
  pushManager: boolean;
  notification: boolean;
  standalone: boolean;
  userAgent: string;
  configured: boolean;
}): PushSupport => {
  // The Android app has its own switch: a WebView has no Web Push.
  if (!configured || !serviceWorker || isDesktopApp(userAgent) || isAndroidApp(userAgent)) {
    return 'unavailable';
  }
  if (pushManager && notification) return 'available';
  return /iPhone|iPad/.test(userAgent) && !standalone ? 'install_first' : 'unavailable';
};
