import { describe, expect, it } from 'vitest';
import { showDesktopDownload } from './desktopDownload';

const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const DESKTOP_APP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Blazeroom/0.1.0 Chrome/140.0.0.0 Electron/45.1.0 Safari/537.36';
const CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';

describe('showDesktopDownload', () => {
  it('shows in a Windows browser', () => {
    expect(showDesktopDownload(CHROME_WINDOWS)).toBe(true);
  });

  it('hides inside the Windows app', () => {
    expect(showDesktopDownload(DESKTOP_APP)).toBe(false);
  });

  it('hides on other systems', () => {
    expect(showDesktopDownload(CHROME_MAC)).toBe(false);
    expect(showDesktopDownload(ANDROID)).toBe(false);
  });
});
