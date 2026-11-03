import { describe, expect, it } from 'vitest';
import { hasUnseen, shownItems, WHATS_NEW, WhatsNewEntry } from './entries';

const entry = (id: string, hideInDesktopApp = false): WhatsNewEntry => ({
  id,
  items: () => [{ title: id, body: '', hideInDesktopApp }],
});

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

  it('ignores news hidden in the Windows app when inside it', () => {
    const withApp = [entry('app', true), entry('b')];
    expect(hasUnseen(withApp, 'b', true)).toBe(false);
    expect(hasUnseen(withApp, 'b', false)).toBe(true);
  });
});

describe('shownItems', () => {
  it('drops news hidden in the Windows app only inside it', () => {
    const withApp = [entry('app', true), entry('b')];
    expect(shownItems(withApp, true).map((i) => i.title)).toEqual(['b']);
    expect(shownItems(withApp, false).map((i) => i.title)).toEqual(['app', 'b']);
  });

  it('shows at most 5 items, newest first', () => {
    const many = (id: string): WhatsNewEntry => ({
      id,
      items: () => [1, 2, 3].map((n) => ({ title: `${id}${n}`, body: '' })),
    });
    expect(shownItems([many('c'), many('b'), many('a')], false).map((i) => i.title)).toEqual([
      'c1',
      'c2',
      'c3',
      'b1',
      'b2',
    ]);
  });

  it("hidden items don't take a place", () => {
    const list = [entry('app', true), ...'abcdef'.split('').map((id) => entry(id))];
    expect(shownItems(list, true).map((i) => i.title)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

describe('WHATS_NEW', () => {
  it('has unique ids', () => {
    const ids = WHATS_NEW.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
