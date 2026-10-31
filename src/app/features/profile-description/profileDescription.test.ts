import { describe, expect, it } from 'vitest';
import { MAX_DESCRIPTION_LENGTH, cleanDescription } from './profileDescription';

describe('cleanDescription', () => {
  it('trims the text', () => {
    expect(cleanDescription('  hello  ')).toBe('hello');
  });

  it('ignores anything that is not text', () => {
    expect(cleanDescription(undefined)).toBe('');
    expect(cleanDescription(42)).toBe('');
    expect(cleanDescription({ text: 'hello' })).toBe('');
  });

  it('cuts text past the limit', () => {
    expect(cleanDescription('a'.repeat(MAX_DESCRIPTION_LENGTH + 5))).toHaveLength(
      MAX_DESCRIPTION_LENGTH
    );
  });

  it('does not cut an emoji in half', () => {
    const text = `${'a'.repeat(MAX_DESCRIPTION_LENGTH - 1)}😀b`;
    expect(cleanDescription(text)).toBe(`${'a'.repeat(MAX_DESCRIPTION_LENGTH - 1)}😀`);
  });
});
