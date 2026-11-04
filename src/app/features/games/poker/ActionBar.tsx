import React, { useEffect, useId, useState } from 'react';
import { formatChips, PokerAction, TableView, ViewPlayer } from './types';
import { AmountUnit } from './controls/preferences';
import { amountInput, clampRaise, formatAmount, inputChips, potRaise } from './controls/amounts';
import { callCost, PreAction, PreActionKind } from './controls/preActions';
import { HandGuide } from './controls/HandGuide';
import { tr } from '../../translation/tr';
import * as css from './pokerPage.css';

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
};

const PRESETS: { key: string; label: string; fraction?: number }[] = [
  { key: 'min', label: 'Min' },
  { key: 'half_pot', label: '½ pot', fraction: 0.5 },
  { key: 'three_quarter_pot', label: '¾ pot', fraction: 0.75 },
  { key: 'pot', label: 'Pot', fraction: 1 },
];

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
}: ActionBarProps) {
  const [raiseTo, setRaiseTo] = useState(0);
  const controlId = useId();
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

  const potRaiseTo = (fraction: number) => {
    if (!legal) return 0;
    const currentBet = view.currentBet ?? Math.max(0, ...view.players.map((p) => p.streetBet));
    return potRaise(view.pot, legal.toCall, currentBet, fraction, legal);
  };

  const acting = view.players.find((p) => p.seat === view.actingSeat);
  const myTurn = !!legal;

  let status = '';
  let tone: 'turn' | 'win' | 'lose' | undefined;
  if (view.phase === 'complete' && view.result && hero) {
    const won = view.result.payouts[hero.id] ?? 0;
    const net = won - hero.totalBet;
    if (won > 0) {
      status =
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
      status = tr('games.status.lost', 'You lost {{chips}}', { chips: amount(hero.totalBet) });
      tone = 'lose';
    } else {
      status = tr('games.status.hand_over', 'Hand over');
    }
  } else if (myTurn) {
    status =
      legal.toCall > 0
        ? tr('games.status.your_turn_to_call', 'Your turn: {{chips}} to call', {
            chips: amount(legal.toCall),
          })
        : tr('games.status.your_turn', 'Your turn');
    tone = 'turn';
  } else if (hero?.status === 'folded') {
    status = tr('games.status.you_folded', 'You folded this hand');
  } else if (hero?.status === 'allin') {
    status = tr('games.status.you_allin', 'You are all-in');
  } else if (view.phase === 'betting' && acting) {
    status = tr('games.status.thinking', '{{name}} is thinking…', { name: acting.name });
  } else if (view.phase === 'waiting') {
    status = tr('games.status.waiting_players', 'Waiting for more players to start…');
  }

  const isAllIn = legal ? effectiveRaise >= legal.maxRaiseTo : false;
  let raiseLabel = tr('games.action.raise', 'Raise');
  if (isAllIn) raiseLabel = tr('games.action.allin', 'All-in');
  else if (legal?.isBet) raiseLabel = tr('games.action.bet', 'Bet');

  return (
    <div className={css.ActionBar}>
      <div className={css.HandInfo}>
        <div className={css.Status} data-tone={tone}>
          {status || ' '}
        </div>
        {hero && <HandGuide view={view} hero={hero} />}
        {hero?.leaving && (
          <div className={css.HandStrength}>
            {tr('games.status.leaving', 'You will leave the table when this hand ends')}
          </div>
        )}
      </div>

      <div className={css.Controls}>
        <div
          className={css.UnitSwitch}
          aria-label={tr('poker_controls.amount.units', 'Betting units')}
        >
          {(['chips', 'bb'] as const).map((next) => (
            <button
              key={next}
              type="button"
              className={css.Preset}
              aria-pressed={unit === next}
              onClick={() => {
                pickRaise(effectiveRaise);
                onUnit(next);
              }}
            >
              {next === 'bb' ? 'BB' : tr('poker_controls.amount.chips', 'Chips')}
            </button>
          ))}
          <span className={css.GuideNote}>
            {tr('poker_controls.amount.bb_value', '1 BB = {{chips}} chips', {
              chips: formatChips(view.bigBlind),
            })}
          </span>
        </div>
        {!myTurn && hero?.status === 'active' && !hero.leaving && view.phase === 'betting' && (
          <div className={css.PreActions}>
            {(['fold', 'check-fold', 'check', 'call'] as const).map((kind) => {
              const cost = callCost(view, hero);
              if (kind === 'call' && cost <= 0) return null;
              const labels = {
                fold: tr('poker_controls.queue.fold', 'Fold on my turn'),
                'check-fold': tr('poker_controls.queue.check_fold', 'Check / fold'),
                check: tr('poker_controls.queue.check', 'Check only'),
                call: tr('poker_controls.queue.call', 'Call up to {{amount}}', {
                  amount: amount(cost),
                }),
              };
              return (
                <label key={kind} className={css.QueueOption} htmlFor={`${controlId}-${kind}`}>
                  <input
                    id={`${controlId}-${kind}`}
                    className={css.CheckInput}
                    type="checkbox"
                    checked={queue?.kind === kind}
                    disabled={disabled || (kind === 'check' && cost > 0)}
                    onChange={() => onQueue(queue?.kind === kind ? undefined : kind)}
                  />
                  {labels[kind]}
                </label>
              );
            })}
            {view.canFoldNow && (
              <button
                type="button"
                className={css.FoldButton}
                style={{ height: 34, padding: '0 12px' }}
                disabled={disabled}
                onClick={onFoldNow}
                title={tr(
                  'poker_controls.queue.fold_now_hint',
                  'Give up this hand immediately. This cannot be undone.'
                )}
              >
                {tr('poker_controls.queue.fold_now', 'Fold now')}
              </button>
            )}
            {queue && (
              <span className={css.GuideNote}>
                {tr(
                  'poker_controls.queue.hint',
                  'Runs once on your turn. Uncheck to cancel. Calls never exceed the chosen limit; new streets or disconnections clear the selection.'
                )}
              </span>
            )}
          </div>
        )}
        {legal?.canRaise && legal.minRaiseTo < legal.maxRaiseTo && (
          <div className={css.RaiseRow}>
            {(view.street === 'preflop' ? PRESETS.slice(0, 1) : PRESETS).map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={css.Preset}
                disabled={disabled}
                onClick={() =>
                  pickRaise(
                    preset.fraction === undefined ? minRaiseTo : potRaiseTo(preset.fraction)
                  )
                }
              >
                {tr(`games.preset.${preset.key}`, preset.label)}
              </button>
            ))}
            {view.street === 'preflop' &&
              [2.5, 3, 4].map((bb) => (
                <button
                  type="button"
                  key={bb}
                  className={css.Preset}
                  disabled={disabled}
                  onClick={() => pickRaise(bb * view.bigBlind)}
                >
                  {amount(clamp(bb * view.bigBlind))}
                </button>
              ))}
            <button
              type="button"
              className={css.Preset}
              disabled={disabled}
              onClick={() => pickRaise(maxRaiseTo)}
            >
              {tr('games.action.allin', 'All-in')}
            </button>
            <input
              className={css.RaiseSlider}
              type="range"
              min={minRaiseTo}
              max={maxRaiseTo}
              step={1}
              value={effectiveRaise}
              disabled={disabled}
              onChange={(event) => pickRaise(Number(event.target.value))}
              aria-label={tr('games.action.raise_amount', 'Raise amount')}
            />
            <label className={css.UnitSwitch} htmlFor={`${controlId}-raise`}>
              <input
                id={`${controlId}-raise`}
                className={css.AmountInput}
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
                  unit: unit === 'bb' ? 'BB' : tr('poker_controls.amount.chips', 'Chips'),
                })}
              />
              <span>{unit === 'bb' ? 'BB' : tr('poker_controls.amount.chips', 'Chips')}</span>
            </label>
            <span className={css.GuideNote}>
              {tr('poker_controls.amount.total', 'Total on this street: {{chips}} chips', {
                chips: formatChips(effectiveRaise),
              })}
            </span>
          </div>
        )}
        <div className={css.Buttons}>
          <button
            type="button"
            className={css.FoldButton}
            disabled={!myTurn || disabled}
            onClick={() => onAction({ type: 'fold' })}
          >
            {tr('games.action.fold', 'Fold')}
          </button>
          <button
            type="button"
            className={css.CallButton}
            disabled={!myTurn || disabled}
            onClick={() => onAction(legal?.canCheck ? { type: 'check' } : { type: 'call' })}
          >
            {legal?.canCheck !== false
              ? tr('games.action.check', 'Check')
              : tr('games.action.call', 'Call')}
            {legal && legal.canCall && (
              <span className={css.ButtonSub}>
                {amount(legal.callAmount)}
                {legal.callAmount >= (hero?.stack ?? 0)
                  ? ` · ${tr('games.action.allin', 'All-in')}`
                  : ''}
              </span>
            )}
          </button>
          <button
            type="button"
            className={css.RaiseButton}
            disabled={!myTurn || !legal?.canRaise || disabled}
            onClick={() => onAction({ type: 'raise', amount: effectiveRaise })}
          >
            {raiseLabel}
            {legal?.canRaise && (
              <span className={css.ButtonSub}>
                {legal.isBet ? '' : `${tr('games.action.raise_to', 'to')} `}
                {amount(effectiveRaise)}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
