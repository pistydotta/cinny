import type { TableView, ViewLegal } from '../types';

/*
 * A control that just appeared, or just changed what it does, ignores clicks for a moment.
 * When the turn arrives the action buttons replace the queued-action toggles, and a click
 * aimed at the old control would otherwise land on the new one.
 */

/** Long enough to cover a click already on its way, short enough not to slow a real one. */
export const ARMING_MS = 400;

/** When the control last took on its current meaning, named by `key`. */
export type Arming = { key: string; since: number };

/** Keeps the start time while the key is the same; a new key starts it again. */
export const rearm = (last: Arming | undefined, key: string, now: number): Arming =>
  last?.key === key ? last : { key, since: now };

export const armingLeft = (arming: Arming, now: number, ms = ARMING_MS): number =>
  Math.max(0, arming.since + ms - now);

export const isArmed = (arming: Arming, now: number, ms = ARMING_MS): boolean =>
  armingLeft(arming, now, ms) === 0;

/**
 * What each live button does on this turn. A new turn re-arms all three; check turning into
 * call, or a new price, re-arms that button. The raise amount is the player's own choice and
 * stays out of the key.
 */
export const turnKeys = (legal: ViewLegal | null) => {
  const turn = legal ? `${legal.hand}:${legal.seq}` : 'none';
  return {
    fold: `fold:${turn}`,
    checkCall: `check-call:${turn}:${legal?.canCheck}:${legal?.callAmount}`,
    raise: `raise:${turn}:${legal?.canRaise}`,
  };
};

/**
 * The queued-action toggles and Fold now re-arm when they appear (right after the player
 * acts, where the action buttons were) and when the price they show changes.
 */
export const queueKey = (
  view: Pick<TableView, 'id' | 'handNumber' | 'street'>,
  shown: boolean,
  callCost: number
): string => (shown ? `queue:${view.id}:${view.handNumber}:${view.street}:${callCost}` : 'off');
