import React, { CSSProperties } from 'react';
import { Icon, Icons } from 'folds';
import { Card, formatChips } from './poker/engine';
import { PlayingCard } from './poker/table/PlayingCard';
import { ChipStack } from './poker/table/Chips';
import { GameWallet, STARTING_BALANCE } from './wallet/gameWallet';
import * as css from './gamesHub.css';
import { tr } from '../translation/tr';

const ROYAL: Card[] = [
  { rank: 10, suit: 's' },
  { rank: 11, suit: 's' },
  { rank: 12, suit: 's' },
  { rank: 13, suit: 's' },
  { rank: 14, suit: 's' },
];

type GamesHubProps = {
  wallet: GameWallet;
  onOpenPoker: () => void;
  onBack?: () => void;
};

export function GamesHub({ wallet, onOpenPoker, onBack }: GamesHubProps) {
  return (
    <div className={css.Hub}>
      <div className={css.HubInner}>
        <div className={css.HubHeader}>
          {onBack && (
            <button
              type="button"
              className={css.BackButton}
              onClick={onBack}
              aria-label={tr('games.action.back', 'Back')}
            >
              <Icon size="200" src={Icons.ArrowLeft} />
            </button>
          )}
          <div>
            <h1 className={css.Title}>{tr('games.nav.games', 'Games')}</h1>
            <p className={css.Subtitle}>
              {tr(
                'games.hub.subtitle',
                'Play with your coins. Your balance is shared by every game.'
              )}
            </p>
          </div>
        </div>

        <div className={css.WalletCard}>
          <div className={css.BigCoin}>$</div>
          <div className={css.WalletInfo}>
            <span className={css.WalletLabel}>{tr('games.wallet.yours', 'Your wallet')}</span>
            <span className={css.WalletBalance}>
              {tr('games.wallet.coins', '{{coins}} coins', {
                coins: wallet.ready ? formatChips(wallet.balance) : '—',
              })}
            </span>
            <span className={css.WalletHint}>
              {wallet.atTable > 0
                ? tr(
                    'games.wallet.at_tables_hint',
                    '{{coins}} coins are at a table and come back when you leave it.',
                    { coins: formatChips(wallet.atTable) }
                  )
                : tr(
                    'games.wallet.starting_hint',
                    'Every new account starts with {{coins}} coins.',
                    {
                      coins: formatChips(STARTING_BALANCE),
                    }
                  )}
            </span>
          </div>
        </div>

        <h2 className={css.SectionTitle}>{tr('games.hub.pick', 'Pick a game')}</h2>
        <div className={css.Grid}>
          <div className={css.GameCard} data-playable="true">
            <div className={css.PokerArt}>
              {ROYAL.map((card, i) => (
                <PlayingCard
                  key={`${card.rank}${card.suit}`}
                  className={css.ArtCard}
                  card={card}
                  faceUp
                  style={
                    {
                      transform: `rotate(${(i - 2) * 9}deg) translateY(${Math.abs(i - 2) * 6}px)`,
                    } as CSSProperties
                  }
                />
              ))}
              <div className={css.ArtChips}>
                <ChipStack amount={1625} />
                <ChipStack amount={525} />
              </div>
            </div>
            <div className={css.CardBody}>
              <span className={css.GameName}>Poker</span>
              <span className={css.GameMeta}>
                {tr('games.hub.poker_meta', 'No-limit Texas Hold’em · 2 to 6 players')}
              </span>
              <button type="button" className={css.PlayButton} onClick={onOpenPoker}>
                {tr('games.hub.play', 'Play')}
              </button>
            </div>
          </div>

          <div className={css.GameCard}>
            <div className={css.SoonArt}>?</div>
            <div className={css.CardBody}>
              <span className={css.GameName}>{tr('games.hub.more', 'More games')}</span>
              <span className={css.GameMeta}>
                {tr('games.hub.more_meta', 'New games will use the same wallet.')}
              </span>
              <button type="button" className={css.PlayButton} disabled>
                {tr('games.hub.soon', 'Coming soon')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
