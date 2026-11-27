import React, { CSSProperties, ReactNode, useEffect, useState } from 'react';
import { Icon, Icons } from 'folds';
import { Card, formatChips } from './poker/types';
import { PlayingCard } from './poker/table/PlayingCard';
import { TopUpButton } from './credits/TopUpButton';
import { useCredits } from './credits/useCredits';
import * as css from './gamesHub.css';
import { gameButton } from './ui/gameUi.css';
import { LobbyScope, StageScope } from './ui/gameTheme.css';
import { tr } from '../translation/tr';
import { GameKind } from './table-games/types';
import { gameName } from './table-games/text';
import { LiveTable, useLiveTables } from './useLiveTables';
import { liveGameName, liveStatus } from './liveText';
import { gameStatus } from './hubStatus';
import { PeopleStack } from './ui/PeopleStack';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import trucoArt from './art/truco.webp';
import trucoBarArt from './art/truco-bar.webp';
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

// How many tables sit beside the banner before "Show all".
const SIDE_ROWS = 3;

type GamesHubProps = {
  onOpenPoker: () => void;
  onOpenIdle: () => void;
  onOpenHorde: () => void;
  onOpenFootball: () => void;
  onOpenTableGame: (kind: GameKind) => void;
  onOpenPokerTable: (tableId: string) => void;
  onOpenGameTable: (kind: GameKind, tableId: string) => void;
  onOpenFootballMatch: (matchId: string) => void;
  onBack?: () => void;
};

const LIVE_ART: Partial<Record<LiveTable['game'], string>> = {
  truco: trucoArt,
  fodinha: fodinhaArt,
  chess: chessArt,
};

// The banner wants a scene, not a tile: Truco has the bar the table is drawn in.
const HERO_ART: Partial<Record<LiveTable['game'], string>> = {
  ...LIVE_ART,
  truco: trucoBarArt,
};

// A game under way that someone moved in lately; one still waiting for players isn't live yet.
const isPlayingNow = (t: LiveTable) =>
  !t.idle &&
  t.players.length > 0 &&
  t.activeAt !== undefined &&
  t.phase !== 'waiting' &&
  (t.game !== 'football' || t.score !== undefined);

const fanned = (i: number, of: number, tilt: number, drop: number): CSSProperties => {
  const mid = (of - 1) / 2;
  return { transform: `rotate(${(i - mid) * tilt}deg) translateY(${Math.abs(i - mid) * drop}px)` };
};

function RoyalFan({
  cards,
  tilt,
  drop,
  className,
}: {
  cards: Card[];
  tilt: number;
  drop: number;
  className: string;
}) {
  return (
    <>
      {cards.map((card, i) => (
        <PlayingCard
          key={`${card.rank}${card.suit}`}
          className={className}
          card={card}
          faceUp
          style={fanned(i, cards.length, tilt, drop)}
        />
      ))}
    </>
  );
}

// The same art as the game's tile, small, so a row reads as "a poker table" at a glance.
function LiveThumb({ game }: { game: LiveTable['game'] }) {
  const art = LIVE_ART[game];
  if (art) return <img className={css.LiveThumb} src={art} alt="" loading="lazy" />;
  if (game === 'football') {
    return (
      <span className={`${css.LiveThumb} ${css.LiveFootballThumb}`} aria-hidden="true">
        ⚽
      </span>
    );
  }
  return (
    <span className={`${css.LiveThumb} ${css.LivePokerThumb}`} aria-hidden="true">
      <RoyalFan cards={ROYAL.slice(3)} tilt={16} drop={0} className={css.LiveThumbCard} />
    </span>
  );
}

function HeroArt({ game }: { game: LiveTable['game'] }) {
  const art = HERO_ART[game];
  if (art) return <img className={css.HeroArt} src={art} alt="" />;
  if (game === 'football') {
    return (
      <span className={css.HeroFootballArt} aria-hidden="true">
        ⚽
      </span>
    );
  }
  return (
    <span className={css.HeroPokerArt} aria-hidden="true">
      <RoyalFan cards={ROYAL} tilt={9} drop={5} className={css.ArtCard} />
    </span>
  );
}

