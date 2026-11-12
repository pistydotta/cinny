import React, {
  createContext,
  CSSProperties,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
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
import { GamePlayer, GameTable, TableCard, TrucoResponse, TrucoTrick } from './types';
import { TrucoDeck } from './trucoDeck';
import { hasScene, trucoScene } from './trucoScene';
import * as css from './tentos.css';
import barArt from '../art/truco-bar.webp';
import spanishDeck from '../art/truco-spanish-deck.png';
import paulistaBack from '../art/truco-paulista/B-1.svg';

// How long a finished trick stays on the felt after it closes, even if the next one starts
// (bots answer at once, and the others only poll every two seconds).
const HOLD_MS = 2500;
const RESULT_MS = 4000;
const NEXT_HAND_REVEAL_MS = 900;
const TRUCO_RESPONSE_MS = 30_000;
const RING_RADIUS = 24;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const px = (p: { x: number; y: number }): CSSProperties => ({ left: p.x, top: p.y });
const SUIT: Record<string, string> = { d: '♦', s: '♠', h: '♥', c: '♣', r: '★', b: '★' };
const SPANISH_SUITS = ['d', 'h', 's', 'c'];
const SPANISH_RANKS: Record<string, string> = { A: '1', J: '10', Q: '11', K: '12' };
const DeckContext = createContext<TrucoDeck | undefined>(undefined);
const PAULISTA_FACES = import.meta.glob<string>('../art/truco-paulista/[CDHS]-*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});
const spanishRank = (rank: string) => SPANISH_RANKS[rank] ?? rank;
const suitName = (suit: string) =>
  ({
    d: tr('table_games.suit_d', 'diamonds'),
    s: tr('table_games.suit_s', 'spades'),
    h: tr('table_games.suit_h', 'hearts'),
    c: tr('table_games.suit_c', 'clubs'),
  }[suit] ?? suit);
const spanishSuitName = (suit: string) =>
  ({
    d: tr('table_games.spanish_coins', 'coins'),
    h: tr('table_games.spanish_cups', 'cups'),
    s: tr('table_games.spanish_swords', 'swords'),
    c: tr('table_games.spanish_batons', 'batons'),
  }[suit] ?? suit);
const cardName = (card: TableCard, deck?: TrucoDeck) =>
  tr('table_games.card_name', '{{rank}} of {{suit}}', {
    rank: deck === 'spanish' ? spanishRank(card.rank) : card.rank,
    suit: deck === 'spanish' ? spanishSuitName(card.suit) : suitName(card.suit),
  });
const cardIndex = (card: TableCard, deck?: TrucoDeck) =>
  deck === 'spanish'
    ? `${spanishRank(card.rank)} · ${spanishSuitName(card.suit)}`
    : `${card.rank}${SUIT[card.suit]}`;

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
  const deck = useContext(DeckContext);
  const face = !back && !!card && !card.covered;
  let artwork: CSSProperties | undefined;
  if (deck === 'spanish') {
    // The sprite has one row per Spanish suit in rank order, then a row with the back.
    const column = face ? Number(spanishRank(card.rank)) - 1 : 1;
    const row = face ? SPANISH_SUITS.indexOf(card.suit) : 4;
    artwork = { backgroundPosition: `${(column * 100) / 11}% ${row * 25}%` };
  } else if (deck === 'paulista') {
    const image = face
      ? PAULISTA_FACES[`../art/truco-paulista/${card.suit.toUpperCase()}-${card.rank}.svg`]
      : paulistaBack;
    artwork = { backgroundImage: `url(${image})` };
  }
  return (
    <div
      className={css.Card}
      data-deck={deck}
      data-back={!face}
      data-red={face && isRed(card)}
      data-win={win || undefined}
      data-dim={dim || undefined}
      style={artwork}
      role="img"
      aria-label={
        face && card ? cardName(card, deck) : tr('games.table.face_down', 'Face-down card')
      }
    >
      {face && !deck && (
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

const raiseRequest = (value: number) =>
  tr('table_games.raise_request', 'Ask for {{raise}}', {
    raise: raiseName(value).replace(/!$/, '').toLocaleLowerCase(),
  });

function RaiseCards() {
  return (
    <span className={css.RaiseCards} aria-hidden="true">
      <span>A♣</span>
    </span>
  );
}

function TrucoCall({
  table,
  busy,
  nameOf,
  avatarOf,
  onAct,
}: {
  table: GameTable;
  busy: boolean;
  nameOf: (id: string) => string;
  avatarOf: (id: string) => string | undefined;
  onAct: (action: Record<string, unknown>) => void;
}) {
  const [selected, setSelected] = useState<TrucoResponse>();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  const { pending, mySeat, turn, players, deadline } = table;
  if (!pending || turn === null) return null;
  const decision = mySeat === turn;
  const responding = mySeat >= 0 && mySeat % 2 === turn % 2 && !players[mySeat]?.eliminated;
  const asker = pending.raisedBy === undefined ? undefined : players[pending.raisedBy];
  const title = asker
    ? tr('table_games.raise_called_by', '{{name}} asked for {{raise}}', {
        name: nameOf(asker.userId),
        raise: raiseName(pending.value).replace(/!$/, '').toLocaleLowerCase(),
      })
    : tr('table_games.asked', '{{team}} asked for {{raise}}', {
        team:
          pending.team === ourTeam(table) && mySeat >= 0
            ? tr('table_games.us_cap', 'We')
            : tr('table_games.them_cap', 'They'),
        raise: raiseName(pending.value),
      });
  const remaining =
    deadline === null
      ? TRUCO_RESPONSE_MS
      : Math.max(0, Math.min(TRUCO_RESPONSE_MS, deadline - now));
  const seconds = Math.ceil(remaining / 1000);
  const options: { choice: TrucoResponse; label: string }[] = [
    { choice: 'accept', label: tr('table_games.accept', 'Accept') },
    { choice: 'decline', label: tr('table_games.run', 'Run') },
  ];
  if (pending.value < 12)
    options.splice(1, 0, { choice: 'raise', label: raiseRequest(nextRaise(pending.value)) });
  const instruction = decision
    ? tr('table_games.raise_your_decision', 'Your call')
    : tr('table_games.raise_decider', '{{name}} decides', { name: nameOf(players[turn].userId) });
  const partner = decision && players.find((_, seat) => seat !== turn && seat % 2 === turn % 2);
  const partnerName = partner ? nameOf(partner.userId) : tr('table_games.partner_mark', 'Partner');
  const partnerAvatar = partner ? avatarOf(partner.userId) : undefined;
  let hint = tr('table_games.raise_choose_hint', 'Choose and confirm your answer.');
  if (!decision) hint = tr('table_games.raise_suggest_hint', 'Choose an option to suggest it.');
  else if (pending.suggestion)
    hint = tr('table_games.raise_agree_hint', 'Tap your partner’s choice to agree.');
  return (
    <section className={css.TrucoCall} aria-label={title}>
      <div className={css.TrucoCallHeader}>
        <div role="status">
          <strong>{title}</strong>
          <span className={css.TrucoCallDetail}>
            {tr('table_games.raise_points', '{{n}} points', { n: pending.value })} · {instruction}
          </span>
        </div>
        <span className={css.TrucoCallClock} aria-label={tr('table_games.time_left', 'Time left')}>
          {seconds} s
        </span>
      </div>
      <div
        className={css.TrucoCallTimer}
        role="progressbar"
        aria-label={tr('table_games.time_left', 'Time left')}
        aria-valuemin={0}
        aria-valuemax={TRUCO_RESPONSE_MS / 1000}
        aria-valuenow={seconds}
        data-urgent={seconds <= 8}
      >
        <div style={{ transform: `scaleX(${remaining / TRUCO_RESPONSE_MS})` }} />
      </div>
      {responding && (
        <div className={css.TrucoCallActions}>
          {options.map(({ choice, label }) => {
            const suggested = pending.suggestion === choice;
            const partnerVote = decision && suggested;
            return (
              <button
                key={choice}
                type="button"
                className={css.TrucoCallOption}
                data-partner-vote={partnerVote || undefined}
                aria-pressed={decision ? selected === choice : suggested}
                disabled={busy || seconds === 0}
                onClick={() => {
                  if (!decision) onAct({ type: 'suggest', choice });
                  else if (pending.suggestion === choice)
                    onAct({ type: choice, fromSuggestion: true });
                  else setSelected(choice);
                }}
              >
                <span className={css.TrucoCallOptionLabel}>{label}</span>
                {partnerVote && (
                  <span className={css.TrucoPartnerMark} title={partnerName}>
                    <span className={css.TrucoPartnerAvatar} aria-hidden="true">
                      {partnerAvatar ? (
                        <img src={partnerAvatar} alt="" />
                      ) : (
                        partnerName.replace(/^Bot /, '').slice(0, 2).toUpperCase()
                      )}
                    </span>
                    <span>{tr('table_games.raise_partner_vote', 'Partner voted')}</span>
                  </span>
                )}
              </button>
            );
          })}
          {decision && selected && selected !== pending.suggestion && (
            <button
              type="button"
              className={css.TrucoCallOption}
              data-confirm
              disabled={busy || seconds === 0}
              onClick={() => onAct({ type: selected })}
            >
              {tr('table_games.raise_confirm', 'Confirm action')}
            </button>
          )}
          <span className={css.TrucoCallHint} role="status">
            {hint}
          </span>
        </div>
      )}
    </section>
  );
}

// Truco "riscos": one stroke per point, bundled in fives (the fifth strikes the four).
function Riscos({ n, ours }: { n: number; ours: boolean }) {
  const groups = Array.from({ length: Math.ceil(n / 5) }, (_, g) => Math.min(5, n - g * 5));
  return (
    <span className={css.Riscos} aria-hidden>
      {groups.map((count, g) => (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={g}
          className={css.RiscoGroup}
          data-ours={ours || undefined}
          data-five={count === 5 || undefined}
        >
          {Array.from({ length: Math.min(4, count) }, (_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <span key={i} className={css.Risco} />
          ))}
        </span>
      ))}
    </span>
  );
}

function Tally({ table }: { table: GameTable }) {
  const ours = ourTeam(table);
  const scores = table.scores ?? [0, 0];
  const live = table.phase !== 'waiting' && table.phase !== 'finished';
  const row = (team: number, label: string) => (
    <div className={css.ScoreRow}>
      <span className={css.ScoreTeam}>{label}</span>
      <span className={css.ScoreNum} data-ours={team === ours || undefined}>
        {scores[team]}
      </span>
      <Riscos n={scores[team]} ours={team === ours} />
    </div>
  );
  return (
    <div
      className={css.Score}
      aria-label={tr('table_games.score_label', 'Score: us {{us}}, them {{them}}', {
        us: scores[ours],
        them: scores[1 - ours],
      })}
    >
      {row(
        ours,
        table.mySeat >= 0 ? tr('table_games.us_cap', 'We') : tr('table_games.pair_1', 'pair 1')
      )}
      {row(
        1 - ours,
        table.mySeat >= 0 ? tr('table_games.them_cap', 'They') : tr('table_games.pair_2', 'pair 2')
      )}
      {live && (table.value ?? 1) > 1 && (
        <div className={css.CenterLine}>
          {tr('table_games.worth', 'hand worth {{value}}', { value: table.value ?? 1 })}
        </div>
      )}
    </div>
  );
}

function HandTricks({ table, nameOf }: { table: GameTable; nameOf: (id: string) => string }) {
  const marks = trickMarks(table);
  const current = table.tricks?.length ?? 0;
  const active = table.phase === 'play' || table.phase === 'respond' || table.phase === 'eleven';
  const heading = tr('table_games.hand_tricks', 'Tricks this hand');
  return (
    <section className={css.HandTricks} aria-label={heading}>
      <span className={css.HandTricksHeading}>{heading}</span>
      <ol className={css.HandTricksList}>
        {marks.map((mark, index) => {
          const number = index + 1;
          const result = table.recentTricks?.find(
            (t) => t.round === table.round && t.number === number
          );
          const winner = result?.winner;
          const player = winner && table.players[winner.seat];
          let label = '—';
          if (winner && player) {
            label =
              winner.seat === table.mySeat ? tr('table_games.you', 'You') : nameOf(player.userId);
          } else if (mark === 'tie') {
            label = tr('table_games.truco_trick_tied', 'Tie');
          } else if (mark === 'us') {
            label =
              table.mySeat >= 0
                ? tr('table_games.us_cap', 'We')
                : tr('table_games.pair_1', 'pair 1');
          } else if (mark === 'them') {
            label =
              table.mySeat >= 0
                ? tr('table_games.them_cap', 'They')
                : tr('table_games.pair_2', 'pair 2');
          } else if (active && index === current) {
            label = tr('table_games.trick_in_play', 'In play');
          }
          return (
            <li key={number} data-mark={mark}>
              <span aria-hidden="true">{number}ª</span>
              <span className={css.HandTricksName} title={label}>
                {label}
              </span>
              {winner && <PlayingCard card={winner.card} />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function TrucoMatchResult({
  table,
  nameOf,
  avatarOf,
  style,
  actions,
}: {
  table: GameTable;
  nameOf: (id: string) => string;
  avatarOf: (id: string) => string | undefined;
  style?: CSSProperties;
  actions: React.ReactNode[];
}) {
  const winners = (table.winners ?? []).filter((seat) => table.players[seat]);
  const winningTeam = winners.length ? winners[0] % 2 : undefined;
  const { scores } = table;
  let title = tr('table_games.truco_match_winners', 'Winning pair');
  if (!winners.length) title = tr('table_games.match_ended', 'Match ended');
  else if (table.mySeat >= 0)
    title = winners.includes(table.mySeat)
      ? tr('table_games.truco_match_won', 'Your pair won')
      : tr('table_games.truco_match_lost', 'The other pair won');

  return (
    <div className={css.MatchResult} role="status" style={style}>
      <div className={css.MatchResultHeader}>
        <strong>{title}</strong>
        {winningTeam !== undefined && scores?.length === 2 && (
          <span className={css.MatchResultScore}>
            {scores[winningTeam]}–{scores[1 - winningTeam]}
          </span>
        )}
      </div>
      {winners.length > 0 && (
        <ul className={css.MatchResultPlayers}>
          {winners.map((seat) => {
            const { userId } = table.players[seat];
            const name = nameOf(userId);
            const avatar = avatarOf(userId);
            return (
              <li key={userId} className={css.MatchResultPlayer}>
                <span className={css.MatchResultAvatar} aria-hidden="true">
                  {avatar ? (
                    <img className={css.AvatarImage} src={avatar} alt="" />
                  ) : (
                    name.replace(/^Bot /, '').slice(0, 2).toUpperCase()
                  )}
                </span>
                <span>{name}</span>
              </li>
            );
          })}
        </ul>
      )}
      {actions.length > 0 && <div className={css.MatchResultActions}>{actions}</div>}
    </div>
  );
}

function TrucoHandResult({
  table,
  style,
  actions,
}: {
  table: GameTable;
  style?: CSSProperties;
  actions: React.ReactNode[];
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), NEXT_HAND_REVEAL_MS);
    return () => clearTimeout(timer);
  }, []);
  const { handWinner, handPoints, mySeat } = table;
  let result = tr('table_games.hand_tied', 'Nobody scores this hand');
  if (handWinner != null) {
    let team;
    if (mySeat < 0) team = tr('table_games.hand_pair', 'Pair {{n}}', { n: handWinner + 1 });
    else
      team =
        handWinner === ourTeam(table)
          ? tr('table_games.hand_our_pair', 'Your pair')
          : tr('table_games.hand_other_pair', 'The other pair');
    result = tr('table_games.hand_result', '{{team}} won the hand', { team });
  }
  return (
    <div className={css.TrucoHandResult} style={style}>
      <div className={css.TrucoHandOutcome} role="status">
        <strong>{result}</strong>
        {!!handPoints && <span className={css.MatchResultScore}>+{handPoints}</span>}
      </div>
      {actions.length > 0 && (
        <div className={css.TrucoNextHand} style={{ visibility: ready ? 'visible' : 'hidden' }}>
          {actions}
        </div>
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
  const turnTime = table.phase === 'respond' ? TRUCO_RESPONSE_MS : turnMs(table.kind);
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
  const truco = table.kind === 'truco';
  const shown = !hero && player.cards?.length ? player.cards : null;
  // Truco shows each other player's hand as three dots, one lit per card still held, by their
  // name. Fodinha keeps the face-down fan above the avatar since its hands run past three.
  const left = !hero && !shown && table.phase !== 'waiting' ? player.cardCount : 0;
  const backs = truco ? 0 : left;
  const pips = truco ? left : 0;
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
      <div
        className={css.Avatar}
        data-turn={turn}
        data-timed={turn && !!table.deadline}
        data-play-turn={truco && hero && turn && table.phase === 'play'}
      >
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
      {pips > 0 && (
        <div
          className={css.Pips}
          aria-label={
            pips === 1
              ? tr('table_games.card_left', '1 card left')
              : tr('table_games.cards_left', '{{count}} cards left', { count: pips })
          }
        >
          {Array.from({ length: 3 }, (_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <span key={i} className={css.Pip} data-on={i < pips} />
          ))}
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

function TrucoResults({ table, nameOf }: { table: GameTable; nameOf: (userId: string) => string }) {
  const deck = useContext(DeckContext);
  const recent = table.recentTricks;
  const seen = useRef(recent?.at(-1));
  const [visible, setVisible] = useState<{ trick: TrucoTrick; expiresAt: number }[]>([]);
  useEffect(() => {
    if (!recent?.length) return;
    const previous = seen.current;
    const fresh = recent.filter(
      ({ round, number }) =>
        !previous ||
        round > previous.round ||
        (round === previous.round && number > previous.number)
    );
    if (!fresh.length) return;
    seen.current = fresh.at(-1);
    const expiresAt = performance.now() + RESULT_MS;
    setVisible((current) => [...current, ...fresh.map((trick) => ({ trick, expiresAt }))]);
  }, [recent]);
  const nextExpiry = visible[0]?.expiresAt;
  useEffect(() => {
    if (nextExpiry === undefined) return undefined;
    const timer = setTimeout(() => {
      setVisible((current) => current.filter(({ expiresAt }) => expiresAt > nextExpiry));
    }, Math.max(0, Math.ceil(nextExpiry - performance.now())));
    return () => clearTimeout(timer);
  }, [nextExpiry]);

  if (!visible.length) return null;
  return (
    <div className={css.TrickResults} role="status">
      {visible.map(({ trick: { round, number, winner, closingPlay } }) => {
        const winningPlayer = winner && table.players[winner.seat];
        const closingPlayer = table.players[closingPlay.seat];
        return (
          <div key={`${round}:${number}`} className={css.TrickNotice}>
            {winner && <PlayingCard card={winner.card} />}
            <div>
              <div className={css.TrickNoticeTitle}>
                {tr('table_games.truco_trick_number', 'Trick {{number}}', { number })}
              </div>
              <div>
                {winner && winningPlayer
                  ? tr('table_games.truco_trick_winner', '{{name}} won with {{card}}', {
                      name: nameOf(winningPlayer.userId),
                      card: cardName(winner.card, deck),
                    })
                  : tr('table_games.truco_trick_tied', 'Tie')}
              </div>
              {closingPlayer && winner?.seat !== closingPlay.seat && (
                <div className={css.TrickNoticeDetail}>
                  {tr('table_games.truco_trick_closed', 'Last play: {{name}} · {{card}}', {
                    name: nameOf(closingPlayer.userId),
                    card: closingPlay.card.covered
                      ? tr('games.table.face_down', 'Face-down card')
                      : cardName(closingPlay.card, deck),
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type TentosTableProps = {
  table: GameTable;
  deck?: TrucoDeck;
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
  deck,
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
  const showTrucoResult = truco && phase === 'finished' && table.result !== 'cancelled';
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
  const vira = live ? table.vira : undefined;
  const manilha = vira && manilhaRank(vira);
  const viraLabel = manilha
    ? tr('table_games.manilha_short', 'vira · manilha {{rank}}', {
        rank: deck === 'spanish' ? spanishRank(manilha) : manilha,
      })
    : undefined;
  const me = mySeat >= 0 ? table.players[mySeat] : undefined;
  const active = !!me && !me.eliminated;
  const myTurn = active && table.turn === mySeat;
  const turnName =
    table.turn !== null && table.players[table.turn]
      ? nameOf(table.players[table.turn].userId)
      : '';
  const answering = truco && active && phase === 'eleven' && mySeat % 2 === table.decisionTeam;

  // The center shows the current event and the results of the hand.
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
    if (!showTrucoResult)
      title =
        table.result === 'cancelled'
          ? tr('table_games.cancelled', 'Table cancelled · stakes refunded')
          : tr('table_games.winner', 'Winner: {{names}}', {
              names: (table.winners ?? []).map((i) => nameOf(table.players[i].userId)).join(' + '),
            });
  } else if (truco) {
    if (table.iron && phase !== 'round_end')
      callout = tr('table_games.iron_short', 'Iron hand: everyone plays blind');
    if (phase === 'eleven') callout = tr('table_games.eleven_short', 'Hand of eleven');
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
  if (!truco && took && (phase === 'play' || phase === 'predict' || held)) {
    if (took.kind === 'tie')
      trickLine = tr('table_games.trick_tied_nobody', 'Tied: nobody takes it');
    else if (took.seat === mySeat) trickLine = tr('table_games.trick_you', 'You took the trick');
    else
      trickLine = tr('table_games.trick_name', '{{name}} took the trick', {
        name: nameOf(table.players[took.seat].userId),
      });
  }
  const blind = active && !me.cards && me.cardCount > 0;
  const hand: { card?: TableCard; index: number }[] = blind
    ? Array.from({ length: me.cardCount }, (_, index) => ({ index }))
    : (me?.cards ?? [])
        .map((card, index) => ({ card, index }))
        .sort((a, b) =>
          truco ? 0 : handOrder(a.card, table.vira) - handOrder(b.card, table.vira)
        );
  const showHand = live && active && hand.length > 0;
  const fannedHand = truco && showHand;
  const seatAt = (seat: number): CSSProperties => {
    if (!scene) return pct(ring[seat]);
    const point = scene.seats[seat];
    if (seat !== mySeat || (!fannedHand && phase !== 'round_end')) return px(point);
    // Reserve the full three-card fan so the avatar stays in place as cards are played.
    const fanHalfWidth = (3 * scene.handCard - 16) / 2;
    const tiltedCardOverhang = Math.ceil(scene.handCard * 0.35);
    const avatarAndGap = 38;
    return px({
      ...point,
      x: Math.max(33, point.x - fanHalfWidth - tiltedCardOverhang - avatarAndGap),
    });
  };
  const playedAt = (seat: number): CSSProperties => {
    if (!scene) return pct(toward(center, ring[seat] ?? center, 0.56));
    return px(scene.played[seat]);
  };
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
  else if (phase === 'eleven')
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
    if (!truco)
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
    actions.push(
      pill(
        'accept',
        tr('table_games.play_for_3', 'Play for 3'),
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
  }
  const canRaise =
    truco &&
    phase === 'play' &&
    myTurn &&
    !table.eleven &&
    (table.value ?? 1) < 12 &&
    table.lastRaise !== mySeat % 2;
  const trucoCenterActions = truco && (phase === 'waiting' || phase === 'eleven');

  const handCards = showHand && (
    <div
      className={css.Hand}
      data-many={hand.length > 7}
      data-fanned={fannedHand}
      data-play-turn={truco && myTurn && phase === 'play'}
      style={scene ? ({ '--hand-card-w': `${scene.handCard}px` } as CSSProperties) : undefined}
    >
      {hand.map(({ card, index }, position) => {
        const offset = position - (hand.length - 1) / 2;
        return (
          <button
            key={card ? `${card.rank}${card.suit}` : `back-${index}`}
            type="button"
            className={css.HandButton}
            style={
              fannedHand
                ? ({
                    '--hand-angle': `${offset * 13}deg`,
                    '--hand-drop': `${Math.abs(offset) * 7}px`,
                  } as CSSProperties)
                : undefined
            }
            disabled={!canPlay}
            aria-label={
              card ? undefined : tr('table_games.play_blind', 'Play your card without seeing it')
            }
            onClick={() => play(index)}
          >
            <PlayingCard card={card} back={!card} />
          </button>
        );
      })}
    </div>
  );

  return (
    <DeckContext.Provider value={deck}>
      <div
        className={css.Screen}
        style={
          deck
            ? ({
                '--truco-art': `url(${spanishDeck})`,
              } as CSSProperties)
            : undefined
        }
      >
        <div ref={stage} className={css.Stage}>
          {truco ? (
            <>
              <div className={css.Corner} data-side="left">
                <button type="button" className={css.TrucoBack} onClick={onBack}>
                  <span aria-hidden="true">←</span>
                  {tr('table_games.back_to_tables', 'Back to tables')}
                </button>
              </div>
              <span className={css.TrucoTableName} title={table.name}>
                {table.name}
              </span>
              {phase !== 'waiting' && (
                <div className={css.TrucoScoreboard}>
                  <Tally table={table} />
                  <HandTricks table={table} nameOf={nameOf} />
                </div>
              )}
            </>
          ) : (
            <div className={css.Corner} data-side="left">
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
            </div>
          )}
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
            {showTrucoResult && (
              <TrucoMatchResult
                table={table}
                nameOf={nameOf}
                avatarOf={avatarOf}
                style={scene ? { ...px(scene.door), top: Math.max(112, scene.door.y) } : undefined}
                actions={actions}
              />
            )}
            {truco && phase === 'round_end' && (
              <TrucoHandResult
                key={table.round}
                table={table}
                actions={actions}
                style={
                  scene
                    ? px({
                        x: scene.door.x,
                        y: Math.max(
                          146,
                          scene.seats[(Math.max(mySeat, 0) + seats / 2) % seats].y - 54
                        ),
                      })
                    : undefined
                }
              />
            )}
            {((!scene && vira) || title || line || callout || trickLine) && (
              <div
                className={css.Center}
                aria-live="polite"
                style={scene ? px(scene.door) : undefined}
              >
                {!scene && vira && (
                  <>
                    <PlayingCard card={vira} />
                    <div className={css.CenterLine}>{viraLabel}</div>
                  </>
                )}
                {title && <div className={css.CenterTitle}>{title}</div>}
                {line && <div className={css.CenterLine}>{line}</div>}
                {callout && <div className={css.Callout}>{callout}</div>}
                {trickLine && (
                  <div className={css.Callout} data-quiet="true">
                    {trickLine}
                  </div>
                )}
                {trucoCenterActions && status && (
                  <div className={css.TrucoCenterStatus}>{status}</div>
                )}
                {trucoCenterActions && actions.length > 0 && (
                  <div className={css.TrucoCenterActions}>{actions}</div>
                )}
              </div>
            )}

            {placedCards(felt).map(({ seat, card, latest, win, dim }) => (
              <div
                key={seat}
                className={css.Placed}
                data-scene={!!scene}
                style={
                  {
                    ...playedAt(seat),
                    '--card-w': `${scene ? scene.card + 13 : 44}px`,
                    '--tilt': `${[-4, 3, -2, 4][seat % 4]}deg`,
                  } as CSSProperties
                }
              >
                {scene ? (
                  <div className={css.CardOnTable}>
                    <PlayingCard card={card} win={win} />
                  </div>
                ) : (
                  <PlayingCard card={card} win={win} dim={dim} />
                )}
                <span
                  className={css.PlacedName}
                  data-latest={latest}
                  data-win={win}
                  data-card-index={scene && seat === mySeat && !card.covered ? true : undefined}
                >
                  {seat === mySeat
                    ? tr('table_games.you', 'You')
                    : nameOf(table.players[seat].userId)}
                  {scene && seat === mySeat && !card.covered && (
                    <strong className={css.PlayedIndex} aria-hidden="true">
                      {cardIndex(card, deck)}
                    </strong>
                  )}
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

            {scene && vira && (
              <div
                className={css.SceneVira}
                role="group"
                aria-label={viraLabel}
                title={viraLabel}
                style={
                  {
                    ...px(scene.vira),
                    '--card-w': `${scene.viraCard}px`,
                    '--vira-extension': `${
                      scene.viraCard * (deck === 'spanish' ? 319 / 208 : 1.4) * 0.85
                    }px`,
                  } as CSSProperties
                }
              >
                <div className={css.ViraStack}>
                  <div className={css.ViraFace}>
                    <PlayingCard card={vira} />
                  </div>
                  <div className={css.ViraDeck} aria-hidden="true">
                    <PlayingCard back />
                    <PlayingCard back />
                  </div>
                </div>
              </div>
            )}
            {truco && phase === 'respond' && table.pending && (
              <div
                key={`${table.id}:${table.round}:${table.pending.value}`}
                className={css.TrucoStrike}
                style={
                  scene
                    ? px({
                        x: scene.vira.x,
                        y: scene.vira.y + Math.ceil(scene.viraCard * 0.68) + 20,
                      })
                    : undefined
                }
                aria-hidden="true"
              >
                <PlayingCard back />
                <PlayingCard back />
              </div>
            )}
          </div>
          {fannedHand && handCards}
          {truco && phase === 'play' && status && (
            <div className={css.TrucoPlayStatus} role="status">
              {status}
            </div>
          )}
          {truco && phase === 'play' && (canRaise || actions.length > 0) && (
            <div
              className={css.TrucoPlayActions}
              style={{ '--hand-card-w': `${scene?.handCard ?? 52}px` } as CSSProperties}
            >
              {actions}
              {canRaise && (
                <button
                  type="button"
                  className={css.TrucoAsk}
                  disabled={busy}
                  onClick={() => onAct({ type: 'raise' })}
                >
                  <RaiseCards />
                  {nextRaise(table.value) === 3
                    ? tr('table_games.truco_call_button', 'Call truco')
                    : raiseRequest(nextRaise(table.value))}
                </button>
              )}
            </div>
          )}
          {truco && (
            <div className={css.TrucoOverlays} data-responding={phase === 'respond'}>
              {phase === 'respond' && (
                <TrucoCall
                  key={`${table.id}:${table.version}`}
                  table={table}
                  busy={busy}
                  nameOf={nameOf}
                  avatarOf={avatarOf}
                  onAct={onAct}
                />
              )}
              <TrucoResults key={table.id} table={table} nameOf={nameOf} />
            </div>
          )}
        </div>

        {!truco && (
          <div className={css.Bar}>
            {status && (
              <div className={css.Status} data-mine={myTurn}>
                {status}
              </div>
            )}
            {(showHand || actions.length > 0) && (
              <div className={css.BarRow}>
                {handCards}
                {actions.length > 0 && <div className={css.Actions}>{actions}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </DeckContext.Provider>
  );
}
