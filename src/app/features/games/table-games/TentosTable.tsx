import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import { tr } from '../../translation/tr';
import { FodinhaLayout, pct, seatPoints, tableCenter, toward } from './fodinhaLayout';
import {
  handOrder,
  manilhaRank,
  predictionTotal,
  seatBadge,
  SeatBadge,
  shownTrick,
} from './fodinhaSeat';
import {
  isRed,
  livesLeft,
  nextRaise,
  ourTeam,
  placedCards,
  trickMarks,
  trickResult,
  turnMs,
} from './tentosView';
import { GamePlayer, GameTable, TableCard } from './types';
import { hasScene, trucoScene } from './trucoScene';
import * as css from './tentos.css';
import barArt from '../art/truco-bar.webp';

// How long a finished trick stays on the felt after it closes, even if the next one starts
// (bots answer at once, and the others only poll every two seconds).
const HOLD_MS = 2500;
const RING_RADIUS = 24;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const px = (p: { x: number; y: number }): CSSProperties => ({ left: p.x, top: p.y });
const SUIT: Record<string, string> = { d: '♦', s: '♠', h: '♥', c: '♣', r: '★', b: '★' };
const suitName = (suit: string) =>
  ({
    d: tr('table_games.suit_d', 'diamonds'),
    s: tr('table_games.suit_s', 'spades'),
    h: tr('table_games.suit_h', 'hearts'),
    c: tr('table_games.suit_c', 'clubs'),
  }[suit] ?? suit);

export function PlayingCard({
  card,
  back,
  win,
  dim,
}: {
  card?: TableCard;
  back?: boolean;
  win?: boolean;
  dim?: boolean;
}) {
  const face = !back && !!card && !card.covered;
  return (
    <div
      className={css.Card}
      data-back={!face}
      data-red={face && isRed(card)}
      data-win={win || undefined}
      data-dim={dim || undefined}
      role="img"
      aria-label={
        face && card
          ? tr('table_games.card_name', '{{rank}} of {{suit}}', {
              rank: card.rank,
              suit: suitName(card.suit),
            })
          : tr('games.table.face_down', 'Face-down card')
      }
    >
      {face && card && (
        <>
          {card.rank}
          <span className={css.CardSuit}>{SUIT[card.suit]}</span>
          <span className={css.CardBig}>{SUIT[card.suit]}</span>
        </>
      )}
    </div>
  );
}

const raiseName = (value: number) =>
  ({
    3: tr('table_games.raise_3', 'Truco!'),
    6: tr('table_games.raise_6', 'Six!'),
    9: tr('table_games.raise_9', 'Nine!'),
    12: tr('table_games.raise_12', 'Twelve!'),
  }[value] ?? String(value));

function Tally({ table }: { table: GameTable }) {
  const ours = ourTeam(table);
  const scores = table.scores ?? [0, 0];
  const row = (team: number, label: string) => (
    <div className={css.TallyRow}>
      <span className={css.TallyLabel}>{label}</span>
      <span className={css.Sticks} aria-hidden>
        {Array.from({ length: 12 }, (_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <span
            key={i}
            className={css.Stick}
            data-on={i < scores[team]}
            data-ours={team === ours}
          />
        ))}
      </span>
      <span className={css.TallyScore}>{scores[team]}</span>
    </div>
  );
  return (
    <div
      className={css.Tally}
      aria-label={tr('table_games.score_label', 'Score: us {{us}}, them {{them}}', {
        us: scores[ours],
        them: scores[1 - ours],
      })}
    >
      {row(
        ours,
        table.mySeat >= 0 ? tr('table_games.us', 'us') : tr('table_games.pair_1', 'pair 1')
      )}
      {row(
        1 - ours,
        table.mySeat >= 0 ? tr('table_games.them', 'them') : tr('table_games.pair_2', 'pair 2')
      )}
    </div>
  );
}

