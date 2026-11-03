import { describe, expect, it } from 'vitest';
import { readableShareLabel } from './shareLabel';

describe('readableShareLabel', () => {
  it('keeps a window title', () => {
    expect(readableShareLabel('  Notes - Editor ')).toBe('Notes - Editor');
  });

  it('drops internal IDs', () => {
    expect(readableShareLabel('screen:-3:0')).toBeUndefined();
    expect(readableShareLabel('window:123:0')).toBeUndefined();
    expect(readableShareLabel('web-contents-media-stream://0:1')).toBeUndefined();
  });

  it('drops an empty label', () => {
    expect(readableShareLabel('')).toBeUndefined();
    expect(readableShareLabel('   ')).toBeUndefined();
  });
});
