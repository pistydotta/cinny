import React, { CSSProperties, useEffect, useState } from 'react';
import { Icon, IconSrc, Icons } from 'folds';
import { formatChips, PokerAction, TableView, ViewPlayer } from './types';
import { AmountUnit } from './controls/preferences';
import { amountInput, clampRaise, formatAmount, inputChips, potRaise } from './controls/amounts';
import { callCost, PreAction, PreActionKind } from './controls/preActions';
import { queueKey, turnKeys } from './controls/clickGuard';
import { useArmed } from './controls/useArmed';
import { HandGuide } from './controls/HandGuide';
import { tr } from '../../translation/tr';
import * as bar from './controls/actionBar.css';
import { PlayerAvatar, RING_LENGTH, RING_RADIUS } from './table/PokerTable';
import { TurnTimer } from './turnTimer';

type ActionBarProps = {
  view: TableView;
  hero?: ViewPlayer;
  onAction: (action: PokerAction) => void;
  connected: boolean;
  pending: boolean;
  unit: AmountUnit;
  onUnit: (unit: AmountUnit) => void;
  queue: PreAction | null;
  onQueue: (kind?: PreActionKind) => void;
  onFoldNow: () => void;
  onShowCards: () => void;
  turnTimer?: TurnTimer;
  resolveAvatar?: (url: string) => string | undefined;
  /** A bet size chosen outside the bar (the tournament coach); `pick` changes on every choice. */
  suggestedRaise?: { amount: number; pick: number };
};

const POT_PRESETS: { key: string; label: string; fraction: number }[] = [
  { key: 'half_pot', label: '½ pot', fraction: 0.5 },
  { key: 'three_quarter_pot', label: '¾ pot', fraction: 0.75 },
  { key: 'pot', label: 'Pot', fraction: 1 },
];

/** Whole seconds until the turn deadline, ticking while `active`. */
function useSecondsLeft(deadline: number | null, active: boolean): number | undefined {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return undefined;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active, deadline]);
  if (!active || deadline === null) return undefined;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

const unitLabel = (unit: AmountUnit) =>
  unit === 'bb' ? 'BB' : tr('poker_controls.amount.chips', 'Chips');

type UnitSwitchProps = {
  unit: AmountUnit;
  onUnit: (unit: AmountUnit) => void;
  bigBlind: number;
  framed?: boolean;
};

function UnitSwitch({ unit, onUnit, bigBlind, framed }: UnitSwitchProps) {
  return (
    <div
      className={framed ? bar.Units : bar.UnitsInline}
      role="group"
      aria-label={tr('poker_controls.amount.units', 'Betting units')}
      title={tr('poker_controls.amount.bb_value', '1 BB = {{chips}} chips', {
        chips: formatChips(bigBlind),
      })}
    >
      {(['chips', 'bb'] as const).map((next) => (
        <button
          key={next}
          type="button"
          className={bar.Unit}
          aria-pressed={unit === next}
          onClick={() => onUnit(next)}
        >
          {unitLabel(next)}
        </button>
      ))}
    </div>
  );
}

function ButtonContent({ icon, children }: { icon: IconSrc; children: React.ReactNode }) {
  return (
    <>
      <Icon className={bar.ButtonIcon} size="200" src={icon} />
      <span className={bar.ButtonLabel}>{children}</span>
    </>
  );
}