function badgeText(badge: SeatBadge | null): string {
  if (!badge) return '';
  switch (badge.kind) {
    case 'out':
      return tr('table_games.eliminated', 'Eliminated');
    case 'thinking':
      return tr('table_games.badge_thinking', 'Thinking…');
    case 'predicted':
      return tr('table_games.badge_predicted', 'Bet {{n}}', { n: badge.prediction });
    case 'progress':
      return tr('table_games.badge_progress', 'Won {{won}}/{{prediction}}', {
        won: badge.won,
        prediction: badge.prediction,
      });
    case 'exact':
      return tr('table_games.badge_exact', 'Spot on!');
    case 'missed':
      return tr('table_games.badge_missed', '+{{n}} penalty', { n: badge.penalty });
    default:
      return '';
  }
}

type SeatProps = {
  table: GameTable;
  player: GamePlayer;
  seat: number;
  name: string;
  avatar?: string;
  style: CSSProperties;
};

function Seat({ table, player, seat, name, avatar, style }: SeatProps) {
  const hero = seat === table.mySeat;
  const playing = !['waiting', 'finished', 'round_end'].includes(table.phase);
  // During a raise or the hand of eleven, `turn` is the seat asked to answer for its pair.
  const turn = playing && table.turn === seat && !player.eliminated;
  const turnTime = turnMs(table.kind);
  const elapsed = table.deadline ? Math.max(0, turnTime - (table.deadline - Date.now())) : 0;
  const won = table.phase === 'finished' && table.winners?.includes(seat);
  let sub = '';
  let gold = false;
  if (table.kind === 'truco' && table.phase !== 'waiting') {
    const ours = seat % 2 === ourTeam(table);
    gold = ours && table.mySeat >= 0;
    if (!hero) {
      sub =
        table.mySeat >= 0 && ours
          ? tr('table_games.partner', 'partner')
          : tr('table_games.pair_n', 'pair {{n}}', { n: (seat % 2) + 1 });
    }
  } else if (table.kind === 'fodinha') sub = badgeText(seatBadge(table, player, seat));
  if (won) {
    sub = tr('table_games.won', 'won');
    gold = true;
  }
  const shown = !hero && player.cards?.length ? player.cards : null;
  const backs = !hero && !shown && table.phase !== 'waiting' ? player.cardCount : 0;
  return (
    <div className={css.Seat} style={style} data-out={player.eliminated}>
      {shown && (
        <div className={css.SeatCards}>
          {shown.map((card) => (
            <PlayingCard key={`${card.rank}${card.suit}`} card={card} />
          ))}
        </div>
      )}
      {backs > 0 && (
        <div className={css.SeatCards} aria-hidden>
          {Array.from({ length: Math.min(backs, 3) }, (_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <PlayingCard key={i} back />
          ))}
          {backs > 3 && <span className={css.Count}>×{backs}</span>}
        </div>
      )}
      <div className={css.Avatar} data-turn={turn}>
        {avatar ? (
          <img className={css.AvatarImage} src={avatar} alt="" draggable={false} />
        ) : (
          name.replace(/^Bot /, '').slice(0, 2).toUpperCase()
        )}
        {turn && table.deadline && (
          <svg className={css.Ring} viewBox="0 0 52 52" aria-hidden>
            <circle
              key={table.deadline}
              className={css.RingFill}
              cx="26"
              cy="26"
              r={RING_RADIUS}
              style={
                {
                  '--ring-length': RING_LENGTH,
                  animationDuration: `${turnTime}ms`,
                  animationDelay: `-${elapsed}ms`,
                } as CSSProperties
              }
            />
          </svg>
        )}
      </div>
      <div className={css.SeatName}>{hero ? tr('table_games.you', 'You') : name}</div>
      {sub && (
        <div className={css.SeatSub} data-tone={gold ? 'gold' : undefined}>
          {sub}
        </div>
      )}
      {table.kind === 'fodinha' && table.phase !== 'waiting' && !player.eliminated && (
        <div
          className={css.Lives}
          title={tr('table_games.penalties_title', '{{n}} penalties · more than 5 eliminates', {
            n: player.penalties,
          })}
        >
          {Array.from({ length: 5 }, (_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <span key={i} className={css.Life} data-lost={i >= livesLeft(player.penalties)} />
          ))}
        </div>
      )}
    </div>
  );
}

type Held = Pick<GameTable, 'lastTrick' | 'lastWinner'>;

/**
 * Keeps the trick that just closed on the table for a moment, so everyone sees who took it
 * before the next card covers it. Cleared early when you play.
 */
