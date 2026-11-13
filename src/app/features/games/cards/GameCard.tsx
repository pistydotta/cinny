import React, { CSSProperties } from 'react';
import classNames from 'classnames';
import { tr } from '../../translation/tr';
import * as css from './card.css';

export type CardFace = {
  /** What the corner shows: 'A', '7', '10', 'K', or '★' for a joker. */
  rank: string;
  /** The suit's symbol; a joker leaves the corner without one. */
  suit: string;
  red: boolean;
  /** Read aloud instead of the picture, e.g. "K of spades". */
  label: string;
};

type GameCardProps = {
  /** Omitted, or `faceUp` false, draws the back. */
  face?: CardFace;
  faceUp?: boolean;
  /** `deal` flies the card in from the dealer, `flip` turns it over when it appears. */
  anim?: 'deal' | 'flip';
  delayMs?: number;
  highlight?: boolean;
  dim?: boolean;
  win?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** The playing card of every card game: same face, back and sizes everywhere. */
export function GameCard({
  face,
  faceUp = true,
  anim,
  delayMs,
  highlight,
  dim,
  win,
  className,
  style,
}: GameCardProps) {
  const showFace = faceUp && !!face;
  return (
    <div
      className={classNames(css.Card, className)}
      data-anim={anim === 'deal' ? 'deal' : undefined}
      data-highlight={highlight || undefined}
      data-dim={dim || undefined}
      data-win={win || undefined}
      data-back={!showFace}
      style={delayMs ? { ...style, ['--delay' as string]: `${delayMs}ms` } : style}
      role="img"
      aria-label={showFace ? face.label : tr('games.table.face_down', 'Face-down card')}
    >
      <div
        className={css.CardInner}
        data-face={showFace ? 'up' : 'down'}
        data-anim={anim === 'flip' && showFace ? 'flip' : undefined}
      >
        {face && (
          <div className={css.CardFront} data-red={face.red}>
            <span className={css.CardRank}>{face.rank}</span>
            {face.suit !== '★' && <span className={css.CardCornerSuit}>{face.suit}</span>}
            <span className={css.CardBigSuit}>{face.suit}</span>
          </div>
        )}
        <div className={css.CardBack} />
      </div>
    </div>
  );
}
