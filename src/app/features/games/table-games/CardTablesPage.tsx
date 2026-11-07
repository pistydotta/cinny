import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { friendAvatarUrl, friendDisplayName } from '../../friends/userDisplay';
import { ApiError } from '../../../utils/blazeroomApi';
import { getGamesPath, getGamesTableGamePath } from '../../../pages/pathUtils';
import { tr } from '../../translation/tr';
import { useCredits } from '../credits/useCredits';
import { createTableGamesApi } from './api';
import { FodinhaScreen } from './FodinhaScreen';
import { SeatsSheet } from './SeatsSheet';
import { TentosTable } from './TentosTable';
import { botName, isBotId } from './tentosView';
import { gameError, gameName, phaseText } from './text';
import { GameTable, TableSummary } from './types';
import * as css from './tentos.css';

type CardKind = 'truco' | 'fodinha';
const STAKES = [0, 50, 100, 500];

function CreateForm({
  kind,
  busy,
  balance,
  onCreate,
}: {
  kind: CardKind;
  busy: boolean;
  balance?: number;
  onCreate: (name: string, stake: number, capacity: number) => void;
}) {
  const [name, setName] = useState('');
  const [stake, setStake] = useState(0);
  const [capacity, setCapacity] = useState(4);
  return (
    <form
      className={css.Form}
      onSubmit={(e) => {
        e.preventDefault();
        onCreate(name, stake, kind === 'truco' ? 4 : capacity);
      }}
    >
      <label className={css.Field} htmlFor="table-name">
        {tr('table_games.name', 'Table name')}
        <input
          id="table-name"
          className={css.Input}
          required
          maxLength={40}
          value={name}
          placeholder={tr('table_games.name_example', 'Friday night')}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className={css.Field}>
        {tr('table_games.stake_label', 'Stake per player')}
        <div className={css.Choices}>
          {STAKES.map((n) => (
            <button
              key={n}
              type="button"
              className={css.Pill}
              aria-pressed={stake === n}
              onClick={() => setStake(n)}
            >
              {n
                ? tr('table_games.credits_n', '{{n}} credits', { n })
                : tr('table_games.free', 'free')}
            </button>
          ))}
        </div>
      </div>
      {kind === 'fodinha' && (
        <div className={css.Field}>
          {tr('table_games.seats', 'Players')}
          <div className={css.Choices}>
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                type="button"
                className={css.Pill}
                aria-pressed={capacity === n}
                onClick={() => setCapacity(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className={`${css.Grow} ${css.Muted}`}>
          {stake
            ? tr(
                'table_games.escrow',
                'Creating or joining reserves the displayed stake from your card-game wallet. Balance: {{balance}}.',
                { balance: balance ?? '—' }
              )
            : tr('table_games.bots_hint', 'Invite friends or fill the empty seats with bots.')}
        </span>
        <button type="submit" className={css.Pill} data-primary="true" disabled={busy}>
          {tr('table_games.create_short', 'Create table')}
        </button>
      </div>
    </form>
  );
}

/** Truco and Fodinha: a quiet lobby, then a screen that is only the table. */
export function CardTablesPage({ kind }: { kind: CardKind }) {
  const mx = useMatrixClient();
  const myId = mx.getUserId() ?? '';
  const navigate = useNavigate();
  const { tableId } = useParams();
  const useAuthentication = useMediaAuthentication();
  const api = useMemo(() => createTableGamesApi(() => mx.getAccessToken()), [mx]);
  const { balance, refresh } = useCredits();
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [table, setTable] = useState<GameTable>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sheet, setSheet] = useState(false);

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

  const nameOf = (id: string) => (isBotId(id) ? botName(id) : friendDisplayName(mx, id));
  const avatarOf = (id: string) =>
    isBotId(id) ? undefined : friendAvatarUrl(mx, id, useAuthentication);
  const toLobby = () => navigate(getGamesTableGamePath(kind));

  const errorBox = error && (
    <p role="alert" className={css.ErrorText}>
      {error}
    </p>
  );

  if (tableId) {
    if (!table)
      return (
        <main className={css.Lobby}>
          <div className={css.LobbyInner}>
            {errorBox || <p className={css.Muted}>{tr('table_games.loading', 'Loading…')}</p>}
          </div>
        </main>
      );
    const act = (action: Record<string, unknown>) => run(() => api.act(table, action));
    const sheetView = sheet && (
      <SeatsSheet
        table={table}
        busy={busy}
        isOwner={table.ownerId === myId}
        onAct={act}
        onClose={() => setSheet(false)}
        nameOf={nameOf}
        seatsOnly={kind === 'fodinha'}
      />
    );
    if (kind === 'fodinha')
      return (
        <>
          <FodinhaScreen
            table={table}
            busy={busy}
            error={error}
            isOwner={table.ownerId === myId}
            onAct={act}
            onJoin={() => run(() => api.join(table.id))}
            onBack={toLobby}
            onOpenSheet={() => setSheet(true)}
            nameOf={nameOf}
            avatarOf={avatarOf}
          />
          {sheetView}
        </>
      );
    return (
      <main className={css.Screen}>
        <TentosTable
          table={table}
          busy={busy}
          isOwner={table.ownerId === myId}
          onAct={act}
          onJoin={() => run(() => api.join(table.id))}
          onBack={toLobby}
          onOpenSheet={() => setSheet(true)}
          nameOf={nameOf}
          avatarOf={avatarOf}
        />
        {error && (
          <div
            role="alert"
            className={css.ErrorText}
            style={{ position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)' }}
          >
            {error}
          </div>
        )}
        {sheetView}
      </main>
    );
  }

  const invitedHere = tables.filter((s) => s.phase === 'waiting' && s.invited?.includes(myId));
  const others = tables.filter((s) => !invitedHere.includes(s));
  const row = (s: TableSummary, invited = false) => (
    <button
      key={s.id}
      type="button"
      className={css.ListRow}
      onClick={() => navigate(getGamesTableGamePath(kind, s.id))}
    >
      <span className={css.Grow}>
        <div>{s.name}</div>
        <div className={css.Muted}>{s.players.map(nameOf).join(' · ')}</div>
      </span>
      {invited && <span className={css.Tag}>{tr('table_games.invited_you', 'invited you')}</span>}
      <span className={css.Muted}>
        {s.players.length}/{s.capacity} ·{' '}
        {s.stake
          ? tr('table_games.credits_n', '{{n}} credits', { n: s.stake })
          : tr('table_games.free', 'free')}
      </span>
      <span className={css.Muted}>{phaseText(s.phase)}</span>
    </button>
  );

  return (
    <main className={css.Lobby}>
      <div className={css.LobbyInner}>
        <header className={css.LobbyHead}>
          <button
            type="button"
            className={css.Pill}
            onClick={() => navigate(getGamesPath())}
            aria-label={tr('games.action.back', 'Back')}
          >
            ←
          </button>
          <h1 className={`${css.LobbyTitle} ${css.Grow}`}>{gameName(kind)}</h1>
          <button
            type="button"
            className={css.Pill}
            data-primary={!creating}
            onClick={() => setCreating((c) => !c)}
          >
            {creating ? tr('table_games.close', 'Close') : tr('table_games.new_table', 'New table')}
          </button>
        </header>
        {errorBox}
        {creating && (
          <div className={css.List} style={{ padding: 16 }}>
            <CreateForm
              kind={kind}
              busy={busy}
              balance={balance}
              onCreate={(name, stake, capacity) =>
                run(() => api.create(kind, name, stake, capacity)).then((created) => {
                  if (created) navigate(getGamesTableGamePath(kind, created.id));
                })
              }
            />
          </div>
        )}
        {invitedHere.length > 0 && (
          <>
            <p className={css.SectionLabel}>{tr('table_games.invites', 'Invitations')}</p>
            <div className={css.List}>{invitedHere.map((s) => row(s, true))}</div>
          </>
        )}
        <p className={css.SectionLabel}>{tr('table_games.tables', 'Community tables')}</p>
        {!loaded && <p className={css.Muted}>{tr('table_games.loading', 'Loading…')}</p>}
        {loaded && !others.length && (
          <p className={css.Muted}>
            {tr(
              'table_games.empty_tables_bots',
              'No tables yet. Create one, invite friends or play against bots.'
            )}
          </p>
        )}
        {others.length > 0 && <div className={css.List}>{others.map((s) => row(s))}</div>}
      </div>
    </main>
  );
}
