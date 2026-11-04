import React, { useState } from 'react';
import { tr } from '../../../translation/tr';
import { handText } from '../logText';
import type { Card, TableView, ViewPlayer } from '../types';
import { PlayingCard } from '../table/PlayingCard';
import { exampleCards, HAND_TYPES, handTypeRank, personalCardsUsed } from './handRanks';
import * as css from '../pokerPage.css';
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

export function HandGuide({ view, hero }: { view: TableView; hero: ViewPlayer }) {
  const [open, setOpen] = useState(false);
  const rank = view.myHand ? handTypeRank(view.myHand.key) : undefined;
  const best = view.myHandCards ?? [];
  const used = personalCardsUsed(best, hero.holeCards);
  return (
    <>
      {view.myHand && (
        <div className={css.HandPreview}>
          <div className={css.FieldHeader}>
            <strong>{handText(view.myHand)}</strong>
            <button
              type="button"
              className={css.RankBadge}
              onClick={() => setOpen(true)}
              aria-label={tr('poker_controls.guide.open', 'Open hand rankings')}
            >
              {rank
                ? tr('poker_controls.guide.rank', '#{{rank}} of 10 hand types', { rank })
                : tr('poker_controls.guide.title', 'Poker hand rankings')}
            </button>
          </div>
          <GuideCards cards={best.length === 5 ? best : hero.holeCards} />
          <span className={css.GuideNote}>
            {best.length === 5
              ? tr(
                  'poker_controls.guide.uses',
                  'Best five: {{hole}} of your cards + {{board}} community cards.',
                  { hole: used, board: 5 - used }
                )
              : tr(
                  'poker_controls.guide.preflop',
                  'Your hole cards. Your final hand uses the best five of seven cards.'
                )}
          </span>
        </div>
      )}
      {!view.myHand && (
        <button type="button" className={css.Preset} onClick={() => setOpen(true)}>
          {tr('poker_controls.guide.title', 'Poker hand rankings')}
        </button>
      )}
      {open && <GuideDialog current={view.myHand?.key} onClose={() => setOpen(false)} />}
    </>
  );
}
