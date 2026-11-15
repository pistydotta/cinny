import { tr } from '../../../translation/tr';
import type { CoachAdvice, CoachSize, CoachStats, ReviewDecision } from '../types';

// The API sends keys; the sentences live here so they follow the app's language.

const REASON_EN: Record<string, string> = {
  pf_open: 'This hand is in your opening range for this position: raise first in.',
  pf_iso: 'Good enough to raise over the limpers and play the pot in control.',
  pf_fold_range: 'Below the opening range for this position.',
  pf_check_bb: 'Take the free flop.',
  pf_complete: 'Cheap to complete the small blind with a playable hand.',
  pf_shove: 'Short stack: it is all-in or fold, and this hand is an all-in.',
  pf_shove_fold: 'Short stack: it is all-in or fold, and this hand is a fold.',
  pf_3bet: 'Premium hand: re-raise for value.',
  pf_call_raise: 'Strong enough to call the raise, not to re-raise.',
  pf_call_odds: 'In the big blind the price is good enough to defend.',
  pf_fold_raise: 'Not strong enough against a raise.',
  value_big: 'Strong hand on a board full of draws: bet big so the draws pay.',
  value_big_river: 'Very strong on the river: worse hands still call a big bet.',
  value_std: 'Strong hand: bet for value.',
  value_thin: 'Medium hand: a small bet gets called by worse. Fold to a raise.',
  cbet: 'You raised before the flop and the board is dry: a small continuation bet.',
  check_weak: 'Not enough hand to bet.',
  check_multi: 'A medium hand against several players: keep the pot small.',
  raise_value: 'Ahead of most hands that bet here: raise for value.',
  call_odds: 'Your share of the pot beats the price of the call.',
  fold_odds: 'The price is too high for your chances.',
  shove_spr: 'The pot is already big next to the stacks: all-in.',
};

const VERDICT_EN: Record<string, string> = {
  v_good: 'Matches the suggestion.',
  v_ok: 'A reasonable alternative.',
  v_fold_free: 'Folded when checking was free.',
  v_fold_odds: 'Folded with enough equity to call.',
  v_call_odds: 'Called without the odds.',
  v_call_raise: 'Calling is fine, but raising gets more value.',
  v_missed_value: 'Checked a strong hand: missed value.',
  v_passive: 'Checked a hand worth raising.',
  v_size_small: 'Too small: a strong hand wants more in the pot.',
  v_size_big: 'Too big: only better hands call that size.',
  v_size_good: 'Good size.',
  v_bluff: 'A bet without a made hand: a bluff.',
  v_limp: 'Limped in: raising or folding is usually better.',
  v_loose: 'Outside the range for this position.',
  v_tight: 'Folded a hand that is in range here.',
  v_shove_missed: 'Short stack: this was an all-in.',
};

const POSITION_EN: Record<string, string> = {
  ep: 'Early position',
  mp: 'Middle position',
  hj: 'Hijack',
  co: 'Cutoff',
  btn: 'Button',
  sb: 'Small blind',
  bb: 'Big blind',
};

const PURPOSE_EN: Record<string, string> = {
  thin: 'thin value',
  value: 'value',
  strong: 'strong value',
  polar: 'very strong or bluff',
  open: 'open',
  iso: 'isolate',
  threebet: 're-raise',
  shove: 'all-in',
};

const SIZE_LABEL: Record<string, string> = {
  third: '⅓',
  half: '½',
  big: '¾',
  pot: 'Pot',
  raise_small: '2.5×',
  raise_big: '3.5×',
};

const STREET_EN: Record<string, string> = {
  preflop: 'Preflop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
};

const TEXTURE_EN: Record<string, string> = {
  dry: 'dry',
  wet: 'with draws',
  paired: 'paired',
};

const lookup = (group: string, table: Record<string, string>, key: string): string =>
  table[key] === undefined ? key : tr(`tourney.${group}.${key}`, table[key]);

export const reasonText = (key: string): string => lookup('reason', REASON_EN, key);
export const verdictText = (key: string): string => lookup('verdict', VERDICT_EN, key);
export const positionText = (key: string | null): string =>
  key === null ? '' : lookup('position', POSITION_EN, key);
export const purposeText = (key: string): string => lookup('purpose', PURPOSE_EN, key);
export const streetText = (key: string): string => lookup('street', STREET_EN, key);
export const textureText = (key: string | null): string =>
  key === null ? '' : lookup('texture', TEXTURE_EN, key);

/** "⅓ · 150" after the flop, just the amount before it. */
export const sizeText = (size: CoachSize, amount: string): string => {
  if (size.key === 'allin') return tr('games.action.allin', 'All-in');
  const label = SIZE_LABEL[size.key];
  return label ? `${label} · ${amount}` : amount;
};

type ActionLike =
  | Pick<CoachAdvice, 'action' | 'amount'>
  | Pick<ReviewDecision, 'action' | 'amount'>;

/** "Raise to 450", "Call 120", "Check"... with the amount already formatted by the caller. */
export const actionText = (
  { action, amount }: ActionLike,
  format: (chips: number) => string
): string => {
  const chips = amount ? format(amount) : '';
  switch (action) {
    case 'fold':
      return tr('games.action.fold', 'Fold');
    case 'check':
      return tr('games.action.check', 'Check');
    case 'call':
      return chips
        ? tr('tourney.action.call', 'Call {{chips}}', { chips })
        : tr('games.action.call', 'Call');
    case 'bet':
      return tr('tourney.action.bet', 'Bet {{chips}}', { chips });
    case 'raise':
      return tr('tourney.action.raise', 'Raise to {{chips}}', { chips });
    default:
      return tr('games.action.allin', 'All-in');
  }
};

export const percent = (share: number): string => `${Math.round(share * 100)}%`;

const ratio = (part: number, whole: number): string => (whole > 0 ? percent(part / whole) : '—');

/** The report's headline numbers, as label and value pairs. */
export const reportRows = (
  stats: CoachStats,
  hands: number
): { label: string; value: string }[] => {
  const aggressive = stats.bets + stats.raises;
  return [
    {
      label: tr('tourney.report.vpip', 'Hands played (VPIP)'),
      value: ratio(stats.vpip, hands),
    },
    {
      label: tr('tourney.report.pfr', 'Raised before the flop (PFR)'),
      value: ratio(stats.pfr, hands),
    },
    {
      label: tr('tourney.report.aggression', 'Bets and raises per call'),
      value: stats.calls > 0 ? (aggressive / stats.calls).toFixed(1) : String(aggressive),
    },
    {
      label: tr('tourney.report.value_bluff', 'Bets for value / as a bluff'),
      value: `${stats.valueBets} / ${stats.bluffs}`,
    },
    {
      label: tr('tourney.report.showdowns', 'Showdowns won'),
      value: `${stats.showdownWins} / ${stats.showdowns}`,
    },
    {
      label: tr('tourney.report.decisions', 'Decisions: good / watch / mistake'),
      value: `${stats.good} / ${stats.warn} / ${stats.bad}`,
    },
  ];
};
