import { describe, expect, it } from 'vitest';
import {
  QUIET_ENCRYPTION_MS,
  isCommunityOfferPending,
  isEncryptionBannerQuiet,
  parseFirstLogin,
} from './firstLogin';

describe('parseFirstLogin', () => {
  it('reads a saved state', () => {
    expect(parseFirstLogin('{"registeredAt":5,"communityOffered":true}')).toEqual({
      registeredAt: 5,
      communityOffered: true,
    });
  });

  it('treats missing or broken data as an old account', () => {
    expect(parseFirstLogin(null)).toBeUndefined();
    expect(parseFirstLogin('not json')).toBeUndefined();
    expect(parseFirstLogin('null')).toBeUndefined();
    expect(parseFirstLogin('{"registeredAt":"5","communityOffered":true}')).toBeUndefined();
  });
});

describe('isEncryptionBannerQuiet', () => {
  const state = { registeredAt: 1000, communityOffered: false };

  it('stays quiet for the first day only', () => {
    expect(isEncryptionBannerQuiet(state, 1000)).toBe(true);
    expect(isEncryptionBannerQuiet(state, 1000 + QUIET_ENCRYPTION_MS - 1)).toBe(true);
    expect(isEncryptionBannerQuiet(state, 1000 + QUIET_ENCRYPTION_MS)).toBe(false);
  });

  it('never hides the banner from an old account', () => {
    expect(isEncryptionBannerQuiet(undefined, 1000)).toBe(false);
  });
});

describe('isCommunityOfferPending', () => {
  it('offers once, and only to a new account', () => {
    expect(isCommunityOfferPending({ registeredAt: 1, communityOffered: false })).toBe(true);
    expect(isCommunityOfferPending({ registeredAt: 1, communityOffered: true })).toBe(false);
    expect(isCommunityOfferPending(undefined)).toBe(false);
  });
});
