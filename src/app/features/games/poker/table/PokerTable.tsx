import React, { CSSProperties, ReactNode, useMemo } from 'react';
import { tr } from '../../../translation/tr';
import { Card, formatChips, HandName, LastAction, TableView, ViewPlayer } from '../types';
import { handText } from '../logText';
import { TurnTimer } from '../turnTimer';

import { PlayingCard } from './PlayingCard';
import { ChipStack } from './Chips';
import { LAYOUTS, offset, pct, TableLayout } from './layout';
import * as css from './pokerTable.css';

const SEATS = [0, 1, 2, 3, 4, 5];
const sameCard = (a: Card, b: Card) => a.rank === b.rank && a.suit === b.suit;
const RING_RADIUS = 48;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const actionLabel = (action: LastAction): string => {
  const amount = action.amount !== undefined ? ` ${formatChips(action.amount)}` : '';
  switch (action.type) {
    case 'sb':
      return `SB${amount}`;
    case 'bb':
      return `BB${amount}`;
    case 'fold':
      return tr('games.badge.fold', 'Fold');
    case 'check':
      return tr('games.badge.check', 'Check');
    case 'call':
      return `${tr('games.badge.call', 'Call')}${amount}`;
    case 'bet':
      return `${tr('games.badge.bet', 'Bet')}${amount}`;
    case 'raise':
      return `${tr('games.badge.raise', 'Raise')}${amount}`;
    case 'allin':
      return tr('games.action.allin', 'All-in');
    default:
      return '';
  }
};

/** A translated sentence with its placeholders shown highlighted. */
const highlighted = (key: string, en: string, values: Record<string, string>): ReactNode => {
  const marked = Object.fromEntries(Object.keys(values).map((k) => [k, `\u0000${k}\u0000`]));
  return tr(key, en, marked)
    .split('\u0000')
    .map((part, index) =>
      index % 2 === 1 ? (
        // eslint-disable-next-line react/no-array-index-key
        <span key={index} className={css.ResultHighlight}>
          {values[part] ?? part}
        </span>
      ) : (
        part
      )
    );
};

const handLabel = (name?: HandName): string => (name ? handText(name) : '');

const nameHue = (name: string): number =>
  Array.from(name).reduce((hash, ch) => (hash * 31 + ch.charCodeAt(0)) % 360, 7);

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

type PlayerAvatarProps = {
  player: ViewPlayer;
  resolveAvatar?: (url: string) => string | undefined;
};