export function ActionBar({
  view,
  hero,
  onAction,
  connected,
  pending,
  unit,
  onUnit,
  queue,
  onQueue,
  onFoldNow,
  onShowCards,
  turnTimer,
  resolveAvatar,
  suggestedRaise,
}: ActionBarProps) {
  const [raiseTo, setRaiseTo] = useState(0);
  const [draft, setDraft] = useState<string>();
  const { legal } = view;
  const amount = (chips: number) => formatAmount(chips, unit, view.bigBlind);
  const disabled = pending || !connected;

  // Start every new decision at the minimum raise.
  const minRaiseTo = legal?.minRaiseTo ?? 0;
  const maxRaiseTo = legal?.maxRaiseTo ?? 0;
  useEffect(() => {
    setRaiseTo(minRaiseTo);
    setDraft(undefined);
  }, [minRaiseTo, legal?.hand, legal?.seq]);

  const clamp = (value: number) => clampRaise(value, { minRaiseTo, maxRaiseTo });
  const effectiveRaise = clamp(
    draft === undefined ? raiseTo : inputChips(Number(draft), unit, view.bigBlind)
  );
  const pickRaise = (value: number) => {
    setDraft(undefined);
    setRaiseTo(clamp(value));
  };
  const suggestedPick = suggestedRaise?.pick;
  useEffect(() => {
    if (suggestedRaise) pickRaise(suggestedRaise.amount);
    // Only a new choice applies; the decision's own reset must not bring an old one back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedPick]);

  const potRaiseTo = (fraction: number) => {
    if (!legal) return minRaiseTo;
    const currentBet = view.currentBet ?? Math.max(0, ...view.players.map((p) => p.streetBet));
    return potRaise(view.pot, legal.toCall, currentBet, fraction, legal);
  };

  const acting = view.players.find((p) => p.seat === view.actingSeat);
  const myTurn = !!legal;
  const actor = myTurn ? hero : acting;
  const timer = turnTimer && actor && turnTimer.seat === actor.seat ? turnTimer : undefined;
  const seconds = useSecondsLeft(view.turnDeadline, !!timer);

  let title = '';
  let sub = '';
  let tone: 'win' | 'lose' | undefined;
  if (view.phase === 'complete' && view.result && hero) {
    const won = view.result.payouts[hero.id] ?? 0;
    const net = won - hero.totalBet;
    if (won > 0) {
      title =
        net > 0
          ? tr('games.status.won', 'You took {{chips}} from the pot (+{{net}})', {
              chips: amount(won),
              net: amount(net),
            })
          : tr('games.status.got_back', 'You got {{chips}} back from the pot', {
              chips: amount(won),
            });
      tone = 'win';
    } else if (hero.totalBet > 0) {
      title = tr('games.status.lost', 'You lost {{chips}}', { chips: amount(hero.totalBet) });
      tone = 'lose';
    } else {
      title = tr('games.status.hand_over', 'Hand over');
    }
  } else if (legal) {
    title = tr('games.status.your_turn', 'Your turn');
    sub =
      legal.toCall > 0
        ? tr('poker_controls.bar.to_call', '{{amount}} to call', { amount: amount(legal.toCall) })
        : tr('poker_controls.bar.no_bet', 'No bet to call');
  } else if (view.phase === 'betting' && acting) {
    title = acting.name;
    sub = tr('poker_controls.bar.deciding', 'deciding');
    if (hero?.status === 'folded')
      sub += ` · ${tr('games.status.you_folded', 'You folded this hand')}`;
    if (hero?.status === 'allin') sub += ` · ${tr('games.status.you_allin', 'You are all-in')}`;
  } else if (view.phase === 'waiting') {
    title = tr('games.status.waiting_players', 'Waiting for more players to start…');
  }

  const isAllIn = legal ? effectiveRaise >= legal.maxRaiseTo : false;
  let raiseLabel = tr('games.action.raise', 'Raise');
  if (isAllIn) raiseLabel = tr('games.action.allin', 'All-in');
  else if (legal?.isBet) raiseLabel = tr('games.action.bet', 'Bet');

  const canQueue =
    !myTurn && hero?.status === 'active' && !hero.leaving && view.phase === 'betting';
  const canSize = !!legal?.canRaise && legal.minRaiseTo < legal.maxRaiseTo;
  const fill =
    maxRaiseTo > minRaiseTo ? ((effectiveRaise - minRaiseTo) / (maxRaiseTo - minRaiseTo)) * 100 : 0;
  const presets = [
    { key: 'min', label: tr('games.preset.min', 'Min'), to: minRaiseTo },
    ...(view.street === 'preflop'
      ? [2.5, 3, 4].map((bb) => ({
          key: `bb${bb}`,
          label: amount(clamp(bb * view.bigBlind)),
          to: clamp(bb * view.bigBlind),
        }))
      : POT_PRESETS.map((preset) => ({
          key: preset.key,
          label: tr(`games.preset.${preset.key}`, preset.label),
          to: clamp(potRaiseTo(preset.fraction)),
        }))),
    { key: 'allin', label: tr('games.action.allin', 'All-in'), to: maxRaiseTo },
  ];
  const switchUnit = (next: AmountUnit) => {
    pickRaise(effectiveRaise);
    onUnit(next);
  };

  const cost = canQueue && hero ? callCost(view, hero) : 0;
  const keys = turnKeys(legal);
  const foldArm = useArmed(keys.fold);
  const checkCallArm = useArmed(keys.checkCall);
  const raiseArm = useArmed(keys.raise);
  const queueArm = useArmed(queueKey(view, canQueue, cost));
  // The sizing row takes the toggles' place when the turn comes: a click aimed at "Check only"
  // would otherwise land on a preset or the slider and change the bet.
  const sizingArm = useArmed(keys.fold);
  const queueLabels: Record<PreActionKind, string> = {
    fold: tr('poker_controls.queue.fold_short', 'Fold'),
    'check-fold': tr('poker_controls.queue.check_fold', 'Check / fold'),
    check: tr('poker_controls.queue.check', 'Check only'),
    call: tr('poker_controls.queue.call', 'Call up to {{amount}}', { amount: amount(cost) }),
  };

  return (
    <div className={bar.Bar}>
      <div className={bar.Top}>
        {actor && (
          <div className={bar.Avatar}>
            <PlayerAvatar player={actor} resolveAvatar={resolveAvatar} />
            {timer && (
              <svg className={bar.Ring} viewBox="0 0 100 100" aria-hidden>
                <circle className={bar.RingTrack} cx="50" cy="50" r={RING_RADIUS} />
                <circle
                  key={timer.key}
                  className={bar.RingFill}
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  style={
                    {
                      '--ring-length': RING_LENGTH,
                      animationDuration: `${timer.ms}ms`,
                      animationDelay: `-${timer.elapsedMs}ms`,
                    } as CSSProperties
                  }
                />
              </svg>
            )}
          </div>
        )}
        <div className={bar.Who}>
          <div className={bar.Name} data-tone={tone}>
            {title || ' '}
          </div>
          {(sub || seconds !== undefined) && (
            <div className={bar.Sub}>
              {seconds !== undefined && (
                <span className={bar.Timer} data-urgent={seconds <= 5}>
                  <Icon size="50" src={Icons.Clock} />
                  {seconds}s
                </span>
              )}
              {sub && <span>{sub}</span>}
            </div>
          )}
          {hero?.leaving && (
            <div className={bar.Sub}>
              {tr('games.status.leaving', 'You will leave the table when this hand ends')}
            </div>
          )}
        </div>
        {view.canShowCards && (
          <button
            type="button"
            className={bar.Chip}
            disabled={disabled}
            onClick={onShowCards}
            title={tr(
              'games.action.show_cards_hint',
              'Your cards stay hidden unless you show them'
            )}
          >
            {tr('games.action.show_cards', 'Show my cards')}
          </button>
        )}
        {hero && <HandGuide view={view} hero={hero} />}
        {!canSize && <UnitSwitch unit={unit} onUnit={switchUnit} bigBlind={view.bigBlind} framed />}
      </div>

      {(myTurn || canQueue) && <div className={bar.Divider} />}

      {/* Before the turn the toggles sit above an empty slot where the action buttons will
          appear, so a click meant for a toggle can't land on Fold or Call when the turn comes. */}
      {canQueue && hero && (
        <div className={bar.Dock}>
          <div
            className={bar.Toggles}
            role="group"
            aria-label={tr('poker_controls.bar.on_my_turn', 'On my turn')}
          >
            <span className={bar.RowLabel}>
              {tr('poker_controls.bar.on_my_turn', 'On my turn')}
            </span>
            {(['fold', 'check-fold', 'check', 'call'] as const).map((kind) => {
              if (kind === 'call' && cost <= 0) return null;
              const on = queue?.kind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  role="checkbox"
                  className={bar.Toggle}
                  aria-checked={on}
                  data-arming={!queueArm.armed}
                  disabled={disabled || (kind === 'check' && cost > 0)}
                  onClick={queueArm.guard(() => onQueue(on ? undefined : kind))}
                >
                  <span className={bar.Box} aria-hidden>
                    {on && <Icon size="50" src={Icons.Check} />}
                  </span>
                  {queueLabels[kind]}
                </button>
              );
            })}
            {view.canFoldNow && (
              <>
                <span className={bar.Separator} />
                <button
                  type="button"
                  className={bar.Danger}
                  data-arming={!queueArm.armed}
                  disabled={disabled}
                  onClick={queueArm.guard(onFoldNow)}
                  title={tr(
                    'poker_controls.queue.fold_now_hint',
                    'Give up this hand immediately. This cannot be undone.'
                  )}
                >
                  {tr('poker_controls.queue.fold_now', 'Fold now')}
                </button>
              </>
            )}
          </div>
          <div
            className={bar.Slot}
            data-queued={!!queue}
            role="status"
            title={tr(
              'poker_controls.queue.hint',
              'Runs once on your turn. Uncheck to cancel. Calls never exceed the chosen limit; new streets or disconnections clear the selection.'
            )}
          >
            {queue
              ? tr('poker_controls.queue.selected', 'On your turn: {{action}}', {
                  action: queueLabels[queue.kind],
                })
              : tr('poker_controls.queue.slot', 'Your action buttons appear here on your turn')}
          </div>
        </div>
      )}

      {legal && (
        <div className={bar.Dock}>
          {canSize && (
            <div className={bar.Sizing} data-arming={!sizingArm.armed}>
              <div
                className={bar.Presets}
                role="group"
                aria-label={tr('games.action.raise_amount', 'Raise amount')}
              >
                {presets.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    className={bar.Preset}
                    aria-pressed={preset.to === effectiveRaise}
                    disabled={disabled}
                    onClick={() => pickRaise(preset.to)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <input
                className={bar.Slider}
                type="range"
                min={minRaiseTo}
                max={maxRaiseTo}
                step={1}
                value={effectiveRaise}
                disabled={disabled}
                style={{ '--fill': `${fill}%` } as CSSProperties}
                onChange={(event) => pickRaise(Number(event.target.value))}
                aria-label={tr('games.action.raise_amount', 'Raise amount')}
              />
              <div
                className={bar.Amount}
                title={tr('poker_controls.amount.total', 'Total on this street: {{chips}} chips', {
                  chips: formatChips(effectiveRaise),
                })}
              >
                <input
                  className={bar.AmountInput}
                  type="number"
                  inputMode="decimal"
                  min={amountInput(minRaiseTo, unit, view.bigBlind)}
                  max={amountInput(maxRaiseTo, unit, view.bigBlind)}
                  step={unit === 'bb' ? 1 / view.bigBlind : 1}
                  value={draft ?? amountInput(effectiveRaise, unit, view.bigBlind)}
                  disabled={disabled}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={() => pickRaise(effectiveRaise)}
                  aria-label={tr('poker_controls.amount.input', 'Total bet in {{unit}}', {
                    unit: unitLabel(unit),
                  })}
                />
                <UnitSwitch unit={unit} onUnit={switchUnit} bigBlind={view.bigBlind} />
              </div>
            </div>
          )}
          <div className={bar.Buttons}>
            <button
              type="button"
              className={bar.Fold}
              data-arming={!foldArm.armed}
              disabled={disabled}
              onClick={foldArm.guard(() => onAction({ type: 'fold' }))}
            >
              <ButtonContent icon={Icons.Cross}>{tr('games.action.fold', 'Fold')}</ButtonContent>
            </button>
            <button
              type="button"
              className={bar.Neutral}
              data-arming={!checkCallArm.armed}
              disabled={disabled}
              onClick={checkCallArm.guard(() =>
                onAction(legal.canCheck ? { type: 'check' } : { type: 'call' })
              )}
            >
              <ButtonContent icon={legal.canCheck ? Icons.Check : Icons.ArrowRight}>
                {legal.canCheck
                  ? tr('games.action.check', 'Check')
                  : tr('games.action.call', 'Call')}
                {legal.canCall &&
                  ` ${amount(legal.callAmount)}${
                    legal.callAmount >= (hero?.stack ?? 0)
                      ? ` · ${tr('games.action.allin', 'All-in')}`
                      : ''
                  }`}
              </ButtonContent>
            </button>
            <button
              type="button"
              className={bar.Primary}
              data-arming={!raiseArm.armed}
              disabled={!legal.canRaise || disabled}
              onClick={raiseArm.guard(() => onAction({ type: 'raise', amount: effectiveRaise }))}
            >
              <ButtonContent icon={isAllIn ? Icons.ArrowDropTop : Icons.ArrowTop}>
                {raiseLabel}
                {legal.canRaise &&
                  ` ${
                    legal.isBet || isAllIn ? '' : `${tr('games.action.raise_to', 'to')} `
                  }${amount(effectiveRaise)}`}
              </ButtonContent>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
