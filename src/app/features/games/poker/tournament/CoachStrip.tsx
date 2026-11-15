import React, { useEffect, useState } from 'react';
import { tr } from '../../../translation/tr';
import { formatChips, CoachHint, HandReview, TableView } from '../types';
import {
  actionText,
  percent,
  positionText,
  purposeText,
  reasonText,
  sizeText,
  streetText,
  textureText,
  verdictText,
} from './coachText';
import * as css from './tournament.css';

const HIDDEN_KEY = 'br.com.blazeroom.poker.coach.hidden.v1';

const readHidden = (): boolean => {
  try {
    return localStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
};

/** Whether the live hints are hidden, kept per browser so a player can train without them. */
export function useCoachHidden(): [boolean, (hidden: boolean) => void] {
  const [hidden, setHidden] = useState(readHidden);
  const change = (next: boolean) => {
    setHidden(next);
    try {
      localStorage.setItem(HIDDEN_KEY, next ? '1' : '0');
    } catch {
      /* Optional storage. */
    }
  };
  return [hidden, change];
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className={css.Metric}>
      <span className={css.MetricLabel}>{label}</span>
      {value}
    </span>
  );
}

type HintProps = {
  hint: CoachHint;
  format: (chips: number) => string;
  disabled: boolean;
  onPick: (amount: number) => void;
  onHide: () => void;
};

