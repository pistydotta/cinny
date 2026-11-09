import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { ApiError } from '../../../utils/blazeroomApi';
import { getGamesPath, getGamesTableGamePath } from '../../../pages/pathUtils';
import { tr } from '../../translation/tr';
import { useCredits } from '../credits/useCredits';
import { createTableGamesApi } from './api';
import { ChessBoard } from './ChessBoard';
import { CardTablesPage } from './CardTablesPage';
import { cardText, gameError, gameName, phaseText, rulesText, shortName } from './text';
import { GameKind, GameTable, TableSummary } from './types';
import * as css from './tableGames.css';

function Rules({ kind }: { kind: GameKind }) {
  return (
    <details className={css.Panel}>
      <summary>{tr('table_games.rules', 'Table rules')}</summary>
      <p className={css.Muted}>{rulesText(kind)}</p>
      {kind !== 'chess' && (
        <p className={css.Muted}>
          {tr(
            'table_games.timeout_rules',
            'Truco gives 15 seconds per turn and Fodinha 2 minutes. When time runs out the game plays for you: in Truco it plays a card or answers a raise, never raising; in Fodinha it bets 0 or plays your first card. A finished round moves on by itself after the same time. Waiting tables expire after 24 hours with a refund. Leaving a started game forfeits your stake. Stakes are play credits only.'
          )}
        </p>
      )}
    </details>
  );
}