type CardGameProps = {
  art: ReactNode;
  name: string;
  meta: string;
  status?: string;
  mine?: boolean;
  onOpen: () => void;
  // Your own table of this game: the card's main button goes back to it.
  onResume?: () => void;
};

function CardGame({ art, name, meta, status, mine, onOpen, onResume }: CardGameProps) {
  return (
    <article className={css.GameCard}>
      <button type="button" className={css.CardOpen} onClick={onOpen}>
        <span className={css.CardArt}>{art}</span>
        <span className={css.CardHead}>
          <span className={css.CardName}>{name}</span>
          <span className={css.CardMeta}>{meta}</span>
        </span>
      </button>
      <p className={css.CardStatus} data-mine={!!mine}>
        {status ?? tr('games.hub.none_going', 'No friends at a table right now')}
      </p>
      <div className={css.CardActions}>
        {onResume ? (
          <>
            <button
              type="button"
              className={`${gameButton({ variant: 'primary' })} ${css.CardMain}`}
              onClick={onResume}
            >
              {tr('games.live.resume', 'Resume')}
            </button>
            <button type="button" className={gameButton({ variant: 'secondary' })} onClick={onOpen}>
              {tr('games.hub.lobby', 'Lobby')}
            </button>
          </>
        ) : (
          <button
            type="button"
            className={`${gameButton({ variant: 'primary' })} ${css.CardMain}`}
            onClick={onOpen}
          >
            {tr('games.hub.play', 'Play')}
          </button>
        )}
      </div>
    </article>
  );
}

type MoreGameProps = {
  art: ReactNode;
  name: string;
  meta: string;
  status?: string;
  mine?: boolean;
  onOpen: () => void;
};

