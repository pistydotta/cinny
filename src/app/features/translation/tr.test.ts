import { describe, expect, it } from 'vitest';
import { fillValues, tr } from './tr';
import pt from './pt.json';

describe('fillValues', () => {
  it('fills the named values and leaves unknown ones', () => {
    expect(fillValues('{{a}} and {{b}}, not {{c}}', { a: 'one', b: 2 })).toBe(
      'one and 2, not {{c}}'
    );
  });

  it('returns the text as is without values', () => {
    expect(fillValues('No {{x}} here')).toBe('No {{x}} here');
  });
});

describe('tr', () => {
  it('falls back to the English text when i18n is not started', () => {
    expect(tr('friends.request_sent_to', 'Request sent to {{userId}}', { userId: '@a:b' })).toBe(
      'Request sent to @a:b'
    );
  });
});

// Every Portuguese text keeps the {{values}} its English text gets.
const leaves = (obj: object, prefix = ''): [string, string][] =>
  Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'string' ? [[prefix + key, value]] : leaves(value, `${prefix + key}.`)
  );

describe('pt.json', () => {
  it('only uses simple {{name}} placeholders', () => {
    leaves(pt).forEach(([key, text]) => {
      expect(text.replace(/\{\{\w+\}\}/g, ''), key).not.toMatch(/[{}]/);
    });
  });
});
