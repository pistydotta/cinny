import type { PokerAction, TableView, ViewPlayer } from '../types';

export type PreActionKind = 'fold' | 'check-fold' | 'check' | 'call';
export type PreAction = {
  tableId: string;
  hand: number;
  street: TableView['street'];
  kind: PreActionKind;
  maxCall: number;
};

export const callCost = (view: TableView, hero: ViewPlayer): number =>
  Math.min(
    hero.stack,
    Math.max(
      0,
      (view.currentBet ??
        Math.max(
          view.street === 'preflop' ? view.bigBlind : 0,
          ...view.players.map((p) => p.streetBet)
        )) - hero.streetBet
    )
  );

export const makePreAction = (
  view: TableView,
  hero: ViewPlayer,
  kind: PreActionKind
): PreAction => ({
  tableId: view.id,
  hand: view.handNumber,
  street: view.street,
  kind,
  maxCall: callCost(view, hero),
});

export function resolvePreAction(
  queue: PreAction,
  view: TableView,
  hero: ViewPlayer | undefined,
  connected: boolean
): { cancel: boolean; action?: PokerAction } {
  if (
    !connected ||
    queue.tableId !== view.id ||
    queue.hand !== view.handNumber ||
    queue.street !== view.street ||
    view.phase !== 'betting' ||
    !hero ||
    hero.status !== 'active' ||
    hero.leaving ||
    hero.away
  )
    return { cancel: true };
  const cost = callCost(view, hero);
  if ((queue.kind === 'call' && cost > queue.maxCall) || (queue.kind === 'check' && cost > 0)) {
    return { cancel: true };
  }
  if (!view.legal) return { cancel: false };
  if (queue.kind === 'fold') return { cancel: true, action: { type: 'fold' } };
  if (view.legal.canCheck) return { cancel: true, action: { type: 'check' } };
  if (queue.kind === 'check-fold') return { cancel: true, action: { type: 'fold' } };
  if (queue.kind === 'call' && view.legal.canCall && view.legal.callAmount <= queue.maxCall) {
    return { cancel: true, action: { type: 'call' } };
  }
  return { cancel: true };
}

export function takePreAction(
  holder: { current: PreAction | null },
  view: TableView,
  hero: ViewPlayer | undefined,
  connected: boolean
): PokerAction | undefined {
  if (!holder.current) return undefined;
  const decision = resolvePreAction(holder.current, view, hero, connected);
  if (decision.cancel) {
    // A React ref is consumed before callbacks so this action cannot be sent twice.
    // eslint-disable-next-line no-param-reassign
    holder.current = null;
  }
  return decision.action;
}
