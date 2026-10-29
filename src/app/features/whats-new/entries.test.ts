import { describe, expect, it } from 'vitest';
import { MAX_SHOWN, unseenEntries, WHATS_NEW, WhatsNewEntry } from './entries';

const entry = (id: string): WhatsNewEntry => ({ id, items: () => [] });
const ids = (entries: WhatsNewEntry[]) => entries.map((e) => e.id);

describe('unseenEntries', () => {
  const entries = [entry('c'), entry('b'), entry('a')];

  it('shows everything to someone who never saw any', () => {
    expect(ids(unseenEntries(entries, null))).toEqual(['c', 'b', 'a']);
  });

  it('shows only the entries newer than the last seen one', () => {
    expect(ids(unseenEntries(entries, 'b'))).toEqual(['c']);
  });

  it('shows nothing when the newest was seen', () => {
    expect(unseenEntries(entries, 'c')).toEqual([]);
  });

  it('treats an unknown id as never seen', () => {
    expect(ids(unseenEntries(entries, 'gone'))).toEqual(['c', 'b', 'a']);
  });

  it(`shows at most ${MAX_SHOWN} entries`, () => {
    const many = ['e', 'd', 'c', 'b', 'a'].map(entry);
    expect(ids(unseenEntries(many, null))).toEqual(['e', 'd', 'c'].slice(0, MAX_SHOWN));
  });
});

describe('WHATS_NEW', () => {
  it('has unique ids', () => {
    const all = ids(WHATS_NEW);
    expect(new Set(all).size).toBe(all.length);
  });
});
