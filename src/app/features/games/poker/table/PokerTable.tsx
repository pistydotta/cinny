import React, { CSSProperties, useMemo } from 'react';
import {
  Card,
  cardKey,
  cardsEqual,
  formatChips,
  getPlayerAtSeat,
  LastAction,
  PokerPlayer,
  PokerState,
} from '../engine';
import { BotTurn } from '../usePokerTable';
import { PlayingCard } from './PlayingCard';
import { ChipStack } from './Chips';
import { LAYOUTS, offset, pct, TableLayout } from './layout';
import * as css from './pokerTable.css';

const SEATS = [0, 1, 2, 3, 4, 5];
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
      return 'Desistiu';
    case 'check':
      return 'Mesa';
    case 'call':
      return `Pagou${amount}`;
    case 'bet':
      return `Apostou${amount}`;
    case 'raise':
      return `Aumentou${amount}`;
    case 'allin':
      return 'All-in';
    default:
      return '';
  }
};

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
  player: PokerPlayer;
};

function PlayerAvatar({ player }: PlayerAvatarProps) {
  const hue = nameHue(player.name);
  return (
    <div
      className={css.Avatar}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 70% 58%), hsl(${
          (hue + 50) % 360
        } 65% 36%))`,
      }}
    >
      {player.avatarUrl ? (
        <img className={css.AvatarImage} src={player.avatarUrl} alt="" draggable={false} />
      ) : (
        initials(player.name)
      )}
    </div>
  );
}

type PokerTableProps = {
  state: PokerState;
  heroId?: string;
  botTurn?: BotTurn;
  layout: TableLayout;
  /** Shown in the felt when nobody is seated yet. */
  emptyLabel?: string;
};

export function PokerTable({ state, heroId, botTurn, layout, emptyLabel }: PokerTableProps) {
  const spec = LAYOUTS[layout];
  const { result, phase } = state;

  const contesting = state.players.filter((p) => p.status === 'active' || p.status === 'allin');
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
  const isWinningCard = (card: Card) => winningCards.some((c) => cardsEqual(c, card));

  // Deal order starts left of the button; used to stagger the deal animation.
  const dealOrder = useMemo(() => {
    const dealt = state.players.filter((p) => p.holeCards.length > 0);
    const button = state.buttonSeat ?? 0;
    return [...dealt.filter((p) => p.seat > button), ...dealt.filter((p) => p.seat <= button)].map(
      (p) => p.seat
    );
  }, [state.players, state.buttonSeat]);

  const totalPot = state.pot;
  const showResult = phase === 'complete' && !!result;

  let banner: React.ReactNode = null;
  if (showResult && result) {
    const mainPot = result.pots[0];
    const names = mainPot.winnerIds.map((id) => state.players.find((p) => p.id === id)?.name);
    const total = Object.values(result.payouts).reduce((a, b) => a + b, 0);
    if (result.byFold) {
      banner = (
        <>
          <span className={css.ResultHighlight}>{names[0]}</span> leva o pote de{' '}
          <span className={css.ResultHighlight}>{formatChips(total)}</span>
        </>
      );
    } else if (mainPot.winnerIds.length > 1) {
      banner = (
        <>
          Pote dividido · <span className={css.ResultHighlight}>{mainPot.handName}</span>
        </>
      );
    } else {
      banner = (
        <>
          <span className={css.ResultHighlight}>{names[0]}</span> vence com{' '}
          <span className={css.ResultHighlight}>{mainPot.handName}</span>
        </>
      );
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
        <span className={css.PotLabel}>Pote</span>
        <span className={css.PotAmount}>{formatChips(totalPot)}</span>
      </div>

      {/* Board */}
      <div className={css.Board}>
        {[0, 1, 2, 3, 4].map((i) => {
          const card = state.board[i];
          return (
            <div key={i} className={css.BoardSlot}>
              {card && (
                <PlayingCard
                  key={`${state.handNumber}-${i}`}
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

      {state.players.length === 0 && emptyLabel && (
        <div className={css.ResultBanner} style={{ animation: 'none' }}>
          {emptyLabel}
        </div>
      )}

      {/* Empty seats */}
      {SEATS.map((seat) =>
        getPlayerAtSeat(state, seat) ? null : (
          <div key={`empty-${seat}`} className={css.EmptySeat} style={pct(spec.seats[seat])}>
            vazio
          </div>
        )
      )}

      {/* Dealer button */}
      {state.buttonSeat !== null && (
        <div className={css.DealerButton} style={pct(spec.dealer[state.buttonSeat])}>
          D
        </div>
      )}

      {/* Bets */}
      {state.players.map((p) => {
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
          const winner = state.players.find((p) => p.id === id);
          if (!winner) return null;
          const to = offset(spec.pot, spec.seats[winner.seat]);
          return (
            <div
              key={`pile-${state.handNumber}-${id}`}
              className={css.WinnerPile}
              style={{ '--to-x': to.x, '--to-y': to.y } as CSSProperties}
            >
              <ChipStack amount={amount} max={6} />
            </div>
          );
        })}

      {/* Seats */}
      {state.players.map((p) => {
        const isHero = p.id === heroId;
        const seatPos = spec.seats[p.seat];
        const fromDealer = offset(seatPos, spec.center);
        const inHand = p.status !== 'sitting-out';
        const folded = p.status === 'folded';
        const reveal = revealCards && (p.status === 'active' || p.status === 'allin');
        const faceUp = isHero || reveal;
        const myTurn = phase === 'betting' && state.actingSeat === p.seat;
        const timer = myTurn && botTurn?.seat === p.seat ? botTurn : undefined;
        const won = showResult ? result?.payouts[p.id] : undefined;
        const shown = showdown ? result?.hands[p.id] : undefined;
        const showCards = inHand && p.holeCards.length > 0 && (!folded || isHero);
        const orderIndex = dealOrder.indexOf(p.seat);

        let badge: LastAction | undefined = p.lastAction;
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
                {p.holeCards.map((card, i) => (
                  <PlayingCard
                    key={`${state.handNumber}-${cardKey(card)}`}
                    className={css.SeatCard}
                    card={faceUp ? card : undefined}
                    faceUp={faceUp}
                    anim="deal"
                    delayMs={(i * dealOrder.length + Math.max(orderIndex, 0)) * 90}
                    highlight={showdown && winnerIds.has(p.id) && isWinningCard(card)}
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
              <PlayerAvatar player={p} />
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
                      } as CSSProperties
                    }
                  />
                </svg>
              )}
            </div>
            <div className={css.Plate}>
              {badge && (
                <div className={css.ActionBadge} data-kind={badge.type}>
                  {actionLabel(badge)}
                </div>
              )}
              <div className={css.PlateName}>{isHero ? `${p.name} (você)` : p.name}</div>
              <div className={css.PlateStack}>{formatChips(p.stack)}</div>
              {shown && (
                <div className={css.HandName} data-winner={!!won}>
                  {shown.name}
                </div>
              )}
            </div>
            {!!won && (
              <div key={`won-${state.handNumber}`} className={css.WinAmount}>
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
