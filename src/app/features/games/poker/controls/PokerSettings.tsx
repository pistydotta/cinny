import React, { useId } from 'react';
import { tr } from '../../../translation/tr';
import type { PokerPreferences } from './preferences';
import * as css from '../pokerPage.css';
import { PokerModal } from './PokerModal';

type Props = {
  preferences: PokerPreferences;
  onChange: (value: PokerPreferences) => void;
  onPreview: () => void;
  onClose: () => void;
};

export function PokerSettings({ preferences, onChange, onPreview, onClose }: Props) {
  const controlId = useId();
  const labels = {
    sounds: 'Enable poker sounds',
    turn: 'Your turn',
    cards: 'Cards dealt',
    actions: 'Bets, checks and folds',
    wins: 'You win a pot',
  };
  return (
    <PokerModal title={tr('poker_controls.audio.title', 'Poker sounds')} onClose={onClose}>
      <p className={css.DialogText}>
        {tr(
          'poker_controls.audio.hint',
          'Optional sounds for this browser. Your call and music volume are unchanged.'
        )}
      </p>
      {(['sounds', 'turn', 'cards', 'actions', 'wins'] as const).map((key) => (
        <label key={key} className={css.CheckRow} htmlFor={`${controlId}-${key}`}>
          <input
            id={`${controlId}-${key}`}
            type="checkbox"
            className={css.CheckInput}
            checked={preferences[key]}
            onChange={(event) => onChange({ ...preferences, [key]: event.target.checked })}
          />
          {tr(`poker_controls.audio.${key}`, labels[key])}
        </label>
      ))}
      <label className={css.Field} htmlFor={`${controlId}-volume`}>
        <span>
          {tr('poker_controls.audio.volume', 'Poker volume')} ·{' '}
          {Math.round(preferences.volume * 100)}%
        </span>
        <input
          id={`${controlId}-volume`}
          className={css.Range}
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={preferences.volume}
          onChange={(event) => onChange({ ...preferences, volume: Number(event.target.value) })}
        />
      </label>
      <button
        type="button"
        className={css.SmallButton}
        disabled={!preferences.sounds || preferences.volume === 0}
        onClick={onPreview}
      >
        {tr('poker_controls.audio.test', 'Test sound')}
      </button>
    </PokerModal>
  );
}
