import { isDesktopApp } from '../desktop-download/desktopDownload';

export type AppId = 'windows' | 'android' | 'apple';
export type AppStatus = 'download' | 'current' | 'soon';

// The Windows download shows in any browser, so someone on another computer can see what exists
// and grab it from there.
export const availableApps = (userAgent: string): { id: AppId; status: AppStatus }[] => [
  { id: 'windows', status: isDesktopApp(userAgent) ? 'current' : 'download' },
  { id: 'android', status: 'soon' },
  { id: 'apple', status: 'soon' },
];