// The whole tile is the button: a row of identical "Play" buttons said nothing.
function MoreGame({ art, name, meta, status, mine, onOpen }: MoreGameProps) {
  return (
    <button type="button" className={css.MoreTile} onClick={onOpen}>
      <span className={css.MoreArt}>{art}</span>
      <span className={css.MoreBody}>
        <span className={css.MoreName}>{name}</span>
        <span className={css.CardMeta}>{meta}</span>
        {status && (
          <span className={css.MoreStatus} data-mine={!!mine}>
            {status}
          </span>
        )}
      </span>
    </button>
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
  onOpenFootballMatch,
  onBack,
}: GamesHubProps) {
  const mx = useMatrixClient();
  const { balance, atTables, refresh, topUp } = useCredits();
  const { tables, loaded } = useLiveTables();
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const me = mx.getUserId();
  const nameOf = (id: string) =>
    id === me
      ? tr('games.live.you', 'You')
      : mx.getUser(id)?.displayName ?? id.replace(/^@|:.*$/g, '');
  const open = (t: LiveTable) => {
    if (t.game === 'poker') onOpenPokerTable(t.tableId);
    else if (t.game === 'football') onOpenFootballMatch(t.tableId);
    else onOpenGameTable(t.game, t.tableId);
  };
  // "Go back" read like leaving the page; these say what happens at the table.
  const actionText = (t: LiveTable) =>
    ({
      seated: tr('games.live.resume', 'Resume'),
      open: tr('home.table_join', 'Join'),
      watch: tr('home.table_watch', 'Watch'),
    }[t.role]);
  const whyText = (t: LiveTable) =>
    ({
      seated: tr('games.hub.your_seat', 'Your seat'),
      invited: tr('home.table_invited', 'Invited you'),
      call: tr('home.table_call', 'In your call'),
      friend: tr('home.table_friends', 'Friends'),
    }[t.relevance]);
  const now = Date.now();
  const playing = (t: LiveTable) => {
    if (!t.players.length) return tr('games.live.nobody', 'Nobody seated');
    const names = t.players.slice(0, 3).map(nameOf).join(', ');
    const more = t.players.length > 3 ? ` +${t.players.length - 3}` : '';
    return t.seats ? `${names}${more} (${t.players.length}/${t.seats})` : `${names}${more}`;
  };

  const listed = tables.slice(0, 6);
  const [hero, ...rest] = listed;
  const side = showAll ? rest : rest.slice(0, SIDE_ROWS);

  // A card's line under its name: your own table first, then how many are going.
  const statusOf = (game: LiveTable['game']) => {
    const s = gameStatus(tables, game);
    if (!s) return { status: undefined, mine: false, onResume: undefined };
    if ('seated' in s) {
      return {
        status: tr('games.hub.at_table', 'Your table: {{name}}', { name: s.seated.name }),
        mine: true,
        onResume: () => open(s.seated),
      };
    }
    return {
      status:
        s.going === 1
          ? tr('games.hub.going_one', '1 going now')
          : tr('games.hub.going_many', '{{n}} going now', { n: s.going }),
      mine: false,
      onResume: undefined,
    };
  };
  const moreStatus = (game: LiveTable['game']) => {
    const { status, mine } = statusOf(game);
    return { status, mine };
  };

  return (
    <div className={`${css.Hub} ${LobbyScope}`}>
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
          <h2 id="live-heading" className={css.VisuallyHidden}>
            {tr('games.hub.live', 'Happening now')}
          </h2>
          {loaded && !hero && (
            <p className={css.LiveEmpty}>
              {tr(
                'games.hub.live_empty',
                'None of your friends is at a table. Pick a game below and open one.'
              )}
            </p>
          )}
          {hero && (
            <article className={`${css.Hero} ${StageScope}`} data-idle={!!hero.idle}>
              <HeroArt game={hero.game} />
              <span className={css.HeroScrim} />
              <div className={css.HeroBody}>
                <span className={css.HeroTags}>
                  {isPlayingNow(hero) && (
                    <span className={css.HeroLive}>{tr('games.live.live', 'Live')}</span>
                  )}
                  <span>
                    {liveGameName(hero.game)} · {whyText(hero)}
                  </span>
                </span>
                <h3 className={css.HeroTitle}>{hero.name}</h3>
                {hero.score && (
                  <span className={css.HeroScore}>
                    {hero.score[0]} × {hero.score[1]}
                  </span>
                )}
                <span className={css.HeroPeople}>
                  {hero.players.length > 0 && <PeopleStack userIds={hero.players} />}
                  <span>{[playing(hero), liveStatus(hero, now)].filter(Boolean).join(' · ')}</span>
                </span>
                <div className={css.HeroActions}>
                  <button
                    type="button"
                    className={gameButton({
                      variant: hero.role === 'watch' ? 'secondary' : 'primary',
                      size: 'lg',
                    })}
                    onClick={() => open(hero)}
                  >
                    {actionText(hero)}
                  </button>
                </div>
              </div>
            </article>
          )}
          {rest.length > 0 && (
            <div className={css.Side}>
              <div className={css.SideHead}>
                <h3 className={css.Overline}>{tr('games.hub.also', 'Also happening')}</h3>
                {rest.length > SIDE_ROWS && (
                  <button
                    type="button"
                    className={css.TextButton}
                    aria-expanded={showAll}
                    onClick={() => setShowAll((v) => !v)}
                  >
                    {showAll
                      ? tr('games.hub.show_less', 'Show less')
                      : tr('games.hub.show_all', 'Show all {{n}}', { n: rest.length })}
                  </button>
                )}
              </div>
              <ul className={css.LiveList}>
                {side.map((t) => (
                  <li key={t.key} className={css.LiveRow} data-role={t.role} data-idle={!!t.idle}>
                    <LiveThumb game={t.game} />
                    <span className={css.LiveInfo}>
                      <span className={css.LiveGame}>
                        {liveGameName(t.game)}
                        {t.relevance !== 'seated' && (
                          <span className={css.LiveWhy}>{whyText(t)}</span>
                        )}
                        {isPlayingNow(t) && (
                          <span className={css.LiveBadge}>{tr('games.live.live', 'Live')}</span>
                        )}
                      </span>
                      <span className={css.LiveDetail}>
                        {[t.name, liveStatus(t, now)].filter(Boolean).join(' · ')}
                      </span>
                      <span className={css.LiveDetail}>{playing(t)}</span>
                    </span>
                    <button
                      type="button"
                      className={gameButton({
                        variant: t.role === 'watch' ? 'secondary' : 'primary',
                        size: 'sm',
                      })}
                      onClick={() => open(t)}
                    >
                      {actionText(t)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className={css.GameSection} aria-labelledby="card-games-heading">
          <div className={css.SectionHead}>
            <h2 id="card-games-heading" className={css.SectionTitle}>
              {tr('games.hub.card_games', 'Card games')}
            </h2>
            <span className={css.WalletNote}>
              <span className={css.NoteCoin} aria-hidden="true">
                $
              </span>
              {tr('games.hub.card_games_note', 'Played for coins from your wallet')}
            </span>
          </div>
          <div className={css.CardGrid}>
            <CardGame
              name="Poker"
              meta={tr('games.hub.poker_short', 'Hold’em · 2–6')}
              onOpen={onOpenPoker}
              {...statusOf('poker')}
              art={
                <span className={css.PokerArt}>
                  <RoyalFan cards={ROYAL} tilt={9} drop={4} className={css.ArtCard} />
                </span>
              }
            />
            <CardGame
              name="Truco"
              meta={tr('games.hub.truco_short', 'Paulista · 4 in pairs')}
              onOpen={() => onOpenTableGame('truco')}
              {...statusOf('truco')}
              art={<img className={css.TileImg} src={trucoArt} alt="" loading="lazy" />}
            />
            <CardGame
              name="Fodinha"
              meta={tr('games.hub.fodinha_short', 'Predictions · 3–6')}
              onOpen={() => onOpenTableGame('fodinha')}
              {...statusOf('fodinha')}
              art={<img className={css.TileImg} src={fodinhaArt} alt="" loading="lazy" />}
            />
          </div>
        </section>

        <section className={css.GameSection} aria-labelledby="more-games-heading">
          <h2 id="more-games-heading" className={css.SectionTitle}>
            {tr('games.hub.more_games', 'More games')}
          </h2>
          <div className={css.MoreGrid}>
            <MoreGame
              name={gameName('chess')}
              meta={tr('games.hub.chess_short', 'Free · 2 players')}
              onOpen={() => onOpenTableGame('chess')}
              {...moreStatus('chess')}
              art={<img className={css.TileImg} src={chessArt} alt="" loading="lazy" />}
            />
            <MoreGame
              name={tr('football.title', 'FIFUMA')}
              meta={tr('games.hub.football_short', '3D football')}
              onOpen={onOpenFootball}
              {...moreStatus('football')}
              art={
                <span className={`${css.IdleArt} ${css.FootballArt}`}>
                  {['⚽', '🥅', '🏆'].map((icon) => (
                    <span key={icon} className={css.IdleArtIcon}>
                      {icon}
                    </span>
                  ))}
                </span>
              }
            />
            <MoreGame
              name="BrazilianBonk"
              meta={tr('games.hub.horde_short', '3D roguelike')}
              onOpen={onOpenHorde}
              art={<img className={css.TileImg} src={hordeArt} alt="" loading="lazy" />}
            />
            <MoreGame
              name={tr('games.idle.title', 'Ember Chronicles')}
              meta={tr('games.hub.idle_genre', 'Idle RPG')}
              onOpen={onOpenIdle}
              art={
                <span className={css.IdleArt}>
                  {['⚔️', '🔮', '🏹', '🐉'].map((icon) => (
                    <span key={icon} className={css.IdleArtIcon}>
                      {icon}
                    </span>
                  ))}
                </span>
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}