function PlayerAvatar({ player, resolveAvatar }: PlayerAvatarProps) {
  const hue = nameHue(player.name);
  const src =
    player.avatarUrl && (resolveAvatar ? resolveAvatar(player.avatarUrl) : player.avatarUrl);
  return (
    <div
      className={css.Avatar}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 70% 58%), hsl(${
          (hue + 50) % 360
        } 65% 36%))`,
      }}
    >
      {src ? (
        <img className={css.AvatarImage} src={src} alt="" draggable={false} />
      ) : (
        initials(player.name)
      )}
    </div>
  );
}

type PokerTableProps = {
  view: TableView;
  heroId?: string;
  turnTimer?: TurnTimer;
  /** Seat shown at the bottom (the local player's seat). */
  seatOffset?: number;
  /** Makes empty seats clickable. */
  onSeatClick?: (seat: number) => void;
  /** Turns stored avatar urls (e.g. mxc://) into urls the browser can load. */
  resolveAvatar?: (url: string) => string | undefined;
  layout: TableLayout;
  /** Shown in the felt when nobody is seated yet. */
  emptyLabel?: string;
};

export function PokerTable({
  view,
  heroId,
  turnTimer,
  layout,
  emptyLabel,
  seatOffset = 0,
  onSeatClick,
  resolveAvatar,
}: PokerTableProps) {
  const layoutSpec = LAYOUTS[layout];
  // Rotate the table so `seatOffset` sits at the bottom.
  const spec = {
    ...layoutSpec,
    seats: SEATS.map((seat) => layoutSpec.seats[(seat - seatOffset + 12) % 6]),
    bets: SEATS.map((seat) => layoutSpec.bets[(seat - seatOffset + 12) % 6]),
    dealer: SEATS.map((seat) => layoutSpec.dealer[(seat - seatOffset + 12) % 6]),
  };
  const { result, phase } = view;

  const contesting = view.players.filter((p) => p.status === 'active' || p.status === 'allin');
  const canStillBet = contesting.filter((p) => p.status === 'active').length;
  // Cards are turned face up at showdown, or as soon as an all-in leaves nobody able to bet.
  const allInRunOut = phase === 'street-complete' && contesting.length >= 2 && canStillBet <= 1;
  const showdown = phase === 'complete' && !!result && !result.byFold;
  const revealCards = showdown || allInRunOut;

  const winnerIds = useMemo(() => new Set(result ? Object.keys(result.payouts) : []), [result]);
  // Cards that make up the winning hand of the main pot.
  const winningCards: Card[] = useMemo(() => {
    if (!showdown || !result) return [];
    const mainWinner = result.pots[0]?.winnerIds[0];
    return (mainWinner && result.hands[mainWinner]?.cards) || [];
  }, [showdown, result]);
  const isWinningCard = (card: Card) => winningCards.some((c) => sameCard(c, card));

  // Deal order starts left of the button; used to stagger the deal animation.
  const dealOrder = useMemo(() => {
    const dealt = view.players.filter((p) => p.hasCards);
    const button = view.buttonSeat ?? 0;
    return [...dealt.filter((p) => p.seat > button), ...dealt.filter((p) => p.seat <= button)].map(
      (p) => p.seat
    );
  }, [view.players, view.buttonSeat]);

  // The server's pot includes the bets still on the felt, which are drawn apart.
  const totalPot = view.pot - view.players.reduce((sum, p) => sum + p.streetBet, 0);
  const showResult = phase === 'complete' && !!result;

  let banner: ReactNode = null;
  if (showResult && result) {
    const mainPot = result.pots[0];
    const names = mainPot.winnerIds.map((id) => view.players.find((p) => p.id === id)?.name);
    const total = Object.values(result.payouts).reduce((a, b) => a + b, 0);
    if (result.byFold) {
      banner = highlighted('games.result.takes_pot', '{{name}} takes the pot of {{chips}}', {
        name: names[0] ?? '',
        chips: formatChips(total),
      });
    } else if (mainPot.winnerIds.length > 1) {
      banner = highlighted('games.result.split', 'Split pot · {{hand}}', {
        hand: handLabel(mainPot.handName),
      });
    } else {
      banner = highlighted('games.result.wins_with', '{{name}} wins with {{hand}}', {
        name: names[0] ?? '',
        hand: handLabel(mainPot.handName),
      });
    }
  }

  return (
    <div
      className={css.Stage}
      data-layout={layout}
      style={{ '--pot-x': `${spec.pot.x}%`, '--pot-y': `${spec.pot.y}%` } as CSSProperties}
    >
      <div className={css.Rail}>
        <div className={css.Felt}>
          <div className={css.FeltLogo}>Texas Hold’em · No Limit</div>
        </div>
      </div>

      {/* Pot */}
      <div className={css.Pot} data-empty={totalPot <= 0}>
        <ChipStack amount={Math.max(totalPot, 1)} max={4} />
        <span className={css.PotLabel}>{tr('games.table.pot', 'Pot')}</span>
        <span className={css.PotAmount}>{formatChips(totalPot)}</span>
      </div>

      {/* Board */}
      <div className={css.Board}>
        {[0, 1, 2, 3, 4].map((i) => {
          const card = view.board[i];
          return (
            <div key={i} className={css.BoardSlot}>
              {card && (
                <PlayingCard
                  key={`${view.handNumber}-${i}`}
                  card={card}
                  faceUp
                  anim="flip"
                  delayMs={i < 3 ? i * 140 : 0}
                  highlight={showdown && isWinningCard(card)}
                  dim={showdown && winningCards.length > 0 && !isWinningCard(card)}
                />
              )}
            </div>
          );
        })}
      </div>

      {view.players.length === 0 && emptyLabel && (
        <div className={css.ResultBanner} style={{ animation: 'none' }}>
          {emptyLabel}
        </div>
      )}

      {/* Empty seats */}
      {SEATS.map((seat) =>
        view.players.some((p) => p.seat === seat) ? null : (
          <button
            key={`empty-${seat}`}
            type="button"
            className={css.EmptySeat}
            style={pct(spec.seats[seat])}
            disabled={!onSeatClick}
            data-open={!!onSeatClick}
            onClick={() => onSeatClick?.(seat)}
          >
            {onSeatClick ? tr('games.table.sit', 'Sit') : tr('games.table.empty', 'empty')}
          </button>
        )
      )}

      {/* Dealer button */}
      {view.buttonSeat !== null && (
        <div className={css.DealerButton} style={pct(spec.dealer[view.buttonSeat])}>
          D
        </div>
      )}

      {/* Bets */}
      {view.players.map((p) => {
        if (p.streetBet <= 0) return null;
        const from = offset(spec.bets[p.seat], spec.seats[p.seat]);
        return (
          <div
            key={`bet-${p.id}`}
            className={css.Bet}
            data-collecting={phase === 'street-complete'}
            style={
              {
                ...pct(spec.bets[p.seat]),
                '--from-x': from.x,
                '--from-y': from.y,
              } as CSSProperties
            }
          >
            <ChipStack amount={p.streetBet} />
            <span className={css.BetAmount}>{formatChips(p.streetBet)}</span>
          </div>
        );
      })}

      {/* Winnings sliding from the pot to the winners */}
      {showResult &&
        result &&
        Object.entries(result.payouts).map(([id, amount]) => {
          const winner = view.players.find((p) => p.id === id);
          if (!winner) return null;
          const to = offset(spec.pot, spec.seats[winner.seat]);
          return (
            <div
              key={`pile-${view.handNumber}-${id}`}
              className={css.WinnerPile}
              style={{ '--to-x': to.x, '--to-y': to.y } as CSSProperties}
            >
              <ChipStack amount={amount} max={6} />
            </div>
          );
        })}

      {/* Seats */}
      {view.players.map((p) => {
        const isHero = p.id === heroId;
        const seatPos = spec.seats[p.seat];
        const fromDealer = offset(seatPos, spec.center);
        const inHand = p.status !== 'sitting-out';
        const folded = p.status === 'folded';
        const reveal = revealCards && (p.status === 'active' || p.status === 'allin');
        const faceUp = isHero || reveal;
        const myTurn = phase === 'betting' && view.actingSeat === p.seat;
        const timer = myTurn && turnTimer?.seat === p.seat ? turnTimer : undefined;
        const won = showResult ? result?.payouts[p.id] : undefined;
        const shown = showdown ? result?.hands[p.id] : undefined;
        const showCards = inHand && p.hasCards && (!folded || isHero);
        // Other players' cards stay hidden, but the table still deals them.
        const cards: (Card | undefined)[] =
          p.holeCards.length > 0 ? p.holeCards : [undefined, undefined];
        const orderIndex = dealOrder.indexOf(p.seat);

        const { away } = p;
        let badge: LastAction | undefined = p.lastAction ?? undefined;
        if (p.status === 'allin') badge = { type: 'allin' };
        if (showResult) badge = undefined;

        return (
          <div
            key={p.id}
            className={css.Seat}
            data-hero={isHero}
            data-folded={folded && !showResult}
            data-out={p.status === 'sitting-out'}
            style={pct(seatPos)}
          >
            {showCards && (
              <div className={css.SeatCards} data-revealed={reveal && !isHero}>
                {cards.map((card, i) => (
                  <PlayingCard
                    // eslint-disable-next-line react/no-array-index-key
                    key={`${view.handNumber}-${i}`}
                    className={css.SeatCard}
                    card={faceUp ? card : undefined}
                    faceUp={faceUp}
                    anim="deal"
                    delayMs={(i * dealOrder.length + Math.max(orderIndex, 0)) * 90}
                    highlight={showdown && winnerIds.has(p.id) && !!card && isWinningCard(card)}
                    dim={(isHero && folded) || (showdown && !winnerIds.has(p.id))}
                    style={
                      {
                        '--from-x': fromDealer.x,
                        '--from-y': fromDealer.y,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
            )}
            <div className={css.AvatarWrap} data-turn={myTurn && !timer} data-winner={!!won}>
              <PlayerAvatar player={p} resolveAvatar={resolveAvatar} />
              {timer && (
                <svg className={css.TimerRing} viewBox="0 0 100 100" aria-hidden>
                  <circle className={css.TimerTrack} cx="50" cy="50" r={RING_RADIUS} />
                  <circle
                    key={timer.key}
                    className={css.TimerCircle}
                    cx="50"
                    cy="50"
                    r={RING_RADIUS}
                    style={
                      {
                        '--ring-length': RING_LENGTH,
                        animationDuration: `${timer.ms}ms`,
                        animationDelay: `-${timer.elapsedMs ?? 0}ms`,
                      } as CSSProperties
                    }
                  />
                </svg>
              )}
            </div>
            <div className={css.Plate}>
              {badge && !away && (
                <div className={css.ActionBadge} data-kind={badge.type}>
                  {actionLabel(badge)}
                </div>
              )}
              {away && (
                <div className={css.ActionBadge} data-kind="fold">
                  {tr('games.badge.away', 'Away')}
                </div>
              )}
              <div className={css.PlateName}>
                {isHero ? tr('games.table.you', '{{name}} (you)', { name: p.name }) : p.name}
              </div>
              <div className={css.PlateStack}>{formatChips(p.stack)}</div>
              {shown && (
                <div className={css.HandName} data-winner={!!won}>
                  {handText(shown.name)}
                </div>
              )}
            </div>
            {!!won && (
              <div key={`won-${view.handNumber}`} className={css.WinAmount}>
                +{formatChips(won)}
              </div>
            )}
          </div>
        );
      })}

      {banner && <div className={css.ResultBanner}>{banner}</div>}
    </div>
  );
}
