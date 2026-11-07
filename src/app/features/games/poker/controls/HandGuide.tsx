import React, { useState } from 'react';
import { tr } from '../../../translation/tr';
import { handText } from '../logText';
import type { Card, TableView, ViewPlayer } from '../types';
import { PlayingCard } from '../table/PlayingCard';
import { exampleCards, HAND_TYPES, handTypeRank, personalCardsUsed } from './handRanks';
import * as css from '../pokerPage.css';
import * as bar from './actionBar.css';
import { PokerModal } from './PokerModal';

export function GuideCards({ cards }: { cards: Card[] }) {
  return (
    <div className={css.GuideCards}>
      {cards.map((card) => (
        <PlayingCard key={`${card.rank}${card.suit}`} card={card} faceUp />
      ))}
    </div>
  );
}

export function GuideDialog({ current, onClose }: { current?: string; onClose: () => void }) {
  return (
    <PokerModal title={tr('poker_controls.guide.title', 'Poker hand rankings')} onClose={onClose}>
      <p className={css.DialogText}>
        {tr(
          'poker_controls.guide.explanation',
          '#1 is the strongest hand type. This is not your position at this table: opponents’ cards are hidden. Within a type, higher cards and kickers decide; equal best five cards tie.'
        )}
      </p>
      <ol className={css.HandLadder}>
        {HAND_TYPES.map((hand, index) => (
          <li
            key={hand.key}
            className={css.HandLadderRow}
            aria-current={current === hand.key ? 'true' : undefined}
          >
            <strong>#{index + 1}</strong>
            <div>
              <strong>{tr(`poker_controls.guide.${hand.key}.title`, hand.title)}</strong>
              <p className={css.GuideNote}>
                {tr(`poker_controls.guide.${hand.key}.description`, hand.description)}
              </p>
              <GuideCards cards={exampleCards(hand.example)} />
            </div>
          </li>
        ))}
      </ol>
    </PokerModal>
  );
}

/** The hero's cards, hand name and a link to the rankings, as the action bar shows them. */
export function HandGuide({ view, hero }: { view: TableView; hero: ViewPlayer }) {
  const [open, setOpen] = useState(false);
  const best = view.myHandCards ?? [];
  const used = personalCardsUsed(best, hero.holeCards);
  const rank = view.myHand ? handTypeRank(view.myHand.key) : undefined;
  return (
    <div className={bar.Hand}>
      {hero.holeCards.length > 0 && (
        <div className={bar.Cards}>
          {hero.holeCards.map((card) => (
            <PlayingCard key={`${card.rank}${card.suit}`} card={card} faceUp />
          ))}
        </div>
      )}
      <div className={bar.HandText}>
        {view.myHand && (
          <div
            title={
              best.length === 5
                ? tr(
                    'poker_controls.guide.uses',
                    'Best five: {{hole}} of your cards + {{board}} community cards.',
                    { hole: used, board: 5 - used }
                  )
                : tr(
                    'poker_controls.guide.preflop',
                    'Your hole cards. Your final hand uses the best five of seven cards.'
                  )
            }
          >
            {handText(view.myHand)}
            {rank ? ` · ${tr('poker_controls.guide.type_rank', 'type #{{rank}}', { rank })}` : ''}
          </div>
        )}
        <button
          type="button"
          className={bar.Link}
          onClick={() => setOpen(true)}
          aria-label={tr('poker_controls.guide.open', 'Open hand rankings')}
        >
          {tr('poker_controls.guide.link', 'Hand rankings')}
        </button>
      </div>
      {open && <GuideDialog current={view.myHand?.key} onClose={() => setOpen(false)} />}
    </div>
  );
}
