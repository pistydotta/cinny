import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import { tr } from '../../translation/tr';
import { suitName, Suit } from '../poker/types';
import * as poker from '../poker/table/pokerTable.css';
import { FodinhaLayout, pct, seatPoints, tableCenter, toward } from './fodinhaLayout';
import {
  handOrder,
  manilhaRank,
  predictionTotal,
  SeatBadge,
  seatBadge,
  shownTrick,
} from './fodinhaSeat';
import { GamePlayer, GameTable, TableCard } from './types';
import * as css from './fodinhaTable.css';

const TURN_MS = 120_000;
const RING_RADIUS = 48;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
// Penalties a player can take and stay in; the sixth eliminates.
const PIPS = 5;
const SUIT_SYMBOL: Record<string, string> = { d: '♦', s: '♠', h: '♥', c: '♣', r: '★', b: '★' };

const nameHue = (name: string): number =>
  Array.from(name).reduce((hash, ch) => (hash * 31 + ch.charCodeAt(0)) % 360, 7);

function FodinhaCard({
  card,
  faceUp = true,
  highlight,
  dim,
}: {
  card?: TableCard;
  faceUp?: boolean;
  highlight?: boolean;
  dim?: boolean;
}) {
  const show = faceUp && !!card && !card.covered;
  const joker = card?.rank === '★';
  let label = tr('games.table.face_down', 'Face-down card');
  if (show && joker) label = tr('table_games.joker', 'Joker');
  else if (show && card) {
    label = tr('games.table.card', '{{rank}} of {{suit}}', {
      rank: card.rank,
      suit: suitName(card.suit as Suit),
    });
  }
  return (
    <div
      className={poker.Card}
      data-highlight={highlight || undefined}
      data-dim={dim || undefined}
      role="img"
      aria-label={label}
    >
      <div className={poker.CardInner} data-face={show ? 'up' : 'down'}>
        {show && card && (
          <div className={poker.CardFront} data-red={['d', 'h', 'r'].includes(card.suit)}>
            <span className={poker.CardRank}>{joker ? '★' : card.rank}</span>
            {!joker && <span className={poker.CardCornerSuit}>{SUIT_SYMBOL[card.suit]}</span>}
            <span className={poker.CardBigSuit}>{SUIT_SYMBOL[card.suit] ?? ''}</span>
          </div>
        )}
        <div className={poker.CardBack} />
      </div>
    </div>
  );
}