function useHeldTrick(table: GameTable): [Held | null, () => void] {
  const cards = table.lastTrick ?? [];
  const key = cards.length
    ? `${table.id}:${table.round}:${cards.map((t) => `${t.seat}${t.card.rank}${t.card.suit}`)}`
    : '';
  const seen = useRef(key);
  const [held, setHeld] = useState<Held | null>(null);
  useEffect(() => {
    if (key === seen.current) return undefined;
    seen.current = key;
    if (!key) {
      setHeld(null);
      return undefined;
    }
    setHeld({ lastTrick: table.lastTrick, lastWinner: table.lastWinner });
    const timer = setTimeout(() => setHeld(null), HOLD_MS);
    return () => clearTimeout(timer);
    // The key covers the trick's cards; the winner arrives with them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return [held, () => setHeld(null)];
}

export type TentosTableProps = {
  table: GameTable;
  busy: boolean;
  isOwner: boolean;
  onAct: (action: Record<string, unknown>) => void;
  onJoin: () => void;
  onRematch: () => void;
  onBack: () => void;
  onOpenSheet: () => void;
  nameOf: (userId: string) => string;
  avatarOf: (userId: string) => string | undefined;
};

export function TentosTable({
  table,
  busy,
  isOwner,
  onAct,
  onJoin,
  onRematch,
  onBack,
  onOpenSheet,
  nameOf,
  avatarOf,
}: TentosTableProps) {
  const [held, release] = useHeldTrick(table);
  // The felt shows the held trick, finished, until its moment is up.
  const felt: GameTable = held ? { ...table, trick: [], ...held } : table;
  const shown = shownTrick(felt);
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [covered, setCovered] = useState(false);
  useEffect(() => {
    const el = stage.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const truco = table.kind === 'truco';
  const { mySeat, phase } = table;
  const live = phase !== 'waiting' && phase !== 'finished';
  const seats = Math.max(table.capacity, table.players.length);
  const layout: FodinhaLayout = size.width && size.width < 620 ? 'portrait' : 'landscape';
  // Truco is played at the bar: the photo's chairs and table instead of the rings.
  const scene =
    truco && hasScene(seats) && size.width
      ? trucoScene(size.width, size.height, seats, Math.max(mySeat, 0))
      : null;
  const ring = seatPoints(seats, Math.max(mySeat, 0), layout);
  const center = tableCenter(layout);
  const seatAt = (seat: number): CSSProperties => (scene ? px(scene.seats[seat]) : pct(ring[seat]));
  const playedAt = (seat: number): CSSProperties =>
    scene ? px(scene.played[seat]) : pct(toward(center, ring[seat] ?? center, 0.56));
  const vira = live && table.vira && (
    <div
      className={scene ? css.SceneVira : undefined}
      style={
        { '--card-w': `${scene?.card ?? 46}px`, ...(scene && px(scene.vira)) } as CSSProperties
      }
    >
      <PlayingCard card={table.vira} />
    </div>
  );
  const me = mySeat >= 0 ? table.players[mySeat] : undefined;
  const active = !!me && !me.eliminated;
  const myTurn = active && table.turn === mySeat;
  const turnName =
    table.turn !== null && table.players[table.turn]
      ? nameOf(table.players[table.turn].userId)
      : '';
  const answering =
    truco &&
    active &&
    (phase === 'eleven'
      ? mySeat % 2 === table.decisionTeam
      : phase === 'respond' && mySeat % 2 !== table.pending?.team);

  // Center of the table: the vira and what the hand is worth, or what the table waits for.
  let title = '';
  let line = '';
  let callout = '';
  if (phase === 'waiting') {
    title = tr('table_games.waiting', 'Waiting for players');
    line = tr('table_games.seated', '{{n}} of {{total}} seated', {
      n: table.players.length,
      total: table.capacity,
    });
  } else if (phase === 'finished') {
    title =
      table.result === 'cancelled'
        ? tr('table_games.cancelled', 'Table cancelled · stakes refunded')
        : tr('table_games.winner', 'Winner: {{names}}', {
            names: (table.winners ?? []).map((i) => nameOf(table.players[i].userId)).join(' + '),
          });
  } else if (truco) {
    line = tr('table_games.worth', 'hand worth {{value}}', { value: table.value ?? 1 });
    if (table.iron) callout = tr('table_games.iron_short', 'Iron hand: everyone plays blind');
    if (phase === 'respond' && table.pending)
      callout = tr('table_games.asked', '{{team}} asked for {{raise}}', {
        team:
          table.pending.team === ourTeam(table) && mySeat >= 0
            ? tr('table_games.us_cap', 'We')
            : tr('table_games.them_cap', 'They'),
        raise: raiseName(table.pending.value),
      });
    if (phase === 'eleven') callout = tr('table_games.eleven_short', 'Hand of eleven');
    if (phase === 'round_end') {
      if (table.handWinner === null || table.handWinner === undefined)
        callout = tr('table_games.hand_tied', 'Nobody scores this hand');
      else
        callout = tr('table_games.hand_won', '{{team}} +{{n}}', {
          team:
            table.handWinner === ourTeam(table) && mySeat >= 0
              ? tr('table_games.us_cap', 'We')
              : tr('table_games.them_cap', 'They'),
          n: table.handPoints ?? 0,
        });
    }
  } else {
    line =
      table.handSize === 1
        ? tr('table_games.round_one_card', 'Round {{round}} · 1 card', { round: table.round ?? 1 })
        : tr('table_games.round_cards', 'Round {{round}} · {{count}} cards', {
            round: table.round ?? 1,
            count: table.handSize,
          });
    callout =
      phase === 'round_end'
        ? tr('table_games.round_end', 'Round complete')
        : tr('table_games.bets_total', 'Bets: {{total}} of {{count}} tricks', {
            total: predictionTotal(table),
            count: table.handSize,
          });
  }

  const took = trickResult(felt, shown.done);
  let trickLine = '';
  if (took && (phase === 'play' || phase === 'predict' || held)) {
    if (took.kind === 'tie')
      trickLine = truco
        ? tr('table_games.trick_tied', 'Tied trick')
        : tr('table_games.trick_tied_nobody', 'Tied: nobody takes it');
    else if (took.seat === mySeat) trickLine = tr('table_games.trick_you', 'You took the trick');
    else if (truco && mySeat >= 0 && took.seat % 2 === mySeat % 2)
      trickLine = tr('table_games.trick_partner', 'Your partner took the trick');
    else
      trickLine = tr('table_games.trick_name', '{{name}} took the trick', {
        name: nameOf(table.players[took.seat].userId),
      });
  }
  const marks = truco && live ? trickMarks(table) : [];
  const markName = {
    us: mySeat >= 0 ? tr('table_games.us', 'us') : tr('table_games.pair_1', 'pair 1'),
    them: mySeat >= 0 ? tr('table_games.them', 'them') : tr('table_games.pair_2', 'pair 2'),
    tie: tr('table_games.tie', 'tie'),
    open: '—',
  };

  const blind = active && !me.cards && me.cardCount > 0;
  const hand: { card?: TableCard; index: number }[] = blind
    ? Array.from({ length: me.cardCount }, (_, index) => ({ index }))
    : (me?.cards ?? [])
        .map((card, index) => ({ card, index }))
        .sort((a, b) =>
          truco ? 0 : handOrder(a.card, table.vira) - handOrder(b.card, table.vira)
        );
  const canPlay = myTurn && phase === 'play' && !busy;
  const canCover = truco && !!table.lastTrick?.length && !table.iron && phase === 'play';

  let status = '';
  if (phase === 'waiting')
    status =
      table.players.length < table.capacity
        ? tr('table_games.missing_seats', '{{n}} seats left: invite friends or add bots.', {
            n: table.capacity - table.players.length,
          })
        : tr('table_games.ready', 'Every seat is taken.');
  else if (me?.eliminated)
    status = tr('table_games.you_out', 'You are out. You can keep watching.');
  else if (mySeat < 0) status = tr('table_games.spectating', 'You are watching this table.');
  else if (answering)
    status =
      phase === 'eleven'
        ? tr('table_games.eleven_ask', 'Look at your partner’s cards: play for 3 or run for 1?')
        : tr('table_games.respond_ask', 'Accept, run or raise again?');
  else if (phase === 'respond' || phase === 'eleven')
    status = tr('table_games.wait_answer', 'Waiting for the other pair to answer…');
  else if (phase === 'predict' && !myTurn)
    status = tr('table_games.turn_predict', '{{name}} is betting…', { name: turnName });
  else if (phase === 'predict' && blind)
    status = tr(
      'table_games.blind_predict',
      'Card on your forehead: you see everyone’s card but yours. How many tricks will you win?'
    );
  else if (phase === 'predict') status = tr('table_games.predict', 'How many tricks will you win?');
  else if (phase === 'play')
    status = myTurn
      ? tr('table_games.turn_play_mine', 'Your turn: pick a card')
      : tr('table_games.turn_play', '{{name}} is playing…', { name: turnName });

  const play = (index: number) => {
    onAct({ type: 'play', card: index, ...(covered && canCover ? { covered: true } : {}) });
    setCovered(false);
    release();
  };

  const actions: React.ReactNode[] = [];
  const pill = (key: string, label: string, onClick: () => void, primary = false, off = false) => (
    <button
      key={key}
      type="button"
      className={css.Pill}
      data-primary={primary}
      disabled={busy || off}
      onClick={onClick}
    >
      {label}
    </button>
  );
  if (phase === 'waiting') {
    if (mySeat < 0 && table.players.length < table.capacity)
      actions.push(
        pill(
          'join',
          table.stake
            ? tr('table_games.sit_stake', 'Sit · {{stake}} credits', { stake: table.stake })
            : tr('table_games.sit', 'Sit'),
          onJoin,
          true
        )
      );
    if (isOwner) {
      if (table.players.length < table.capacity)
        actions.push(
          pill('bots', tr('table_games.fill_bots', 'Fill with bots'), () =>
            onAct({ type: 'fill_bots' })
          )
        );
      actions.push(
        pill(
          'start',
          tr('table_games.start', 'Start game'),
          () => onAct({ type: 'start' }),
          true,
          table.players.length !== table.capacity
        )
      );
    } else if (me)
      actions.push(
        pill('leave', tr('table_games.leave', 'Leave and refund stake'), () =>
          onAct({ type: 'leave' })
        )
      );
  } else if (phase === 'finished') {
    actions.push(pill('back', tr('table_games.back_to_tables', 'Back to tables'), onBack));
    if (mySeat >= 0 && table.result !== 'cancelled')
      actions.push(pill('again', tr('table_games.play_again', 'Play again'), onRematch, true));
  } else if (phase === 'round_end' && active) {
    actions.push(
      pill(
        'next',
        truco ? tr('table_games.next_hand', 'Next hand') : tr('table_games.next', 'Next round'),
        () => onAct({ type: 'next' }),
        true
      )
    );
  } else if (answering) {
    actions.push(pill('run', tr('table_games.run', 'Run'), () => onAct({ type: 'decline' })));
    if (phase === 'respond' && (table.pending?.value ?? 12) < 12)
      actions.push(
        pill('reraise', raiseName(nextRaise(table.pending?.value)), () => onAct({ type: 'raise' }))
      );
    actions.push(
      pill(
        'accept',
        phase === 'eleven'
          ? tr('table_games.play_for_3', 'Play for 3')
          : tr('table_games.accept', 'Accept'),
        () => onAct({ type: 'accept' }),
        true
      )
    );
  } else if (phase === 'predict' && myTurn) {
    Array.from({ length: table.handSize + 1 }, (_, i) =>
      actions.push(pill(`p${i}`, String(i), () => onAct({ type: 'predict', value: i })))
    );
  } else if (truco && phase === 'play' && myTurn) {
    if (canCover)
      actions.push(
        <button
          key="cover"
          type="button"
          className={css.Pill}
          aria-pressed={covered}
          disabled={busy}
          onClick={() => setCovered((c) => !c)}
        >
          {tr('table_games.cover', 'Cover')}
        </button>
      );
    const value = table.value ?? 1;
    if (!table.eleven && value < 12 && table.lastRaise !== mySeat % 2)
      actions.push(
        pill('raise', raiseName(nextRaise(value)), () => onAct({ type: 'raise' }), true)
      );
  }

  return (
    <div className={css.Screen}>
      <div ref={stage} className={css.Stage}>
        <div className={css.Corner} data-side="left">
          <div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={css.Pill}
                onClick={onBack}
                aria-label={tr('games.action.back', 'Back')}
              >
                ←
              </button>
              <span className={css.TableName}>{table.name}</span>
            </div>
            {truco && phase !== 'waiting' && <Tally table={table} />}
          </div>
        </div>
        <div className={css.Corner} data-side="right">
          <button type="button" className={css.Pill} onClick={onOpenSheet}>
            {phase === 'waiting'
              ? tr('table_games.invite', '+ Invite')
              : tr('table_games.table_menu', 'Table')}
          </button>
        </div>

        <div className={css.Felt} data-layout={layout} data-scene={!!scene}>
          {scene ? (
            <img
              className={css.Scene}
              src={barArt}
              alt=""
              draggable={false}
              style={{
                left: scene.left,
                top: scene.top,
                width: scene.width,
                height: scene.height,
              }}
            />
          ) : (
            <div className={css.Rings} />
          )}
          {scene && vira}
          <div className={css.Center} aria-live="polite" style={scene ? px(scene.door) : undefined}>
            {live && table.vira && (
              <>
                {!scene && vira}
                <div className={css.CenterLine}>
                  {tr('table_games.manilha_short', 'vira · manilha {{rank}}', {
                    rank: manilhaRank(table.vira),
                  })}
                </div>
              </>
            )}
            {title && <div className={css.CenterTitle}>{title}</div>}
            {line && <div className={css.CenterLine}>{line}</div>}
            {marks.length > 0 && (
              <div
                className={css.Marks}
                aria-label={marks
                  .map((m, i) =>
                    tr('table_games.trick_mark', 'Trick {{n}}: {{who}}', {
                      n: i + 1,
                      who: markName[m],
                    })
                  )
                  .join(', ')}
              >
                {marks.map((m, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <span key={i} className={css.Mark} data-mark={m} title={markName[m]}>
                    {i + 1}ª
                  </span>
                ))}
              </div>
            )}
            {callout && <div className={css.Callout}>{callout}</div>}
            {trickLine && (
              <div className={css.Callout} data-quiet="true">
                {trickLine}
              </div>
            )}
          </div>

          {placedCards(felt).map(({ seat, card, latest, win, dim }) => (
            <div
              key={seat}
              className={css.Placed}
              data-scene={!!scene}
              style={
                { ...playedAt(seat), '--card-w': `${scene ? scene.card : 44}px` } as CSSProperties
              }
            >
              <PlayingCard card={card} win={win} dim={dim} />
              <span className={css.PlacedName} data-latest={latest} data-win={win}>
                {seat === mySeat
                  ? tr('table_games.you', 'You')
                  : nameOf(table.players[seat].userId)}
              </span>
            </div>
          ))}

          {Array.from({ length: seats }, (_, seat) => {
            const player = table.players[seat];
            if (!player)
              return (
                // eslint-disable-next-line react/no-array-index-key
                <div key={`empty-${seat}`} className={css.Seat} style={seatAt(seat)}>
                  <div className={css.Avatar} data-empty="true" />
                  <div className={css.SeatSub}>{tr('games.table.empty', 'empty')}</div>
                </div>
              );
            return (
              <Seat
                key={player.userId}
                table={table}
                player={player}
                seat={seat}
                name={nameOf(player.userId)}
                avatar={avatarOf(player.userId)}
                style={seatAt(seat)}
              />
            );
          })}
        </div>
      </div>

      <div className={css.Bar}>
        {status && (
          <div className={css.Status} data-mine={myTurn || answering}>
            {status}
          </div>
        )}
        <div className={css.BarRow}>
          {live && active && hand.length > 0 && (
            <div className={css.Hand} data-many={hand.length > 7}>
              {hand.map(({ card, index }) => (
                <button
                  key={card ? `${card.rank}${card.suit}` : `back-${index}`}
                  type="button"
                  className={css.HandButton}
                  disabled={!canPlay}
                  aria-label={
                    card
                      ? undefined
                      : tr('table_games.play_blind', 'Play your card without seeing it')
                  }
                  onClick={() => play(index)}
                >
                  <PlayingCard card={card} back={!card} />
                </button>
              ))}
            </div>
          )}
          {actions.length > 0 && <div className={css.Actions}>{actions}</div>}
        </div>
      </div>
    </div>
  );
}
