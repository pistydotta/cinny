import React from 'react';
import * as css from './pokerTable.css';

const DENOMINATIONS: { value: number; color: string }[] = [
  { value: 1000, color: '#e2a72e' },
  { value: 500, color: '#7b3fbf' },
  { value: 100, color: '#22252b' },
  { value: 25, color: '#1f9d55' },
  { value: 5, color: '#d63a3a' },
  { value: 1, color: '#3a7bd5' },
];

/** Chip colors for an amount, biggest denominations first, capped at `max` chips. */
export const chipColors = (amount: number, max = 5): string[] => {
  const colors: string[] = [];
  let rest = amount;
  DENOMINATIONS.forEach(({ value, color }) => {
    while (rest >= value && colors.length < max) {
      colors.push(color);
      rest -= value;
    }
  });
  return colors.length > 0 ? colors : [DENOMINATIONS[DENOMINATIONS.length - 1].color];
};

type ChipStackProps = {
  amount: number;
  max?: number;
};

export function ChipStack({ amount, max }: ChipStackProps) {
  return (
    <div className={css.ChipStack} aria-hidden>
      {chipColors(amount, max).map((color, index) => (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          className={css.Chip}
          style={{ ['--chip-color' as string]: color }}
        />
      ))}
    </div>
  );
}
