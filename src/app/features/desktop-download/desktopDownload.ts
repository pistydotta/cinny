// Served by the server's Caddy, uploaded by its deploy (blazeroom repo, desktop/).
export const DESKTOP_DOWNLOAD_URL = '/download/Blazeroom-Setup.exe';

// Offered only on Windows, and not inside the Windows app itself (Electron adds itself to the
// user agent).
export const showDesktopDownload = (userAgent: string): boolean =>
  userAgent.includes('Windows') && !userAgent.includes('Electron/');