function Avatar({ name, src }: { name: string; src?: string }) {
  const hue = nameHue(name);
  return (
    <div
      className={poker.Avatar}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 70% 58%), hsl(${
          (hue + 50) % 360
        } 65% 36%))`,
      }}
    >
      {src ? (
        <img className={poker.AvatarImage} src={src} alt="" draggable={false} />
      ) : (
        name.slice(0, 2).toUpperCase()
      )}
    </div>
  );
}

function badgeView(badge: SeatBadge | null): { kind: string; text: string } | null {
  if (!badge) return null;
  switch (badge.kind) {
    case 'out':
      return { kind: 'fold', text: tr('table_games.eliminated', 'Eliminated') };
    case 'thinking':
      return { kind: 'check', text: tr('table_games.badge_thinking', 'Thinking…') };
    case 'predicted':
      return {
        kind: 'bet',
        text: tr('table_games.badge_predicted', 'Bet {{n}}', { n: badge.prediction }),
      };
    case 'progress':
      return {
        kind: 'check',
        text: tr('table_games.badge_progress', 'Won {{won}}/{{prediction}}', {
          won: badge.won,
          prediction: badge.prediction,
        }),
      };
    case 'exact':
      return { kind: 'call', text: tr('table_games.badge_exact', 'Spot on!') };
    case 'missed':
      return {
        kind: 'allin',
        text: tr('table_games.badge_missed', '+{{n}} penalty', { n: badge.penalty }),
      };
    default:
      return null;
  }
}

type SeatProps = {
  table: GameTable;
  player: GamePlayer;
  seat: number;
  hero: boolean;
  name: string;
  avatar?: string;
  style: CSSProperties;
};

function Seat({ table, player, seat, hero, name, avatar, style }: SeatProps) {
  const playing = table.phase === 'predict' || table.phase === 'play';
  const turn = playing && table.turn === seat && !player.eliminated;
  const badge = badgeView(seatBadge(table, player, seat));
  const won = table.phase === 'finished' && table.winners?.includes(seat);
  const elapsed = table.deadline ? Math.max(0, TURN_MS - (table.deadline - Date.now())) : 0;
  return (
    <div
      className={poker.Seat}
      style={style}
      data-hero={hero}
      data-out={player.eliminated}
      aria-label={name}
    >
      {!hero && table.phase !== 'waiting' && player.cardCount > 0 && !player.cards && (
        <div className={css.Fan} data-many={player.cardCount > 7} aria-hidden>
          {Array.from({ length: player.cardCount }, (_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className={css.FanCard}>
              <FodinhaCard faceUp={false} />
            </div>
          ))}
        </div>
      )}
      <div className={poker.AvatarWrap} data-turn={turn && !table.deadline} data-winner={!!won}>
        <Avatar name={name} src={avatar} />
        {turn && table.deadline && (
          <svg className={poker.TimerRing} viewBox="0 0 100 100" aria-hidden>
            <circle className={poker.TimerTrack} cx="50" cy="50" r={RING_RADIUS} />
            <circle
              key={table.deadline}
              className={poker.TimerCircle}
              cx="50"
              cy="50"
              r={RING_RADIUS}
              style={
                {
                  '--ring-length': RING_LENGTH,
                  animationDuration: `${TURN_MS}ms`,
                  animationDelay: `-${elapsed}ms`,
                } as CSSProperties
              }
            />
          </svg>
        )}
      </div>
      <div className={poker.Plate}>
        {badge && (
          <span className={poker.ActionBadge} data-kind={badge.kind}>
            {badge.text}
          </span>
        )}
        <div className={poker.PlateName}>
          {hero ? tr('games.table.you', '{{name}} (you)', { name }) : name}
        </div>
        {table.phase !== 'waiting' && (
          <div
            className={css.Pips}
            title={tr('table_games.penalties_title', '{{n}} penalties · more than 5 eliminates', {
              n: player.penalties,
            })}
          >
            {Array.from({ length: PIPS }, (_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <span key={i} className={css.Pip} data-on={i < player.penalties} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export type FodinhaTableProps = {
  table: GameTable;
  busy: boolean;
  onAct: (action: Record<string, unknown>) => void;
  nameOf: (userId: string) => string;
  avatarOf: (userId: string) => string | undefined;
};

export function FodinhaTable({ table, busy, onAct, nameOf, avatarOf }: FodinhaTableProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<FodinhaLayout>('landscape');
  useEffect(() => {
    const el = wrap.current?.parentElement;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setLayout(entry.contentRect.width < 620 ? 'portrait' : 'landscape');
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const seats = Math.max(table.capacity, table.players.length);
  const { mySeat } = table;
  const points = seatPoints(seats, Math.max(mySeat, 0), layout);
  const center = tableCenter(layout);
  const trick = shownTrick(table);
  const me = mySeat >= 0 ? table.players[mySeat] : undefined;
  const myTurn = !!me && !me.eliminated && table.turn === mySeat;
  const turnName =
    table.turn !== null && table.players[table.turn]
      ? nameOf(table.players[table.turn].userId)
      : '';

  let title = '';
  let line = '';
  if (table.phase === 'waiting') {
    title = tr('table_games.waiting', 'Waiting for players');
    line = tr('table_games.seated', '{{n}} of {{total}} seated', {
      n: table.players.length,
      total: table.capacity,
    });
  } else if (table.phase === 'finished') {
    title =
      table.result === 'cancelled'
        ? tr('table_games.cancelled', 'Table cancelled · stakes refunded')
        : tr('table_games.winner', 'Winner: {{names}}', {
            names: (table.winners ?? []).map((i) => nameOf(table.players[i].userId)).join(' + '),
          });
  } else {
    title =
      table.handSize === 1
        ? tr('table_games.round_one_card', 'Round {{round}} · 1 card', { round: table.round ?? 1 })
        : tr('table_games.round_cards', 'Round {{round}} · {{count}} cards', {
            round: table.round ?? 1,
            count: table.handSize,
          });
    if (trick.done && table.phase === 'play' && table.lastWinner !== undefined) {
      line =
        table.lastWinner === null
          ? tr('table_games.trick_tie', 'Tie: nobody took that trick')
          : tr('table_games.trick_won', '{{name}} took the trick', {
              name: nameOf(table.players[table.lastWinner].userId),
            });
    } else {
      line = tr('table_games.bets_total', 'Bets: {{total}} of {{count}} tricks', {
        total: predictionTotal(table),
        count: table.handSize,
      });
    }
  }

  const blind = !!table.blind && !!me && !me.cards && me.cardCount > 0;
  const hand: { card?: TableCard; index: number }[] = blind
    ? [{ index: 0 }]
    : (me?.cards ?? [])
        .map((card, index) => ({ card, index }))
        .sort((a, b) => handOrder(a.card, table.vira) - handOrder(b.card, table.vira));
  const canPlay = myTurn && table.phase === 'play' && !busy;

  let status = '';
  if (me?.eliminated) status = tr('table_games.you_out', 'You are out. You can keep watching.');
  else if (blind && table.phase === 'predict')
    status = myTurn
      ? tr(
          'table_games.blind_predict',
          'Card on your forehead: you see everyone’s card but yours. How many tricks will you win?'
        )
      : tr('table_games.turn_predict', '{{name}} is betting…', { name: turnName });
  else if (table.phase === 'predict')
    status = myTurn
      ? tr('table_games.predict', 'How many tricks will you win?')
      : tr('table_games.turn_predict', '{{name}} is betting…', { name: turnName });
  else if (table.phase === 'play')
    status = myTurn
      ? tr('table_games.turn_play_mine', 'Your turn: pick a card')
      : tr('table_games.turn_play', '{{name}} is playing…', { name: turnName });
  else if (table.phase === 'round_end') status = tr('table_games.round_end', 'Round complete');

  return (
    <>
      <div ref={wrap} className={css.Wrap} data-layout={layout}>
        <div className={poker.Stage} data-layout={layout}>
          <div className={poker.Rail}>
            <div className={poker.Felt}>
              <div className={poker.FeltLogo}>Fodinha</div>
            </div>
          </div>
          <div className={css.Center} aria-live="polite">
            {table.vira && table.phase !== 'waiting' && table.phase !== 'finished' && (
              <div className={css.Vira}>
                <FodinhaCard card={table.vira} />
              </div>
            )}
            <div>
              <div className={css.CenterTitle}>{title}</div>
              {line && <div className={css.CenterLine}>{line}</div>}
              {table.vira && table.phase !== 'waiting' && table.phase !== 'finished' && (
                <div className={css.CenterLine}>
                  {tr('table_games.manilha', 'Vira · manilhas: {{rank}}', {
                    rank: manilhaRank(table.vira),
                  })}
                </div>
              )}
            </div>
          </div>
          {/* Forehead round: the API sends the others' cards, shown in front of each of them. */}
          {table.players.map((p, seat) =>
            seat !== mySeat && p.cards?.[0] ? (
              <div
                key={p.userId}
                className={css.TrickCard}
                style={pct(toward(points[seat], center, 0.34))}
              >
                <FodinhaCard card={p.cards[0]} />
              </div>
            ) : null
          )}
          {trick.cards.map(({ seat, card }) => (
            <div
              key={seat}
              className={css.TrickCard}
              style={pct(toward(points[seat] ?? center, center, 0.45))}
            >
              <FodinhaCard
                card={card}
                highlight={trick.done && table.lastWinner === seat}
                dim={trick.done && table.lastWinner !== seat}
              />
            </div>
          ))}
          {Array.from({ length: seats }, (_, seat) => {
            const player = table.players[seat];
            if (!player)
              return (
                // eslint-disable-next-line react/no-array-index-key
                <div key={`empty-${seat}`} className={poker.EmptySeat} style={pct(points[seat])}>
                  {tr('games.table.empty', 'empty')}
                </div>
              );
            return (
              <Seat
                key={player.userId}
                table={table}
                player={player}
                seat={seat}
                hero={seat === mySeat}
                name={nameOf(player.userId)}
                avatar={avatarOf(player.userId)}
                style={pct(points[seat])}
              />
            );
          })}
        </div>
      </div>
      {me && table.phase !== 'waiting' && table.phase !== 'finished' && (
        <div className={css.Hand}>
          {status && (
            <p className={css.HandStatus} data-mine={myTurn}>
              {status}
            </p>
          )}
          {table.phase === 'predict' && myTurn && (
            <div className={css.Predictions}>
              {Array.from({ length: table.handSize + 1 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={css.PredictButton}
                  disabled={busy}
                  onClick={() => onAct({ type: 'predict', value: i })}
                >
                  {i}
                </button>
              ))}
            </div>
          )}
          {hand.length > 0 && (
            <div className={css.HandCards} data-many={hand.length > 9}>
              {hand.map(({ card, index }) => (
                <button
                  key={card ? `${card.rank}${card.suit}` : 'blind'}
                  type="button"
                  className={css.HandCard}
                  disabled={!canPlay}
                  aria-label={
                    card
                      ? undefined
                      : tr('table_games.play_blind', 'Play your card without seeing it')
                  }
                  onClick={() => onAct({ type: 'play', card: index })}
                >
                  <FodinhaCard
                    card={card}
                    faceUp={!!card}
                    dim={table.phase === 'play' && !myTurn}
                  />
                </button>
              ))}
            </div>
          )}
          {table.phase === 'round_end' && (
            <button
              type="button"
              className={css.PredictButton}
              style={{ padding: '0 20px', fontSize: 16 }}
              disabled={busy}
              onClick={() => onAct({ type: 'next' })}
            >
              {tr('table_games.next', 'Next round')}
            </button>
          )}
        </div>
      )}
    </>
  );
}
