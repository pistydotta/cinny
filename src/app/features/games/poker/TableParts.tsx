import React, { useMemo } from 'react';
import { formatChips, LogEntry } from './types';
import { logText } from './logText';
import * as css from './pokerPage.css';
import { tr } from '../../translation/tr';

type BuyInFieldProps = {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
};

export function BuyInField({ value, min, max, step, onChange }: BuyInFieldProps) {
  return (
    <div className={css.Field}>
      <div className={css.FieldHeader}>
        <span>{tr('games.buy_in.label', 'Chips to bring to the table')}</span>
        <span className={css.FieldValue}>{formatChips(value)}</span>
      </div>
      <input
        className={css.Range}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(evt) => onChange(Number(evt.target.value))}
        aria-label={tr('games.buy_in.label', 'Chips to bring to the table')}
      />
      <div className={css.RangeLimits}>
        <span>{formatChips(min)}</span>
        <span>{formatChips(max)}</span>
      </div>
    </div>
  );
}

type HistoryDrawerProps = {
  log: LogEntry[];
};

export function HistoryDrawer({ log }: HistoryDrawerProps) {
  // Newest hand first, each hand read top to bottom.
  const history = useMemo(() => {
    const hands: LogEntry[][] = [];
    log.forEach((entry) => {
      const last = hands[hands.length - 1];
      if (last && last[0].hand === entry.hand) last.push(entry);
      else hands.push([entry]);
    });
    return hands.reverse().flat();
  }, [log]);

  return (
    <div className={css.Drawer}>
      <div className={css.DrawerHeader}>{tr('games.table.history', 'Table history')}</div>
      <div className={css.DrawerList}>
        {history.map((entry) =>
          entry.key === 'hand' ? (
            <div key={entry.id} className={css.DrawerHand}>
              {logText(entry)}
            </div>
          ) : (
            <div key={entry.id}>{logText(entry)}</div>
          )
        )}
      </div>
    </div>
  );
}
