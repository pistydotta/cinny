import { describe, expect, it } from 'vitest';
import { getEncryptionStep, isPromptPostponed, postponePrompt } from './encryptionStep';

const base = {
  hasCrypto: true,
  crossSigningActive: true,
  deviceVerified: false,
  hasSecretStorageKey: true,
};

describe('getEncryptionStep', () => {
  it('asks to create a key when the account has none', () => {
    expect(getEncryptionStep({ ...base, crossSigningActive: false })).toBe('create');
  });

  it('asks to unlock an unverified device', () => {
    expect(getEncryptionStep(base)).toBe('unlock');
  });

  it('is done for a verified device', () => {
    expect(getEncryptionStep({ ...base, deviceVerified: true })).toBe('done');
  });

  it('waits while the device status or key description is unknown', () => {
    expect(getEncryptionStep({ ...base, deviceVerified: undefined })).toBe('loading');
    expect(getEncryptionStep({ ...base, hasSecretStorageKey: false })).toBe('loading');
  });

  it('stays quiet without crypto or when verification is unsupported', () => {
    expect(getEncryptionStep({ ...base, hasCrypto: false })).toBe('done');
    expect(getEncryptionStep({ ...base, deviceVerified: null })).toBe('done');
  });
});

describe('prompt postponing', () => {
  it('remembers "later" per user and device', () => {
    const raw = postponePrompt(null, '@a:x', 'DEV1');
    expect(isPromptPostponed(raw, '@a:x', 'DEV1')).toBe(true);
    expect(isPromptPostponed(raw, '@a:x', 'DEV2')).toBe(false);
    expect(isPromptPostponed(raw, '@b:x', 'DEV1')).toBe(false);
    expect(isPromptPostponed(null, '@a:x', 'DEV1')).toBe(false);
  });

  it('does not add the same device twice', () => {
    const once = postponePrompt(null, '@a:x', 'DEV1');
    expect(postponePrompt(once, '@a:x', 'DEV1')).toBe(once);
    expect(postponePrompt(once, '@a:x', 'DEV2').split('\n')).toHaveLength(2);
  });
});
