import { describe, expect, it } from 'vitest';
import { hasUnseen, WHATS_NEW, WhatsNewEntry } from './entries';

const entry = (id: string): WhatsNewEntry => ({ id, items: () => [] });

describe('hasUnseen', () => {
  const entries = [entry('c'), entry('b'), entry('a')];

  it('is true for someone who never saw any', () => {
    expect(hasUnseen(entries, null)).toBe(true);
  });

  it('is true when only an older entry was seen', () => {
    expect(hasUnseen(entries, 'b')).toBe(true);
  });

  it('is false once the newest was seen', () => {
    expect(hasUnseen(entries, 'c')).toBe(false);
  });

  it('is false with no entries', () => {
    expect(hasUnseen([], null)).toBe(false);
  });
});

describe('WHATS_NEW', () => {
  it('has unique ids', () => {
    const ids = WHATS_NEW.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
