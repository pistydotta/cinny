import { isAndroidApp } from '../android-app/androidApp';
import { isDesktopApp } from '../desktop-download/desktopDownload';

export type AppId = 'windows' | 'android' | 'apple';
export type AppStatus = 'download' | 'current' | 'soon';

// The downloads show in any browser, so someone on another device can see what exists and grab it
// from there.
export const availableApps = (userAgent: string): { id: AppId; status: AppStatus }[] => [
  { id: 'windows', status: isDesktopApp(userAgent) ? 'current' : 'download' },
  { id: 'android', status: isAndroidApp(userAgent) ? 'current' : 'download' },
  { id: 'apple', status: 'soon' },
];
