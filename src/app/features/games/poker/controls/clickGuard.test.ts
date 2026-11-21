import { describe, expect, it } from 'vitest';
import type { ViewLegal } from '../types';
import { ARMING_MS, armingLeft, isArmed, queueKey, rearm, turnKeys } from './clickGuard';

const legal = (overrides: Partial<ViewLegal> = {}): ViewLegal => ({
  toCall: 20,
  canCheck: false,
  canCall: true,
  callAmount: 20,
  canRaise: true,
  isBet: false,
  minRaiseTo: 40,
  maxRaiseTo: 2000,
  hand: 3,
  seq: 7,
  ...overrides,
});

describe('click guard', () => {
  it('ignores clicks until the control has kept its meaning for ARMING_MS', () => {
    const arming = rearm(undefined, 'fold:3:7', 1000);
    expect(isArmed(arming, 1000)).toBe(false);
    expect(isArmed(arming, 1000 + ARMING_MS - 1)).toBe(false);
    expect(armingLeft(arming, 1100)).toBe(ARMING_MS - 100);
    expect(isArmed(arming, 1000 + ARMING_MS)).toBe(true);
  });

  it('keeps the start time for the same key and restarts it for a new one', () => {
    const first = rearm(undefined, 'a', 1000);
    expect(rearm(first, 'a', 5000)).toBe(first);
    const next = rearm(first, 'b', 5000);
    expect(next).toEqual({ key: 'b', since: 5000 });
    expect(isArmed(next, 5000 + ARMING_MS - 1)).toBe(false);
  });

  it('re-arms every live button on a new turn', () => {
    const before = turnKeys(null);
    const turn = turnKeys(legal());
    expect(turn.fold).not.toBe(before.fold);
    expect(turn.checkCall).not.toBe(before.checkCall);
    expect(turn.raise).not.toBe(before.raise);
    const nextTurn = turnKeys(legal({ seq: 9 }));
    expect(nextTurn.fold).not.toBe(turn.fold);
  });

  it('re-arms check/call when it turns into another action or price, not otherwise', () => {
    const turn = turnKeys(legal());
    expect(turnKeys(legal({ canCheck: true, canCall: false, callAmount: 0 })).checkCall).not.toBe(
      turn.checkCall
    );
    expect(turnKeys(legal({ callAmount: 60 })).checkCall).not.toBe(turn.checkCall);
    // The player's own sizing doesn't change what the buttons do.
    expect(turnKeys(legal({ minRaiseTo: 80 }))).toEqual(turn);
  });

  it('re-arms the queued actions when they appear and when the price changes', () => {
    const view = { id: 't', handNumber: 3, street: 'flop' as const };
    expect(queueKey(view, false, 20)).toBe('off');
    const shown = queueKey(view, true, 20);
    expect(shown).not.toBe('off');
    expect(queueKey(view, true, 20)).toBe(shown);
    expect(queueKey(view, true, 60)).not.toBe(shown);
    expect(queueKey({ ...view, street: 'turn' }, true, 20)).not.toBe(shown);
  });
});
