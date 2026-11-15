import { describe, expect, it } from 'vitest';
import { layoutFor, LAYOUTS } from '../table/layout';
import type { CoachStats } from '../types';
import { actionText, percent, reasonText, reportRows, sizeText, verdictText } from './coachText';

const chips = (n: number) => `${n}`;

const stats = (patch: Partial<CoachStats> = {}): CoachStats => ({
  vpip: 0,
  pfr: 0,
  bets: 0,
  raises: 0,
  calls: 0,
  folds: 0,
  checks: 0,
  valueBets: 0,
  bluffs: 0,
  showdowns: 0,
  showdownWins: 0,
  good: 0,
  warn: 0,
  bad: 0,
  evLoss: 0,
  ...patch,
});

describe('coach text', () => {
  it('names actions with their amounts', () => {
    expect(actionText({ action: 'fold' }, chips)).toBe('Fold');
    expect(actionText({ action: 'call', amount: 120 }, chips)).toBe('Call 120');
    expect(actionText({ action: 'call', amount: 0 }, chips)).toBe('Call');
    expect(actionText({ action: 'bet', amount: 300 }, chips)).toBe('Bet 300');
    expect(actionText({ action: 'raise', amount: 450 }, chips)).toBe('Raise to 450');
    expect(actionText({ action: 'shove', amount: 5000 }, chips)).toBe('All-in');
  });

  it('labels a size by its share of the pot after the flop and by its amount before', () => {
    const size = { purpose: 'value', amount: 150, recommended: true };
    expect(sizeText({ ...size, key: 'third' }, '150')).toBe('⅓ · 150');
    expect(sizeText({ ...size, key: 'open' }, '2.5 BB')).toBe('2.5 BB');
    expect(sizeText({ ...size, key: 'allin' }, '5000')).toBe('All-in');
  });

  it('shows a key from a newer server as itself', () => {
    expect(reasonText('something_new')).toBe('something_new');
    expect(verdictText('something_new')).toBe('something_new');
    expect(reasonText('value_std')).toBe('Strong hand: bet for value.');
  });

  it('rounds shares to whole percents', () => {
    expect(percent(0.254)).toBe('25%');
    expect(percent(1)).toBe('100%');
  });

  it('builds the report without dividing by zero', () => {
    const empty = reportRows(stats(), 0).map((row) => row.value);
    expect(empty).toEqual(['—', '—', '0', '0 / 0', '0 / 0', '0 / 0 / 0']);

    const played = reportRows(
      stats({ vpip: 5, pfr: 4, bets: 3, raises: 3, calls: 4, valueBets: 4, bluffs: 2 }),
      20
    ).map((row) => row.value);
    expect(played.slice(0, 4)).toEqual(['25%', '20%', '1.5', '4 / 2']);
  });
});

describe('table layout', () => {
  it('gives every seat of a nine-seat table its own spot, bet and dealer button', () => {
    (['landscape', 'portrait'] as const).forEach((layout) => {
      const spec = layoutFor(layout, 9);
      expect(spec.seats).toHaveLength(9);
      expect(spec.bets).toHaveLength(9);
      expect(spec.dealer).toHaveLength(9);
      expect(new Set(spec.seats.map((p) => `${p.x},${p.y}`)).size).toBe(9);
      [...spec.seats, ...spec.bets, ...spec.dealer].forEach((p) => {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(100);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(100);
      });
    });
  });

  it('keeps the six-seat table as it was', () => {
    expect(layoutFor('landscape', 6)).toBe(LAYOUTS.landscape);
  });
});
