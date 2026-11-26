import React, { CSSProperties, ReactNode, useEffect } from 'react';
import { Icon, Icons } from 'folds';
import { Card, formatChips } from './poker/types';
import { PlayingCard } from './poker/table/PlayingCard';
import { TopUpButton } from './credits/TopUpButton';
import { useCredits } from './credits/useCredits';
import * as css from './gamesHub.css';
import { tr } from '../translation/tr';
import { GameKind } from './table-games/types';
import { gameName, phaseText } from './table-games/text';
import { LiveTable, useLiveTables } from './useLiveTables';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import trucoArt from './art/truco.webp';
import fodinhaArt from './art/fodinha.webp';
import chessArt from './art/chess.webp';
import hordeArt from './art/brazilianbonk.webp';

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
  onOpenFootball: () => void;
  onOpenTableGame: (kind: GameKind) => void;
  onOpenPokerTable: (tableId: string) => void;
  onOpenGameTable: (kind: GameKind, tableId: string) => void;
  onBack?: () => void;
};

type TileProps = {
  art: ReactNode;
  name: string;
  meta: string;
  stakes?: boolean;
  onOpen: () => void;
};

// The whole tile is the button: a row of identical "Play" buttons said nothing.
function Tile({ art, name, meta, stakes, onOpen }: TileProps) {
  return (
    <button type="button" className={css.Tile} onClick={onOpen}>
      <div className={css.TileArt}>{art}</div>
      <span className={css.TileName}>
        {name}
        {stakes && (
          <span
            className={css.StakeMark}
            title={tr('games.hub.uses_wallet', 'Uses the card-game wallet')}
          >
            $
          </span>
        )}
      </span>
      <span className={css.TileMeta}>{meta}</span>
    </button>
  );
}

const gameLabel = (game: LiveTable['game']) => (game === 'poker' ? 'Poker' : gameName(game));

const LIVE_ART: Partial<Record<LiveTable['game'], string>> = {
  truco: trucoArt,
  fodinha: fodinhaArt,
  chess: chessArt,
};

// The same art as the game's tile, small, so a row reads as "a poker table" at a glance.
function LiveThumb({ game }: { game: LiveTable['game'] }) {
  const art = LIVE_ART[game];
  if (art) return <img className={css.LiveThumb} src={art} alt="" loading="lazy" />;
  return (
    <span className={`${css.LiveThumb} ${css.LivePokerThumb}`} aria-hidden="true">
      {ROYAL.slice(3).map((card, i) => (
        <PlayingCard
          key={`${card.rank}${card.suit}`}
          className={css.LiveThumbCard}
          card={card}
          faceUp
          style={{ transform: `rotate(${i ? 8 : -8}deg)` } as CSSProperties}
        />
      ))}
    </span>
  );
}

