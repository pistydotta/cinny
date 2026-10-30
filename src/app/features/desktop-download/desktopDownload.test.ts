import { describe, expect, it } from 'vitest';
import { isDesktopApp } from './desktopDownload';

const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const DESKTOP_APP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Blazeroom/0.1.0 Chrome/140.0.0.0 Electron/45.1.0 Safari/537.36';

describe('isDesktopApp', () => {
  it('is true only inside the Windows app', () => {
    expect(isDesktopApp(DESKTOP_APP)).toBe(true);
    expect(isDesktopApp(CHROME_WINDOWS)).toBe(false);
  });
});
