import { describe, expect, it } from 'vitest';
import { availableApps } from './availableApps';

const statusOf = (userAgent: string) =>
  Object.fromEntries(availableApps(userAgent).map((app) => [app.id, app.status]));

describe('availableApps', () => {
  it('lists Windows, Android and Apple in that order', () => {
    expect(availableApps('Mozilla/5.0').map((app) => app.id)).toEqual([
      'windows',
      'android',
      'apple',
    ]);
  });

  it('offers the Windows download in any browser', () => {
    expect(statusOf('Mozilla/5.0 (Windows NT 10.0) Chrome/120').windows).toBe('download');
    expect(statusOf('Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari/605').windows).toBe('download');
  });

  it('says so inside the Windows app instead of offering the download', () => {
    expect(statusOf('Mozilla/5.0 (Windows NT 10.0) blazeroom Electron/30.0').windows).toBe(
      'current'
    );
  });

  it('offers the Android download, or says you are using it', () => {
    expect(statusOf('Chrome/130').android).toBe('download');
    expect(statusOf('x BlazeroomAndroid/1').android).toBe('current');
  });

  it('still offers the Windows download inside the Android app', () => {
    expect(statusOf('x BlazeroomAndroid/1').windows).toBe('download');
  });

  it('marks Apple as still in development', () => {
    expect(statusOf('Mozilla/5.0').apple).toBe('soon');
  });
});
