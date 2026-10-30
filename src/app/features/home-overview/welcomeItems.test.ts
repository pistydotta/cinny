import { describe, expect, it } from 'vitest';
import { welcomeItems } from './welcomeItems';

describe('welcomeItems', () => {
  it('asks a new account to protect its messages first', () => {
    expect(welcomeItems({ encryptionStep: 'create', canDownloadDesktop: true })).toEqual([
      'protect',
      'windows',
      'language',
    ]);
  });

  it('asks to verify a new device of an account that has a key', () => {
    expect(welcomeItems({ encryptionStep: 'unlock', canDownloadDesktop: false })).toEqual([
      'verify',
      'language',
    ]);
  });

  it('drops the encryption line when done or still loading', () => {
    expect(welcomeItems({ encryptionStep: 'done', canDownloadDesktop: false })).toEqual([
      'language',
    ]);
    expect(welcomeItems({ encryptionStep: 'loading', canDownloadDesktop: false })).toEqual([
      'language',
    ]);
  });

  it('offers the Windows app only when it can be downloaded', () => {
    expect(welcomeItems({ encryptionStep: 'done', canDownloadDesktop: true })).toEqual([
      'windows',
      'language',
    ]);
  });
});
