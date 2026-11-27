import { describe, expect, it } from 'vitest';
import { activityText, agoText, liveStatus } from './liveText';

const now = Date.UTC(2026, 10, 26, 12);
const min = 60_000;

describe('agoText', () => {
  it('counts minutes, then hours, then days', () => {
    expect(agoText(now - 20_000, now)).toBe('just now');
    expect(agoText(now - 10 * min, now)).toBe('10 min ago');
    expect(agoText(now - 150 * min, now)).toBe('2 h ago');
    expect(agoText(now - 50 * 60 * min, now)).toBe('2 d ago');
    // A clock a little ahead of ours still reads as now.
    expect(agoText(now + min, now)).toBe('just now');
  });
});

describe('activityText', () => {
  it('names what the time measures', () => {
    expect(activityText('hand', now - 10 * min, now)).toBe('Last hand 10 min ago');
    expect(activityText('move', now - 3 * min, now)).toBe('Last move 3 min ago');
    expect(activityText('created', now - 5 * min, now)).toBe('Opened 5 min ago');
  });

  it('says a poker table has not dealt yet, and nothing for the rest', () => {
    expect(activityText('hand', undefined, now)).toBe('No hand dealt yet');
    expect(activityText('move', undefined, now)).toBeUndefined();
  });
});

describe('liveStatus', () => {
  it('gives a running match its score and minute', () => {
    expect(liveStatus({ activity: 'created', activeAt: now, score: [2, 1], minute: 34 }, now)).toBe(
      "2–1 · 34'"
    );
  });

  it('says who is still awaited, and since when for a match', () => {
    expect(liveStatus({ activity: 'created', activeAt: now - 4 * min }, now)).toBe(
      'Waiting for players · Opened 4 min ago'
    );
    expect(liveStatus({ activity: 'move', phase: 'waiting', activeAt: now }, now)).toBe(
      'Waiting for players'
    );
  });

  it('otherwise says when the last hand or move was', () => {
    expect(liveStatus({ activity: 'hand', activeAt: now - 10 * min }, now)).toBe(
      'Last hand 10 min ago'
    );
  });
});