function BoardTablesPage({ kind }: { kind: GameKind }) {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const { tableId } = useParams();
  const api = useMemo(() => createTableGamesApi(() => mx.getAccessToken()), [mx]);
  const { balance, refresh } = useCredits();
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [table, setTable] = useState<GameTable>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [stake, setStake] = useState(100);
  const [capacity, setCapacity] = useState(4);
  const [comment, setComment] = useState('');
  const [confirmResign, setConfirmResign] = useState(false);

  const load = useCallback(async () => {
    if (tableId) {
      const next = await api.get(tableId);
      if (next.kind !== kind) throw new ApiError('not_found', 404);
      setTable((prev) =>
        prev && prev.id === next.id && prev.revision > next.revision ? prev : next
      );
    } else setTables(await api.list(kind));
    setLoaded(true);
  }, [api, tableId, kind]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(gameError(e instanceof ApiError ? e.code : undefined));
      }
      if (!cancelled) timer = setTimeout(poll, tableId ? 2000 : 5000);
    };
    poll();
    refresh();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [load, tableId, refresh]);

  const run = async (task: () => Promise<GameTable>) => {
    if (busy) return undefined;
    setBusy(true);
    setError('');
    try {
      const result = await task();
      setTable((prev) =>
        prev && prev.id === result.id && prev.revision > result.revision ? prev : result
      );
      await refresh();
      return result;
    } catch (e) {
      setError(gameError(e instanceof ApiError ? e.code : undefined));
      await load().catch(() => undefined);
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  const act = (action: Record<string, unknown>) => {
    if (table) run(() => api.act(table, action));
  };
  const me = table && table.players[table.mySeat];
  const myTurn = table?.mySeat === table?.turn && table?.mySeat !== -1;

  let resultText = '';
  if (table?.result === 'cancelled')
    resultText = tr('table_games.cancelled', 'Table cancelled · stakes refunded');
  else if (table?.result === 'draw') resultText = tr('table_games.draw', 'Draw');
  else if (table?.winners)
    resultText = tr('table_games.winner', 'Winner: {{names}}', {
      names: table.winners.map((i) => shortName(table.players[i].userId)).join(' + '),
    });

  return (
    <main className={css.Page}>
      <div className={css.Inner}>
        <header className={css.Row}>
          <button
            type="button"
            className={css.Button}
            onClick={() => navigate(tableId ? getGamesTableGamePath(kind) : getGamesPath())}
          >
            {tr('games.action.back', 'Back')}
          </button>
          <h1>{tableId ? table?.name ?? gameName(kind) : gameName(kind)}</h1>
        </header>
        {error && (
          <p role="alert" className={css.Error}>
            {error}
          </p>
        )}
        <Rules kind={kind} />
        {!tableId && (
          <>
            <div className={css.Panel}>
              <h2>{tr('table_games.create', 'Create a table')}</h2>
              <p className={css.Muted}>
                {tr(
                  'table_games.visibility',
                  'Tables are visible to signed-in community members. Open a table to watch; joining as a player is a separate choice.'
                )}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(() => api.create(kind, name, kind === 'chess' ? 0 : stake, capacity)).then(
                    (created) => {
                      if (created) navigate(getGamesTableGamePath(kind, created.id));
                    }
                  );
                }}
              >
                <label className={css.Label} htmlFor="table-name">
                  {tr('table_games.name', 'Table name')}
                  <input
                    id="table-name"
                    className={css.Input}
                    required
                    maxLength={40}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                {kind !== 'chess' && (
                  <label className={css.Label} htmlFor="table-stake">
                    {tr('table_games.stake', 'Credit stake per player (0 = free)')}
                    <input
                      id="table-stake"
                      className={css.Input}
                      type="number"
                      min={0}
                      max={100000}
                      step={1}
                      required
                      value={stake}
                      onChange={(e) => setStake(Number(e.target.value))}
                    />
                  </label>
                )}
                {kind === 'fodinha' && (
                  <label className={css.Label} htmlFor="table-capacity">
                    {tr('table_games.seats', 'Players')}
                    <select
                      id="table-capacity"
                      className={css.Input}
                      value={capacity}
                      onChange={(e) => setCapacity(Number(e.target.value))}
                    >
                      {[2, 3, 4, 5, 6].map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                )}
                {kind !== 'chess' && (
                  <p className={css.Muted}>
                    {tr(
                      'table_games.escrow',
                      'Creating or joining reserves the displayed stake from your card-game wallet. Balance: {{balance}}.',
                      { balance: balance ?? '—' }
                    )}
                  </p>
                )}
                <button type="submit" className={css.Button} disabled={busy}>
                  {tr('table_games.create', 'Create a table')}
                </button>
              </form>
            </div>
            <h2>{tr('table_games.tables', 'Community tables')}</h2>
            {!loaded && <p>{tr('table_games.loading', 'Loading…')}</p>}
            {loaded && !tables.length && (
              <p className={css.Muted}>
                {tr(
                  'table_games.empty_tables',
                  'No tables yet. Create one and invite your friends to open this game.'
                )}
              </p>
            )}
            <div className={css.Grid}>
              {tables.map((s) => (
                <article key={s.id} className={css.Panel}>
                  <h3>{s.name}</h3>
                  <p className={css.Muted}>
                    {phaseText(s.phase)} · {s.players.length}/{s.capacity}
                  </p>
                  <p className={css.Muted}>{s.players.map(shortName).join(' · ')}</p>
                  {kind !== 'chess' && (
                    <p>
                      {tr('table_games.stake_amount', '{{stake}} credits per player', {
                        stake: s.stake,
                      })}
                    </p>
                  )}
                  <button
                    type="button"
                    className={css.Button}
                    onClick={() => navigate(getGamesTableGamePath(kind, s.id))}
                  >
                    {tr('table_games.open', 'Open / watch table')}
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
        {tableId && !table && !error && <p>{tr('table_games.loading', 'Loading…')}</p>}
        {tableId && table && (
          <>
            <div className={css.Row} aria-live="polite">
              <strong>{phaseText(table.phase)}</strong>
              {table.round && (
                <span>{tr('table_games.round', 'Round {{round}}', { round: table.round })}</span>
              )}
              {table.scores && <strong>{table.scores.join(' × ')}</strong>}
              {kind !== 'chess' && (
                <span>
                  {tr('table_games.pot', 'Pot: {{pot}} credits · fixed stake: {{stake}}', {
                    pot: table.stake * table.players.length,
                    stake: table.stake,
                  })}
                </span>
              )}
            </div>
            {table.mySeat < 0 && (
              <p className={css.Muted}>
                {tr('table_games.spectating', 'You are watching this table.')}
              </p>
            )}
            {kind !== 'fodinha' && (
              <div className={css.Players}>
                {table.players.map((p, i) => (
                  <div
                    key={p.userId}
                    className={css.Seat}
                    data-turn={
                      table.phase !== 'finished' && table.phase !== 'waiting' && i === table.turn
                    }
                    data-out={p.eliminated}
                  >
                    <strong>
                      {i + 1}. {shortName(p.userId)}
                    </strong>
                    {kind === 'truco' && (
                      <p>{tr('table_games.team', 'Team {{team}}', { team: (i % 2) + 1 })}</p>
                    )}
                    {kind === 'chess' && (
                      <p>
                        {i === 0
                          ? tr('table_games.white', 'White')
                          : tr('table_games.black', 'Black')}
                      </p>
                    )}
                    {p.eliminated && <p>{tr('table_games.eliminated', 'Eliminated')}</p>}
                    {kind !== 'chess' && (
                      <p className={css.Muted}>
                        {tr('table_games.cards_left', '{{count}} cards', { count: p.cardCount })}
                      </p>
                    )}
                    {kind === 'truco' &&
                      table.phase === 'eleven' &&
                      i !== table.mySeat &&
                      p.cards && <p>{p.cards.map(cardText).join(' ')}</p>}
                  </div>
                ))}
              </div>
            )}
            {table.phase === 'waiting' && (
              <div className={css.Panel}>
                <p className={css.Muted}>
                  {tr(
                    'table_games.wait_full',
                    'The creator starts the game once every seat is filled. Players are seated in joining order.'
                  )}
                </p>
                <div className={css.Row}>
                  {table.mySeat < 0 && table.players.length < table.capacity && (
                    <button
                      type="button"
                      className={css.Button}
                      disabled={busy}
                      onClick={() => run(() => api.join(table.id))}
                    >
                      {kind === 'chess'
                        ? tr('table_games.join_free', 'Join as player (free)')
                        : tr('table_games.join_stake', 'Join · reserve {{stake}} credits', {
                            stake: table.stake,
                          })}
                    </button>
                  )}
                  {table.ownerId === mx.getUserId() && (
                    <>
                      <button
                        type="button"
                        className={css.Button}
                        disabled={busy || table.players.length !== table.capacity}
                        onClick={() => act({ type: 'start' })}
                      >
                        {tr('table_games.start', 'Start game')}
                      </button>
                      <button
                        type="button"
                        className={css.Button}
                        disabled={busy}
                        onClick={() => act({ type: 'cancel' })}
                      >
                        {tr('table_games.cancel', 'Cancel table and refund stakes')}
                      </button>
                    </>
                  )}
                  {me && table.ownerId !== mx.getUserId() && (
                    <button
                      type="button"
                      className={css.Button}
                      disabled={busy}
                      onClick={() => act({ type: 'leave' })}
                    >
                      {tr('table_games.leave', 'Leave and refund stake')}
                    </button>
                  )}
                </div>
              </div>
            )}
            {table.phase === 'finished' && (
              <div className={css.Panel} role="status">
                <h2>{resultText}</h2>
                {kind !== 'chess' && table.result !== 'cancelled' && (
                  <p>
                    {tr(
                      'table_games.paid',
                      'The pot has been paid into the winner’s card-game wallet.'
                    )}
                  </p>
                )}
              </div>
            )}
            {kind === 'chess' && (
              <div className={css.ChessLayout}>
                {table.board ? (
                  <ChessBoard key={table.id} table={table} busy={busy} onMove={act} />
                ) : (
                  <p className={css.Muted}>
                    {tr('table_games.board_wait', 'The board appears when the game starts.')}
                  </p>
                )}
                <aside className={css.Panel}>
                  <h2>{tr('table_games.comments', 'Table comments')}</h2>
                  <p className={css.Muted}>
                    {tr(
                      'table_games.comments_hint',
                      'Players and spectators can comment. Everyone at the table can read these messages.'
                    )}
                  </p>
                  <div
                    className={css.Comments}
                    role="log"
                    aria-label={tr('table_games.comments', 'Table comments')}
                  >
                    {table.comments.map((c) => (
                      <p key={c.id}>
                        <strong>{shortName(c.userId)}: </strong>
                        {c.text}
                      </p>
                    ))}
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(() => api.comment(table.id, comment)).then((result) => {
                        if (result) setComment('');
                      });
                    }}
                  >
                    <label className={css.Label} htmlFor="table-comment">
                      {tr('table_games.comment', 'Comment')}
                      <input
                        id="table-comment"
                        className={css.Input}
                        maxLength={500}
                        required
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                    </label>
                    <button type="submit" className={css.Button} disabled={busy || !comment.trim()}>
                      {tr('table_games.send', 'Send')}
                    </button>
                  </form>
                </aside>
              </div>
            )}
            {me && !me.eliminated && table.phase !== 'waiting' && table.phase !== 'finished' && (
              <div className={css.Row}>
                {kind === 'chess' && (
                  <p>
                    {myTurn
                      ? tr('table_games.your_turn', 'Your turn')
                      : tr('table_games.wait_turn', 'Waiting for another player…')}
                  </p>
                )}
                {confirmResign ? (
                  <>
                    <span>
                      {tr(
                        'table_games.resign_confirm',
                        'Forfeit this game? Your stake will not be refunded.'
                      )}
                    </span>
                    <button
                      type="button"
                      className={css.Button}
                      disabled={busy}
                      onClick={() => {
                        setConfirmResign(false);
                        act({ type: 'resign' });
                      }}
                    >
                      {tr('table_games.resign_yes', 'Yes, resign')}
                    </button>
                    <button
                      type="button"
                      className={css.Button}
                      onClick={() => setConfirmResign(false)}
                    >
                      {tr('table_games.keep_playing', 'Keep playing')}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={css.Button}
                    onClick={() => setConfirmResign(true)}
                  >
                    {tr('table_games.resign', 'Resign')}
                  </button>
                )}
              </div>
            )}
            {kind !== 'chess' &&
              table.deadline &&
              table.phase !== 'waiting' &&
              table.phase !== 'finished' && (
                <p className={css.Muted}>
                  {tr('table_games.deadline', 'Turn deadline: {{time}}', {
                    time: new Date(table.deadline).toLocaleTimeString(),
                  })}
                </p>
              )}
          </>
        )}
      </div>
    </main>
  );
}

export function TableGamesPage({ kind }: { kind: GameKind }) {
  return kind === 'chess' ? <BoardTablesPage kind={kind} /> : <CardTablesPage kind={kind} />;
}
