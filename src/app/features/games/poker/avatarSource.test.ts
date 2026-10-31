import { describe, expect, it } from 'vitest';
import { avatarSource } from './avatarSource';

describe('avatarSource', () => {
  const fromMxc = (mxc: string) => `https://hs/${mxc.slice(6)}`;

  it('resolves Matrix media', () => {
    expect(avatarSource('mxc://hs/abc', fromMxc)).toBe('https://hs/hs/abc');
  });

  it('refuses any other URL', () => {
    expect(avatarSource('https://evil.example/pixel.png', fromMxc)).toBeUndefined();
    expect(avatarSource('//evil.example/pixel.png', fromMxc)).toBeUndefined();
    expect(avatarSource('data:image/png;base64,AAAA', fromMxc)).toBeUndefined();
  });
});
