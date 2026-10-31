import React, { useEffect, useState } from 'react';
import { formatChips, PokerAction, TableView, ViewPlayer } from './types';
import { handText } from './logText';
import { tr } from '../../translation/tr';
import * as css from './pokerPage.css';

type ActionBarProps = {
  view: TableView;
  hero?: ViewPlayer;
  onAction: (action: PokerAction) => void;
};

const PRESETS: { key: string; label: string; fraction?: number }[] = [
  { key: 'min', label: 'Min' },
  { key: 'half_pot', label: '½ pot', fraction: 0.5 },
  { key: 'three_quarter_pot', label: '¾ pot', fraction: 0.75 },
  { key: 'pot', label: 'Pot', fraction: 1 },
];

export function ActionBar({ view, hero, onAction }: ActionBarProps) {
  const [raiseTo, setRaiseTo] = useState(0);
  const { legal } = view;

  // Start every new decision at the minimum raise.
  const minRaiseTo = legal?.minRaiseTo ?? 0;
  const maxRaiseTo = legal?.maxRaiseTo ?? 0;
  useEffect(() => {
    setRaiseTo(minRaiseTo);
  }, [minRaiseTo, legal?.hand, legal?.seq]);

  const clamp = (value: number) =>
    Math.min(maxRaiseTo, Math.max(minRaiseTo, Math.round(value || 0)));

  const potRaiseTo = (fraction: number) => {
    if (!legal) return 0;
    const currentBet = Math.max(0, ...view.players.map((p) => p.streetBet));
    return clamp(currentBet + fraction * (view.pot + legal.toCall));
  };

  const acting = view.players.find((p) => p.seat === view.actingSeat);
  const myTurn = !!legal;
  const strength = view.myHand ? handText(view.myHand) : undefined;

  let status = '';
  let tone: 'turn' | 'win' | 'lose' | undefined;
  if (view.phase === 'complete' && view.result && hero) {
    const won = view.result.payouts[hero.id] ?? 0;
    const net = won - hero.totalBet;
    if (won > 0) {
      status =
        net > 0
          ? tr('games.status.won', 'You took {{chips}} from the pot (+{{net}})', {
              chips: formatChips(won),
              net: formatChips(net),
            })
          : tr('games.status.got_back', 'You got {{chips}} back from the pot', {
              chips: formatChips(won),
            });
      tone = 'win';
    } else if (hero.totalBet > 0) {
      status = tr('games.status.lost', 'You lost {{chips}}', { chips: formatChips(hero.totalBet) });
      tone = 'lose';
    } else {
      status = tr('games.status.hand_over', 'Hand over');
    }
  } else if (myTurn) {
    status =
      legal.toCall > 0
        ? tr('games.status.your_turn_to_call', 'Your turn: {{chips}} to call', {
            chips: formatChips(legal.toCall),
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

  const isAllIn = legal ? raiseTo >= legal.maxRaiseTo : false;
  let raiseLabel = tr('games.action.raise', 'Raise');
  if (isAllIn) raiseLabel = tr('games.action.allin', 'All-in');
  else if (legal?.isBet) raiseLabel = tr('games.action.bet', 'Bet');

  return (
    <div className={css.ActionBar}>
      <div className={css.HandInfo}>
        <div className={css.Status} data-tone={tone}>
          {status || ' '}
        </div>
        {strength && (
          <div className={css.HandStrength}>
            {tr('games.status.your_hand', 'Your hand:')}{' '}
            <span className={css.HandStrengthValue}>{strength}</span>
          </div>
        )}
        {hero?.leaving && (
          <div className={css.HandStrength}>
            {tr('games.status.leaving', 'You will leave the table when this hand ends')}
          </div>
        )}
      </div>

      <div className={css.Controls}>
        {legal?.canRaise && legal.minRaiseTo < legal.maxRaiseTo && (
          <div className={css.RaiseRow}>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={css.Preset}
                onClick={() =>
                  setRaiseTo(
                    preset.fraction === undefined ? minRaiseTo : potRaiseTo(preset.fraction)
                  )
                }
              >
                {tr(`games.preset.${preset.key}`, preset.label)}
              </button>
            ))}
            <button type="button" className={css.Preset} onClick={() => setRaiseTo(maxRaiseTo)}>
              {tr('games.action.allin', 'All-in')}
            </button>
            <input
              className={css.RaiseSlider}
              type="range"
              min={minRaiseTo}
              max={maxRaiseTo}
              step={view.smallBlind}
              value={raiseTo}
              onChange={(evt) => setRaiseTo(clamp(Number(evt.target.value)))}
              aria-label={tr('games.action.raise_amount', 'Raise amount')}
            />
            <input
              className={css.AmountInput}
              type="number"
              min={minRaiseTo}
              max={maxRaiseTo}
              value={raiseTo}
              onChange={(evt) => setRaiseTo(Number(evt.target.value))}
              onBlur={() => setRaiseTo(clamp(raiseTo))}
              aria-label={tr('games.action.raise_amount', 'Raise amount')}
            />
          </div>
        )}
        <div className={css.Buttons}>
          <button
            type="button"
            className={css.FoldButton}
            disabled={!myTurn}
            onClick={() => onAction({ type: 'fold' })}
          >
            {tr('games.action.fold', 'Fold')}
          </button>
          <button
            type="button"
            className={css.CallButton}
            disabled={!myTurn}
            onClick={() => onAction(legal?.canCheck ? { type: 'check' } : { type: 'call' })}
          >
            {legal?.canCheck !== false
              ? tr('games.action.check', 'Check')
              : tr('games.action.call', 'Call')}
            {legal && legal.canCall && (
              <span className={css.ButtonSub}>
                {formatChips(legal.callAmount)}
                {legal.callAmount >= (hero?.stack ?? 0)
                  ? ` · ${tr('games.action.allin', 'All-in')}`
                  : ''}
              </span>
            )}
          </button>
          <button
            type="button"
            className={css.RaiseButton}
            disabled={!myTurn || !legal?.canRaise}
            onClick={() => onAction({ type: 'raise', amount: clamp(raiseTo) })}
          >
            {raiseLabel}
            {legal?.canRaise && (
              <span className={css.ButtonSub}>
                {legal.isBet ? '' : `${tr('games.action.raise_to', 'to')} `}
                {formatChips(clamp(raiseTo))}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