function Hint({ hint, format, disabled, onPick, onHide }: HintProps) {
  const preflop = hint.street === 'preflop';
  return (
    <>
      <div className={css.CoachHead}>
        <span className={css.CoachTag}>{tr('tourney.coach.suggestion', 'Suggestion')}</span>
        <span className={css.CoachAction}>{actionText(hint.advice, format)}</span>
        <span className={css.CoachReason}>{reasonText(hint.advice.key)}</span>
        <button type="button" className={css.CoachToggle} onClick={onHide}>
          {tr('tourney.coach.hide', 'Hide hints')}
        </button>
      </div>
      <div className={css.Metrics}>
        {hint.position && (
          <Metric
            label={tr('tourney.coach.position', 'Position')}
            value={positionText(hint.position)}
          />
        )}
        <Metric
          label={tr('tourney.coach.stack', 'Effective stack')}
          value={`${hint.effectiveBb} BB`}
        />
        {preflop && hint.chen !== null && (
          <Metric label={tr('tourney.coach.chen', 'Hand score')} value={`${hint.chen}/20`} />
        )}
        {hint.versus !== null && (
          <Metric
            label={
              hint.toCall > 0
                ? tr('tourney.coach.versus_bet', 'Against hands that bet')
                : tr('tourney.coach.versus_call', 'Against hands that call')
            }
            value={percent(hint.versus)}
          />
        )}
        <Metric
          label={tr('tourney.coach.equity', 'Against random hands')}
          value={percent(hint.equity)}
        />
        {hint.potOdds !== null && (
          <Metric
            label={tr('tourney.coach.pot_odds', 'Price of the call')}
            value={percent(hint.potOdds)}
          />
        )}
        {!preflop && hint.spr !== null && (
          <Metric label={tr('tourney.coach.spr', 'Stack to pot')} value={hint.spr.toFixed(1)} />
        )}
        {hint.texture && (
          <Metric label={tr('tourney.coach.board', 'Board')} value={textureText(hint.texture)} />
        )}
      </div>
      {hint.sizes.length > 0 && (
        <div className={css.Sizes}>
          {hint.sizes.map((size) => (
            <button
              key={size.key}
              type="button"
              className={css.Size}
              data-recommended={size.recommended}
              disabled={disabled}
              onClick={() => onPick(size.amount)}
            >
              <span className={css.SizeAmount}>{sizeText(size, format(size.amount))}</span>
              <span className={css.SizePurpose}>{purposeText(size.purpose)}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

type ReviewProps = {
  review: HandReview;
  format: (chips: number) => string;
  open: boolean;
  onToggle: () => void;
};

function Review({ review, format, open, onToggle }: ReviewProps) {
  const counts = { good: 0, warn: 0, bad: 0 };
  let lost = 0;
  review.decisions.forEach((d) => {
    counts[d.verdict.kind] += 1;
    lost += d.verdict.evLoss;
  });
  const summary = [
    counts.good && tr('tourney.review.good', '{{count}} good', { count: counts.good }),
    counts.warn && tr('tourney.review.warn', '{{count}} to watch', { count: counts.warn }),
    counts.bad && tr('tourney.review.bad', '{{count}} mistakes', { count: counts.bad }),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <div className={css.CoachHead}>
        <span className={css.CoachTag}>
          {tr('tourney.review.title', 'Review of hand #{{n}}', { n: review.hand })}
        </span>
        <span className={css.CoachAction}>
          {review.net >= 0 ? '+' : '−'}
          {format(Math.abs(review.net))}
        </span>
        <span className={css.CoachReason}>
          {summary}
          {lost > 0 &&
            ` · ${tr('tourney.review.cost', 'about {{chips}} chips given up', {
              chips: formatChips(lost),
            })}`}
        </span>
        <button type="button" className={css.CoachToggle} onClick={onToggle} aria-expanded={open}>
          {open ? tr('tourney.review.close', 'Close') : tr('tourney.review.open', 'See decisions')}
        </button>
      </div>
      {open && (
        <div className={css.Decisions}>
          {review.decisions.map((d, index) => {
            const followed = d.verdict.key === 'v_good' || d.verdict.key === 'v_size_good';
            return (
              // eslint-disable-next-line react/no-array-index-key
              <div key={index} className={css.Decision}>
                <span className={css.DecisionStreet}>{streetText(d.street)}</span>
                <span className={css.DecisionAction}>{actionText(d, format)}</span>
                <span className={css.DecisionVerdict} data-kind={d.verdict.kind}>
                  {verdictText(d.verdict.key)}{' '}
                  {!followed && (
                    <span className={css.DecisionNote}>
                      {tr('tourney.review.suggested', 'Suggested: {{action}}.', {
                        action: actionText(d.advice, format),
                      })}{' '}
                      {reasonText(d.advice.key)}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

type CoachStripProps = {
  view: TableView;
  format: (chips: number) => string;
  disabled: boolean;
  hidden: boolean;
  onHidden: (hidden: boolean) => void;
  /** Puts a suggested size in the bet box; the player still presses the button. */
  onPick: (amount: number) => void;
};

/**
 * The coach, between the felt and the action bar: the suggestion while it is the player's
 * turn, the review of the last hand they played otherwise.
 */
export function CoachStrip({ view, format, disabled, hidden, onHidden, onPick }: CoachStripProps) {
  const hint = view.tournament?.hint ?? null;
  const review = view.tournament?.review ?? null;
  const handOver = view.phase === 'complete' || view.phase === 'waiting';
  const fresh = !!review && review.hand === view.handNumber && handOver;
  const [openHand, setOpenHand] = useState<number>();

  // The review of a hand that just ended opens by itself, once.
  const reviewHand = review?.hand;
  useEffect(() => {
    if (fresh) setOpenHand(reviewHand);
  }, [fresh, reviewHand]);

  if (hint && view.legal) {
    if (hidden) {
      return (
        <div className={css.Coach}>
          <div className={css.CoachHead}>
            <span className={css.CoachTag}>{tr('tourney.coach.title', 'Coach')}</span>
            <span className={css.CoachReason}>
              {tr('tourney.coach.hidden', 'Hints are hidden. The hand review still shows after.')}
            </span>
            <button type="button" className={css.CoachToggle} onClick={() => onHidden(false)}>
              {tr('tourney.coach.show', 'Show hints')}
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className={css.Coach}>
        <Hint
          hint={hint}
          format={format}
          disabled={disabled}
          onPick={onPick}
          onHide={() => onHidden(true)}
        />
      </div>
    );
  }

  if (!review || review.decisions.length === 0) return null;
  // An old review stays one hand, then makes room for the table.
  if (review.hand < view.handNumber - 1) return null;
  const open = openHand === review.hand;
  return (
    <div className={css.Coach}>
      <Review
        review={review}
        format={format}
        open={open}
        onToggle={() => setOpenHand(open ? undefined : review.hand)}
      />
    </div>
  );
}
