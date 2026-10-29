import React, { useEffect, useState } from 'react';
import {
  describePartialHand,
  formatChips,
  getPlayerAtSeat,
  getTotalPot,
  LegalActions,
  PokerAction,
  PokerPlayer,
  PokerState,
} from './engine';
import * as css from './pokerPage.css';

type ActionBarProps = {
  state: PokerState;
  hero?: PokerPlayer;
  legal?: LegalActions;
  leaveAfterHand: boolean;
  onAction: (action: PokerAction) => void;
  onCancelLeave: () => void;
};

const PRESETS: { label: string; fraction?: number }[] = [
  { label: 'Mín' },
  { label: '½ pote', fraction: 0.5 },
  { label: '¾ pote', fraction: 0.75 },
  { label: 'Pote', fraction: 1 },
];

export function ActionBar({
  state,
  hero,
  legal,
  leaveAfterHand,
  onAction,
  onCancelLeave,
}: ActionBarProps) {
  const [raiseTo, setRaiseTo] = useState(0);

  // Start every new decision at the minimum raise.
  const minRaiseTo = legal?.minRaiseTo ?? 0;
  const maxRaiseTo = legal?.maxRaiseTo ?? 0;
  useEffect(() => {
    setRaiseTo(minRaiseTo);
  }, [minRaiseTo, state.logCounter]);

  const clamp = (value: number) =>
    Math.min(maxRaiseTo, Math.max(minRaiseTo, Math.round(value || 0)));

  const potRaiseTo = (fraction: number) => {
    if (!legal) return 0;
    const pot = getTotalPot(state);
    return clamp(state.currentBet + fraction * (pot + legal.toCall));
  };

  const acting = getPlayerAtSeat(state, state.actingSeat);
  const myTurn = !!legal;
  const holeCards = hero?.holeCards ?? [];
  const inHand = !!hero && holeCards.length > 0 && hero.status !== 'sitting-out';
  const strength = inHand ? describePartialHand([...holeCards, ...state.board]) : undefined;

  let status = '';
  let tone: 'turn' | 'win' | 'lose' | undefined;
  if (state.phase === 'complete' && state.result && hero) {
    const won = state.result.payouts[hero.id] ?? 0;
    const net = won - hero.totalBet;
    if (won > 0) {
      status =
        net > 0
          ? `Você levou ${formatChips(won)} do pote (+${formatChips(net)})`
          : `Você recuperou ${formatChips(won)} do pote`;
      tone = 'win';
    } else if (hero.totalBet > 0) {
      status = `Você perdeu ${formatChips(hero.totalBet)}`;
      tone = 'lose';
    } else {
      status = 'Mão encerrada';
    }
  } else if (myTurn) {
    status = legal.toCall > 0 ? `Sua vez — ${formatChips(legal.toCall)} para pagar` : 'Sua vez';
    tone = 'turn';
  } else if (hero?.status === 'folded') {
    status = 'Você desistiu desta mão';
  } else if (hero?.status === 'allin') {
    status = 'Você está all-in';
  } else if (state.phase === 'betting' && acting) {
    status = `${acting.name} está pensando…`;
  } else if (state.phase === 'waiting') {
    status = 'Embaralhando…';
  }

  const isAllIn = legal ? raiseTo >= legal.maxRaiseTo : false;
  let raiseLabel = 'Aumentar';
  if (isAllIn) raiseLabel = 'All-in';
  else if (legal?.isBet) raiseLabel = 'Apostar';

  return (
    <div className={css.ActionBar}>
      <div className={css.HandInfo}>
        <div className={css.Status} data-tone={tone}>
          {status || ' '}
        </div>
        {strength && (
          <div className={css.HandStrength}>
            Sua mão: <span className={css.HandStrengthValue}>{strength}</span>
          </div>
        )}
        {leaveAfterHand && (
          <div className={css.HandStrength}>
            Você sairá da mesa ao fim desta mão ·{' '}
            <button type="button" className={css.Preset} onClick={onCancelLeave}>
              Continuar jogando
            </button>
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
                {preset.label}
              </button>
            ))}
            <button type="button" className={css.Preset} onClick={() => setRaiseTo(maxRaiseTo)}>
              All-in
            </button>
            <input
              className={css.RaiseSlider}
              type="range"
              min={minRaiseTo}
              max={maxRaiseTo}
              step={state.config.smallBlind}
              value={raiseTo}
              onChange={(evt) => setRaiseTo(clamp(Number(evt.target.value)))}
              aria-label="Valor do aumento"
            />
            <input
              className={css.AmountInput}
              type="number"
              min={minRaiseTo}
              max={maxRaiseTo}
              value={raiseTo}
              onChange={(evt) => setRaiseTo(Number(evt.target.value))}
              onBlur={() => setRaiseTo(clamp(raiseTo))}
              aria-label="Valor do aumento"
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
            Desistir
          </button>
          <button
            type="button"
            className={css.CallButton}
            disabled={!myTurn}
            onClick={() => onAction(legal?.canCheck ? { type: 'check' } : { type: 'call' })}
          >
            {legal?.canCheck !== false ? 'Mesa' : 'Pagar'}
            {legal && legal.canCall && (
              <span className={css.ButtonSub}>
                {formatChips(legal.callAmount)}
                {legal.callAmount >= (hero?.stack ?? 0) ? ' · all-in' : ''}
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
                {legal.isBet ? '' : 'para '}
                {formatChips(clamp(raiseTo))}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
