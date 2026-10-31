import { describe, expect, it } from 'vitest';
import { countsOnlyCalls } from './callUnread';

describe('countsOnlyCalls', () => {
  it('clears a count with nothing to read behind it', () => {
    expect(countsOnlyCalls({ total: 3, highlight: 0, hasUnread: false })).toBe(true);
  });

  it('leaves a count with messages behind it', () => {
    expect(countsOnlyCalls({ total: 3, highlight: 0, hasUnread: true })).toBe(false);
  });

  it('leaves a mention alone', () => {
    expect(countsOnlyCalls({ total: 3, highlight: 1, hasUnread: false })).toBe(false);
  });

  it('does nothing with no count', () => {
    expect(countsOnlyCalls({ total: 0, highlight: 0, hasUnread: false })).toBe(false);
  });
});
