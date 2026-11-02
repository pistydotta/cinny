import { ModKey } from './engine/types';

const PERCENT: ModKey[] = [
  'damagePct',
  'maxHpPct',
  'attackSpeedPct',
  'critChance',
  'critDamage',
  'dodge',
  'lifesteal',
  'skillPower',
  'cooldownReduction',
  'goldFind',
  'xpGain',
];

export const isPercent = (key: ModKey): boolean => PERCENT.includes(key);

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];

/** 1234 → "1.2K", the way idle games show big numbers. */
export const formatBig = (n: number): string => {
  const value = Math.floor(n);
  if (Math.abs(value) < 10000) return value.toLocaleString('pt-BR');
  const tier = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(Math.abs(value)) / 3));
  const scaled = value / 1000 ** tier;
  return `${scaled.toFixed(scaled < 100 ? 1 : 0).replace('.', ',')}${SUFFIXES[tier]}`;
};

/** "+12" or "+4,5%" for a bonus. */
export const formatMod = (key: ModKey, value: number): string => {
  const sign = value < 0 ? '−' : '+';
  const abs = Math.abs(value);
  if (isPercent(key)) {
    const pct = abs * 100;
    return `${sign}${(Math.round(pct * 10) / 10).toString().replace('.', ',')}%`;
  }
  if (abs < 10 && !Number.isInteger(abs)) return `${sign}${abs.toFixed(1).replace('.', ',')}`;
  return `${sign}${formatBig(abs)}`;
};

export const formatDuration = (ms: number): string => {
  const min = Math.floor(ms / 60000);
  const h = Math.floor(min / 60);
  if (h > 0) return `${h}h ${String(min % 60).padStart(2, '0')}min`;
  if (min > 0) return `${min}min`;
  return `${Math.max(1, Math.floor(ms / 1000))}s`;
};
