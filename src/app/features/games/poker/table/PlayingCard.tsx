import React, { CSSProperties } from 'react';
import classNames from 'classnames';
import { Card, isRedSuit, RANK_LABEL, suitName, SUIT_SYMBOL } from '../types';
import { tr } from '../../../translation/tr';
import * as css from './pokerTable.css';

type PlayingCardProps = {
  card?: Card;
  faceUp: boolean;
  /** `deal` flies the card in from the dealer, `flip` turns it over when it appears. */
  anim?: 'deal' | 'flip';
  delayMs?: number;
  highlight?: boolean;
  dim?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function PlayingCard({
  card,
  faceUp,
  anim,
  delayMs,
  highlight,
  dim,
  className,
  style,
}: PlayingCardProps) {
  const showFace = faceUp && !!card;
  const faceDown = tr('games.table.face_down', 'Face-down card');
  const label = card
    ? tr('games.table.card', '{{rank}} of {{suit}}', {
        rank: RANK_LABEL[card.rank],
        suit: suitName(card.suit),
      })
    : faceDown;

  return (
    <div
      className={classNames(css.Card, className)}
      data-anim={anim === 'deal' ? 'deal' : undefined}
      data-highlight={highlight || undefined}
      data-dim={dim || undefined}
      style={{ ...style, ['--delay' as string]: `${delayMs ?? 0}ms` }}
      role="img"
      aria-label={showFace ? label : faceDown}
    >
      <div
        className={css.CardInner}
        data-face={showFace ? 'up' : 'down'}
        data-anim={anim === 'flip' && showFace ? 'flip' : undefined}
      >
        {card && (
          <div className={css.CardFront} data-red={isRedSuit(card.suit)}>
            <span className={css.CardRank}>{RANK_LABEL[card.rank]}</span>
            <span className={css.CardCornerSuit}>{SUIT_SYMBOL[card.suit]}</span>
            <span className={css.CardBigSuit}>{SUIT_SYMBOL[card.suit]}</span>
          </div>
        )}
        <div className={css.CardBack} />
      </div>
    </div>
  );
}
