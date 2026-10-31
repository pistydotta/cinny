import { describe, expect, it } from 'vitest';
import { errorText } from './errorText';

describe('errorText', () => {
  it('says something specific for the codes a table can answer', () => {
    ['seat_taken', 'already_seated', 'not_enough_credits', 'stale_action', 'network'].forEach(
      (code) => {
        expect(errorText(code)).not.toBe(errorText('unheard_of'));
      }
    );
  });

  it('gives distinct texts to different codes', () => {
    expect(errorText('seat_taken')).not.toBe(errorText('invalid_seat'));
  });

  it('falls back to a generic message for an unknown code', () => {
    expect(errorText('unheard_of')).toBeTruthy();
    expect(errorText('unheard_of')).not.toContain('unheard_of');
  });
});
