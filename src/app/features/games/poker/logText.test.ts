import { describe, expect, it } from 'vitest';
import { handText, logText } from './logText';
import type { LogEntry } from './types';

const entry = (key: string, params: LogEntry['params'] = {}): LogEntry => ({
  id: 1,
  hand: 1,
  key,
  params,
});

describe('logText', () => {
  it('renders log keys with formatted chips', () => {
    const text = logText(entry('sat', { name: 'A', chips: 2000 }));
    expect(text).toContain('A');
    expect(text).toContain('2.000');
  });

  it('renders the hand separator', () => {
    expect(logText(entry('hand', { n: 3 }))).toContain('3');
  });

  it('renders a shown hand through its name', () => {
    const text = logText(
      entry('shows', { name: 'A', hand: { key: 'pair', params: { ranks: 14 } } })
    );
    expect(text).toBe('A shows Pair of Aces');
  });

  it('returns the key for a key it does not know', () => {
    expect(logText(entry('from_the_future', { name: 'A' }))).toBe('from_the_future');
  });
});

describe('handText', () => {
  it('renders hand names from ranks', () => {
    expect(handText({ key: 'pair', params: { ranks: 14 } })).toBe('Pair of Aces');
    expect(handText({ key: 'two_pair', params: { ranks: 13, ranks2: 2 } })).toBe(
      'Two Pair, Kings and Twos'
    );
    expect(handText({ key: 'full_house', params: { ranks: 10, ranks2: 4 } })).toBe(
      'Full House, Tens over Fours'
    );
    expect(handText({ key: 'straight', params: { rank: 14 } })).toBe('Straight, Ace high');
    expect(handText({ key: 'flush', params: { suit: 'h' } })).toBe('Flush, Hearts');
    expect(handText({ key: 'high_card', params: { rank: 12 } })).toBe('High Card, Queen');
    expect(handText({ key: 'royal_flush', params: {} })).toBe('Royal Flush');
  });
});
