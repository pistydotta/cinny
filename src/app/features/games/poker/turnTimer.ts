import type { TableView } from './types';

/** How long a player has to act; the server's `TURN_MS`. */
export const TURN_MS = 40_000;

export type TurnTimer = {
  seat: number;
  ms: number;
  /** Time already used, when the turn started before this render. */
  elapsedMs: number;
  key: string;
};

export const turnTimerFor = (view: TableView, now: number): TurnTimer | undefined => {
  if (view.phase !== 'betting' || view.actingSeat === null || view.turnDeadline === null)
    return undefined;
  return {
    seat: view.actingSeat,
    ms: TURN_MS,
    elapsedMs: Math.max(0, Math.min(TURN_MS, TURN_MS - (view.turnDeadline - now))),
    key: `${view.handNumber}-${view.actingSeat}-${view.turnDeadline}`,
  };
};
