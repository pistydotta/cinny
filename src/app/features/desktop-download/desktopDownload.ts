// Served by the server's Caddy, uploaded by its deploy (blazeroom repo, desktop/).
export const DESKTOP_DOWNLOAD_URL = '/download/Blazeroom-Setup.exe';

// The Windows app is Electron, which adds itself to the user agent.
export const isDesktopApp = (userAgent: string): boolean => userAgent.includes('Electron/');
