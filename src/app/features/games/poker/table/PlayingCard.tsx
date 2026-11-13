import React, { CSSProperties } from 'react';
import { Card, isRedSuit, RANK_LABEL, suitName, SUIT_SYMBOL } from '../types';
import { tr } from '../../../translation/tr';
import { GameCard } from '../../cards/GameCard';

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

export function PlayingCard({ card, ...props }: PlayingCardProps) {
  return (
    <GameCard
      face={
        card && {
          rank: RANK_LABEL[card.rank],
          suit: SUIT_SYMBOL[card.suit],
          red: isRedSuit(card.suit),
          label: tr('games.table.card', '{{rank}} of {{suit}}', {
            rank: RANK_LABEL[card.rank],
            suit: suitName(card.suit),
          }),
        }
      }
      {...props}
    />
  );
}
