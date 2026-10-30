import { describe, expect, it } from 'vitest';
import { welcomeItems } from './welcomeItems';

describe('welcomeItems', () => {
  it('asks a new account to protect its messages first', () => {
    expect(welcomeItems({ encryptionStep: 'create' })).toEqual(['protect', 'language']);
  });

  it('asks to verify a new device of an account that has a key', () => {
    expect(welcomeItems({ encryptionStep: 'unlock' })).toEqual(['verify', 'language']);
  });

  it('drops the encryption line when done or still loading', () => {
    expect(welcomeItems({ encryptionStep: 'done' })).toEqual(['language']);
    expect(welcomeItems({ encryptionStep: 'loading' })).toEqual(['language']);
  });
});
