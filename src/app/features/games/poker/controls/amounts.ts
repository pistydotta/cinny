import { formatChips, ViewLegal } from '../types';
import { AmountUnit } from './preferences';

export const formatAmount = (chips: number, unit: AmountUnit, bigBlind: number): string =>
  unit === 'bb' && bigBlind > 0
    ? `${(chips / bigBlind).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} BB`
    : formatChips(chips);

export const amountInput = (chips: number, unit: AmountUnit, bigBlind: number): number =>
  unit === 'bb' && bigBlind > 0 ? Number((chips / bigBlind).toFixed(2)) : chips;

export const inputChips = (value: number, unit: AmountUnit, bigBlind: number): number =>
  Math.round(value * (unit === 'bb' && bigBlind > 0 ? bigBlind : 1));

export const clampRaise = (
  chips: number,
  legal: Pick<ViewLegal, 'minRaiseTo' | 'maxRaiseTo'>
): number =>
  Math.min(
    legal.maxRaiseTo,
    Math.max(legal.minRaiseTo, Math.round(Number.isFinite(chips) ? chips : legal.minRaiseTo))
  );

export const potRaise = (
  pot: number,
  toCall: number,
  currentBet: number,
  fraction: number,
  legal: Pick<ViewLegal, 'minRaiseTo' | 'maxRaiseTo'>
): number => clampRaise(currentBet + fraction * (pot + toCall), legal);