export function GamesHub({
  onOpenPoker,
  onOpenIdle,
  onOpenHorde,
  onOpenFootball,
  onOpenTableGame,
  onOpenPokerTable,
  onOpenGameTable,
  onBack,
}: GamesHubProps) {
  const mx = useMatrixClient();
  const { balance, atTables, refresh, topUp } = useCredits();
  const { tables, loaded } = useLiveTables();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const nameOf = (id: string) => mx.getUser(id)?.displayName ?? id.replace(/^@|:.*$/g, '');
  const open = (t: LiveTable) =>
    t.game === 'poker' ? onOpenPokerTable(t.tableId) : onOpenGameTable(t.game, t.tableId);
  // The same words as the home page's "Happening now", which lists these tables too.
  const actionText = (t: LiveTable) =>
    ({
      seated: tr('home.table_back', 'Go back'),
      open: tr('home.table_join', 'Join'),
      watch: tr('home.table_watch', 'Watch'),
    }[t.role]);
  const whyText = (t: LiveTable) =>
    ({
      seated: '',
      invited: tr('home.table_invited', 'Invited you'),
      call: tr('home.table_call', 'In your call'),
      friend: tr('home.table_friends', 'Friends'),
    }[t.relevance]);
  const detail = (t: LiveTable) => {
    const parts: string[] = [];
    if (t.players.length) parts.push(t.players.map(nameOf).join(', '));
    if (t.seats) parts.push(`${t.players.length}/${t.seats}`);
    if (t.idle && t.activeAt !== undefined)
      parts.push(
        tr('table_games.idle_for', 'Stopped for {{n}} min', {
          n: Math.floor((Date.now() - t.activeAt) / 60_000),
        })
      );
    else if (t.phase) parts.push(phaseText(t.phase));
    return parts.join(' · ');
  };

  return (
    <div className={css.Hub}>
      <div className={css.HubInner}>
        <header className={css.HubHeader}>
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
          <h1 className={css.Title}>{tr('games.nav.games', 'Games')}</h1>
          <div className={css.WalletChip}>
            <span className={css.ChipCoin} aria-hidden="true">
              $
            </span>
            <span className={css.ChipText}>
              {/* The coin already says what the number is; the word stays for screen readers. */}
              <span
                className={css.ChipBalance}
                title={tr('games.wallet.hint', 'Coins in your wallet')}
                aria-label={tr('games.wallet.coins', '{{coins}} coins', {
                  coins: balance === undefined ? '—' : formatChips(balance),
                })}
              >
                {balance === undefined ? '—' : formatChips(balance)}
              </span>
              {atTables > 0 && (
                <span className={css.ChipHint}>
                  {tr('games.wallet.reserved', '{{coins}} at tables', {
                    coins: formatChips(atTables),
                  })}
                </span>
              )}
            </span>
            <TopUpButton atTables={atTables} topUp={topUp} className={css.ChipTopUp} compact />
          </div>
        </header>

        <section className={css.Live} aria-labelledby="live-heading">
          <h2 id="live-heading" className={css.SectionTitle}>
            {tr('games.hub.live', 'Happening now')}
          </h2>
          {loaded && !tables.length && (
            <p className={css.LiveEmpty}>
              {tr(
                'games.hub.live_empty',
                'None of your friends is at a table. Pick a game below and open one.'
              )}
            </p>
          )}
          {tables.length > 0 && (
            <ul className={css.LiveList}>
              {tables.slice(0, 6).map((t) => (
                <li key={t.key} className={css.LiveRow} data-role={t.role} data-idle={!!t.idle}>
                  <LiveThumb game={t.game} />
                  <span className={css.LiveInfo}>
                    <span className={css.LiveGame}>
                      {gameLabel(t.game)}
                      {t.relevance !== 'seated' && (
                        <span className={css.LiveWhy}>{whyText(t)}</span>
                      )}
                    </span>
                    <span className={css.LiveName}>{t.name}</span>
                    <span className={css.LiveDetail}>{detail(t)}</span>
                  </span>
                  <button
                    type="button"
                    className={t.role === 'watch' ? css.LiveWatch : css.LiveJoin}
                    onClick={() => open(t)}
                  >
                    {actionText(t)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={css.GameSection} aria-labelledby="all-games-heading">
          <h2 id="all-games-heading" className={css.SectionTitle}>
            {tr('games.hub.all_games', 'All games')}
          </h2>
          <div className={css.TileGrid}>
            <Tile
              name="Poker"
              meta={tr('games.hub.poker_short', 'Hold’em · 2–6')}
              stakes
              onOpen={onOpenPoker}
              art={
                <div className={css.PokerArt}>
                  {ROYAL.map((card, i) => (
                    <PlayingCard
                      key={`${card.rank}${card.suit}`}
                      className={css.ArtCard}
                      card={card}
                      faceUp
                      style={
                        {
                          transform: `rotate(${(i - 2) * 9}deg) translateY(${
                            Math.abs(i - 2) * 4
                          }px)`,
                        } as CSSProperties
                      }
                    />
                  ))}
                </div>
              }
            />
            <Tile
              name="Truco"
              meta={tr('games.hub.truco_short', 'Paulista · 4 in pairs')}
              stakes
              onOpen={() => onOpenTableGame('truco')}
              art={<img className={css.TileImg} src={trucoArt} alt="" loading="lazy" />}
            />
            <Tile
              name="Fodinha"
              meta={tr('games.hub.fodinha_short', 'Predictions · 3–6')}
              stakes
              onOpen={() => onOpenTableGame('fodinha')}
              art={<img className={css.TileImg} src={fodinhaArt} alt="" loading="lazy" />}
            />
            <Tile
              name={gameName('chess')}
              meta={tr('games.hub.chess_short', 'Free · 2 players')}
              onOpen={() => onOpenTableGame('chess')}
              art={<img className={css.TileImg} src={chessArt} alt="" loading="lazy" />}
            />
            <Tile
              name={tr('football.title', 'FIFUMA')}
              meta={tr('games.hub.football_short', '3D football')}
              onOpen={onOpenFootball}
              art={
                <div className={`${css.IdleArt} ${css.FootballArt}`}>
                  {['⚽', '🥅', '🏆'].map((icon) => (
                    <span key={icon} className={css.IdleArtIcon}>
                      {icon}
                    </span>
                  ))}
                </div>
              }
            />
            <Tile
              name="BrazilianBonk"
              meta={tr('games.hub.horde_short', '3D roguelike')}
              onOpen={onOpenHorde}
              art={<img className={css.TileImg} src={hordeArt} alt="" loading="lazy" />}
            />
            <Tile
              name={tr('games.idle.title', 'Ember Chronicles')}
              meta={tr('games.hub.idle_genre', 'Idle RPG')}
              onOpen={onOpenIdle}
              art={
                <div className={css.IdleArt}>
                  {['⚔️', '🔮', '🏹', '🐉'].map((icon) => (
                    <span key={icon} className={css.IdleArtIcon}>
                      {icon}
                    </span>
                  ))}
                </div>
              }
            />
          </div>
          <p className={css.Footnote}>
            {tr(
              'games.hub.wallet_note',
              'Games marked $ share the card-game wallet. The others keep their own progress.'
            )}
          </p>
        </section>
      </div>
    </div>
  );
}
