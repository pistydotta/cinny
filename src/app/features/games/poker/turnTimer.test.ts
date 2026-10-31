import { describe, expect, it } from 'vitest';
import { TURN_MS, turnTimerFor } from './turnTimer';
import type { TableView } from './types';

const view = (patch: Partial<TableView>) =>
  ({
    phase: 'betting',
    actingSeat: 2,
    turnDeadline: 100_000,
    handNumber: 4,
    ...patch,
  } as TableView);

describe('turnTimerFor', () => {
  it('counts the time already used from the deadline', () => {
    const timer = turnTimerFor(view({}), 100_000 - TURN_MS + 5_000);
    expect(timer).toMatchObject({ seat: 2, ms: TURN_MS, elapsedMs: 5_000 });
  });

  it('stays within the turn when the clocks disagree', () => {
    expect(turnTimerFor(view({}), 0)?.elapsedMs).toBe(0);
    expect(turnTimerFor(view({}), 500_000)?.elapsedMs).toBe(TURN_MS);
  });

  it('is absent when nobody is on the clock', () => {
    expect(turnTimerFor(view({ turnDeadline: null }), 0)).toBeUndefined();
    expect(turnTimerFor(view({ actingSeat: null }), 0)).toBeUndefined();
    expect(turnTimerFor(view({ phase: 'complete' }), 0)).toBeUndefined();
  });

  it('changes key with a new turn so the ring restarts', () => {
    expect(turnTimerFor(view({}), 0)?.key).not.toBe(
      turnTimerFor(view({ turnDeadline: 140_000 }), 0)?.key
    );
  });
});
