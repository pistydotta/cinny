import React, { CSSProperties, useEffect } from 'react';
import { Icon, Icons } from 'folds';
import { Card, formatChips } from './poker/types';
import { PlayingCard } from './poker/table/PlayingCard';
import { ChipStack } from './poker/table/Chips';
import { TopUpButton } from './credits/TopUpButton';
import { useCredits } from './credits/useCredits';
import * as css from './gamesHub.css';
import { tr } from '../translation/tr';
import { GameKind } from './table-games/types';
import { gameName } from './table-games/text';
import trucoArt from './art/truco.webp';
import fodinhaArt from './art/fodinha.webp';
import chessArt from './art/chess.webp';
import { HubArt } from './horde/horde.css';
import { HERO_SPRITES } from './horde/sprites';

const ROYAL: Card[] = [
  { rank: 10, suit: 's' },
  { rank: 11, suit: 's' },
  { rank: 12, suit: 's' },
  { rank: 13, suit: 's' },
  { rank: 14, suit: 's' },
];

type GamesHubProps = {
  onOpenPoker: () => void;
  onOpenIdle: () => void;
  onOpenHorde: () => void;
  onOpenTableGame: (kind: GameKind) => void;
  onBack?: () => void;
};

export function GamesHub({
  onOpenPoker,
  onOpenIdle,
  onOpenHorde,
  onOpenTableGame,
  onBack,
}: GamesHubProps) {
  const { balance, atTables, refresh, topUp } = useCredits();

  useEffect(() => {
    refresh();
  }, [refresh]);

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
              {tr('games.hub.subtitle', 'Pick a game and start playing.')}
            </p>
          </div>
        </div>

        <section className={css.GameSection} aria-labelledby="card-games-heading">
          <div>
            <h2 id="card-games-heading" className={css.SectionTitle}>
              {tr('games.hub.card_games', 'Card games')}
            </h2>
            <p className={css.Subtitle}>
              {tr('games.hub.card_credits', 'Credits are shared only between card games.')}
            </p>
          </div>
          <div className={css.WalletCard}>
            <div className={css.BigCoin}>$</div>
            <div className={css.WalletInfo}>
              <span className={css.WalletLabel}>
                {tr('games.wallet.card_games', 'Card-game wallet')}
              </span>
              <span className={css.WalletBalance}>
                {tr('games.wallet.coins', '{{coins}} coins', {
                  coins: balance === undefined ? '—' : formatChips(balance),
                })}
              </span>
              {atTables > 0 && (
                <span className={css.WalletHint}>
                  {tr(
                    'games.wallet.at_tables_hint',
                    '{{coins}} coins are reserved at card-game tables. Stakes are settled when the game ends.',
                    { coins: formatChips(atTables) }
                  )}
                </span>
              )}
            </div>
            <TopUpButton atTables={atTables} topUp={topUp} className={css.WalletTopUp} />
          </div>

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

            {(['truco', 'fodinha'] as const).map((kind) => (
              <div key={kind} className={css.GameCard} data-playable="true">
                <img
                  className={css.GameArtwork}
                  src={kind === 'truco' ? trucoArt : fodinhaArt}
                  alt=""
                  loading="lazy"
                />
                <div className={css.CardBody}>
                  <span className={css.GameName}>{gameName(kind)}</span>
                  <span className={css.GameMeta}>
                    {kind === 'truco'
                      ? tr(
                          'table_games.truco_meta',
                          'Paulista · 4 players in pairs · fixed table stake'
                        )
                      : tr(
                          'table_games.fodinha_meta',
                          'Predictions and elimination · 3–6 players · fixed table stake'
                        )}
                  </span>
                  <button
                    type="button"
                    className={css.PlayButton}
                    onClick={() => onOpenTableGame(kind)}
                  >
                    {tr('games.hub.play', 'Play')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={css.GameSection} aria-labelledby="board-games-heading">
          <h2 id="board-games-heading" className={css.SectionTitle}>
            {tr('table_games.board_games', 'Board games')}
          </h2>
          <div className={css.Grid}>
            <div className={css.GameCard} data-playable="true">
              <img className={css.GameArtwork} src={chessArt} alt="" loading="lazy" />
              <div className={css.CardBody}>
                <span className={css.GameName}>{gameName('chess')}</span>
                <span className={css.GameMeta}>
                  {tr(
                    'table_games.chess_meta',
                    'Free · 2 players · watch and comment on live tables'
                  )}
                </span>
                <button
                  type="button"
                  className={css.PlayButton}
                  onClick={() => onOpenTableGame('chess')}
                >
                  {tr('games.hub.play', 'Play')}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className={css.GameSection} aria-labelledby="action-games-heading">
          <div>
            <h2 id="action-games-heading" className={css.SectionTitle}>
              {tr('games.hub.action_games', 'Action')}
            </h2>
            <p className={css.Subtitle}>
              {tr(
                'games.hub.horde_currency',
                'Runs pay gold for upgrades in this game. It is separate from card-game credits.'
              )}
            </p>
          </div>
          <div className={css.Grid}>
            <div className={css.GameCard} data-playable="true">
              <div className={HubArt}>
                {Object.entries(HERO_SPRITES).map(([id, sheet]) => (
                  <span key={id} style={{ backgroundImage: `url(${sheet})` }} />
                ))}
              </div>
              <div className={css.CardBody}>
                <span className={css.GameName}>BrazilianBonk</span>
                <span className={css.GameMeta}>
                  {tr(
                    'games.hub.horde_meta',
                    '3D roguelike · survive the horde, stack weapons and beat the boss'
                  )}
                </span>
                <button type="button" className={css.PlayButton} onClick={onOpenHorde}>
                  {tr('games.hub.play', 'Play')}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className={css.GameSection} aria-labelledby="idle-games-heading">
          <div>
            <h2 id="idle-games-heading" className={css.SectionTitle}>
              {tr('games.hub.idle_games', 'Idle RPG')}
            </h2>
            <p className={css.Subtitle}>
              {tr(
                'games.hub.idle_currency',
                'Your hero earns gold in this game. It is separate from card-game credits.'
              )}
            </p>
          </div>
          <div className={css.Grid}>
            <div className={css.GameCard} data-playable="true">
              <div className={css.IdleArt}>
                {['⚔️', '🔮', '🏹', '🐉', '🗡️'].map((icon, i) => (
                  <span
                    key={icon}
                    className={css.IdleArtIcon}
                    style={{ transform: `translateY(${Math.abs(i - 2) * 8}px)` }}
                  >
                    {icon}
                  </span>
                ))}
              </div>
              <div className={css.CardBody}>
                <span className={css.GameName}>{tr('games.idle.title', 'Ember Chronicles')}</span>
                <span className={css.GameMeta}>
                  {tr(
                    'games.hub.idle_meta',
                    'Idle RPG · 6 classes and 12 specializations, forge, rebirth and arena'
                  )}
                </span>
                <button type="button" className={css.PlayButton} onClick={onOpenIdle}>
                  {tr('games.hub.play', 'Play')}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
