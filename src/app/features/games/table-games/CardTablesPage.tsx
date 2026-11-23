import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { friendAvatarUrl, friendDisplayName } from '../../friends/userDisplay';
import { useFriends } from '../../friends/useFriends';
import { ApiError } from '../../../utils/blazeroomApi';
import { getGamesPath, getGamesTableGamePath } from '../../../pages/pathUtils';
import { tr } from '../../translation/tr';
import { InviteOnlyToggle } from '../invite/InviteOnlyToggle';
import { TopUpButton } from '../credits/TopUpButton';
import { useCredits } from '../credits/useCredits';
import { formatChips } from '../poker/types';
import { createTableGamesApi } from './api';
import { FodinhaScreen } from './FodinhaScreen';
import { isIdle, lobbySections, playNowTable, seatsLeft, wonBy } from './lobby';
import { SeatsSheet } from './SeatsSheet';
import { TableSwitcher } from './TableSwitcher';
import { TentosTable } from './TentosTable';
import { botName, isBotId } from './tentosView';
import { gameError, gameName, phaseText } from './text';
import { GameTable, TableSummary } from './types';
import * as css from './tentos.css';
import { GameTopBar, GameWallet } from '../ui/GameTopBar';

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
  onCreate: (name: string, stake: number, capacity: number, inviteOnly: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [inviteOnly, setInviteOnly] = useState(false);
  const [stake, setStake] = useState(0);
  const [capacity, setCapacity] = useState(4);
  return (
    <form
      className={css.Form}
      onSubmit={(e) => {
        e.preventDefault();
        onCreate(name, stake, kind === 'truco' ? 4 : capacity, inviteOnly);
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
      <InviteOnlyToggle id="table-invite-only" checked={inviteOnly} onChange={setInviteOnly} />
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
  // A shared link carries the table's invite token, which lets its holder sit at an invite-only table.
  const [search] = useSearchParams();
  const inviteToken = search.get('invite') ?? undefined;
  const useAuthentication = useMediaAuthentication();
  const api = useMemo(() => createTableGamesApi(() => mx.getAccessToken()), [mx]);
  const { balance, atTables, refresh, topUp } = useCredits();
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [table, setTable] = useState<GameTable>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const { lists } = useFriends();
  const friends = useMemo(() => new Set((lists?.friends ?? []).map((f) => f.userId)), [lists]);

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
    const join = () => run(() => api.join(table.id, inviteToken));
    const openSwitch = () => {
      setSheet(false);
      setSwitching(true);
    };
    const sheetView = (
      <>
        {sheet && (
          <SeatsSheet
            table={table}
            busy={busy}
            isOwner={table.ownerId === myId}
            onAct={act}
            getLink={async () =>
              `${window.location.origin}${getGamesTableGamePath(
                kind,
                table.id
              )}?invite=${encodeURIComponent(await api.inviteLink(table.id))}`
            }
            onSwitchTable={openSwitch}
            onClose={() => setSheet(false)}
            nameOf={nameOf}
            seatsOnly={kind === 'fodinha'}
          />
        )}
        {switching && (
          <TableSwitcher
            api={api}
            table={table}
            myId={myId}
            nameOf={nameOf}
            onClose={() => setSwitching(false)}
            onGo={(id) => {
              setSwitching(false);
              refresh();
              navigate(getGamesTableGamePath(kind, id));
            }}
          />
        )}
      </>
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
            onJoin={join}
            onBack={toLobby}
            onOpenSheet={() => setSheet(true)}
            onSwitchTable={openSwitch}
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
          onJoin={join}
          onRematch={() =>
            run(() => api.rematch(table.id)).then((next) => {
              if (next) navigate(getGamesTableGamePath(kind, next.id));
            })
          }
          onBack={toLobby}
          onOpenSheet={() => setSheet(true)}
          onSwitchTable={openSwitch}
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

  const sections = lobbySections(tables, myId, friends);
  const statusOf = (s: TableSummary) => {
    if (s.phase !== 'finished') return phaseText(s.phase);
    return wonBy(s, myId)
      ? tr('table_games.you_won', 'You won')
      : tr('table_games.you_lost', 'You lost');
  };
  const sit = (s: TableSummary) =>
    run(() => api.join(s.id)).then((joined) => {
      if (joined) navigate(getGamesTableGamePath(kind, s.id));
    });
  // A waiting table with a free seat seats you in one click (unless it's invite-only): you can
  // still leave it with your stake back. Everything else opens, including a running game's free
  // seat, whose stake stays in the pot, so taking it is a choice made on the table.
  const open = (s: TableSummary) => {
    if (
      !s.players.includes(myId) &&
      !s.inviteOnly &&
      s.phase === 'waiting' &&
      s.players.length < s.capacity
    )
      sit(s);
    else navigate(getGamesTableGamePath(kind, s.id));
  };
  const now = Date.now();
  // Running games say when a person last moved, so a stopped one doesn't pass for live.
  const activity = (s: TableSummary) => {
    if (s.phase === 'waiting' || s.phase === 'finished' || s.activeAt === undefined)
      return undefined;
    const n = Math.max(0, Math.floor((now - s.activeAt) / 60_000));
    if (isIdle(s, now)) return tr('table_games.idle_for', 'Stopped for {{n}} min', { n });
    return n < 1
      ? tr('table_games.moved_now', 'Last move just now')
      : tr('table_games.moved_ago', 'Last move {{n}} min ago', { n });
  };
  // Play now takes you back to a table you're already waiting at, or seats you at the best one.
  const waitingAt = sections.mine.find((t) => t.phase === 'waiting');
  const playNow = waitingAt ? undefined : playNowTable(sections);
  const row = (s: TableSummary, tag?: string) => (
    <button
      key={s.id}
      type="button"
      className={css.ListRow}
      data-idle={isIdle(s, now)}
      disabled={busy}
      onClick={() => open(s)}
    >
      <span className={css.Grow}>
        <div>{s.name}</div>
        <div className={css.Muted}>{s.players.map(nameOf).join(' · ')}</div>
        {activity(s) && <div className={css.Muted}>{activity(s)}</div>}
      </span>
      {tag && <span className={css.Tag}>{tag}</span>}
      <span className={css.Muted}>
        {s.phase !== 'waiting' && s.vacant
          ? tr('table_games.free_seats', 'Free seats: {{n}}', { n: seatsLeft(s) })
          : `${s.players.length}/${s.capacity}`}{' '}
        ·{' '}
        {s.stake
          ? tr('table_games.credits_n', '{{n}} credits', { n: s.stake })
          : tr('table_games.free', 'free')}
      </span>
      <span className={css.Muted}>{statusOf(s)}</span>
    </button>
  );
  const section = (label: string, list: TableSummary[], tag?: string) =>
    list.length > 0 && (
      <>
        <p className={css.SectionLabel}>{label}</p>
        <div className={css.List}>{list.map((s) => row(s, tag))}</div>
      </>
    );
  const nothingOpen =
    !sections.invited.length &&
    !sections.mine.length &&
    !sections.open.length &&
    !sections.friends.length;

  return (
    <main className={css.Lobby}>
      <GameTopBar
        title={gameName(kind)}
        subtitle={tr('games.wallet.card_games', 'Card-game wallet')}
        onBack={() => navigate(getGamesPath())}
      >
        <GameWallet value={balance === undefined ? '—' : formatChips(balance)} />
        {/* Someone who lost everything can always get back in from here. */}
        <TopUpButton atTables={atTables} topUp={topUp} className={css.Pill} />
      </GameTopBar>
      <div className={css.LobbyInner}>
        <div className={css.LobbyHead}>
          <span className={css.Grow} />
          {loaded && (
            <button
              type="button"
              className={css.Pill}
              data-primary
              disabled={busy}
              title={playNow?.name}
              onClick={() => {
                if (waitingAt) navigate(getGamesTableGamePath(kind, waitingAt.id));
                else if (playNow) sit(playNow);
                else setCreating(true);
              }}
            >
              {playNow?.stake
                ? tr('table_games.play_now_stake', 'Play now · {{n}} credits', {
                    n: playNow.stake,
                  })
                : tr('table_games.play_now', 'Play now')}
            </button>
          )}
          <button type="button" className={css.Pill} onClick={() => setCreating((c) => !c)}>
            {creating ? tr('table_games.close', 'Close') : tr('table_games.new_table', 'New table')}
          </button>
        </div>
        {errorBox}
        {creating && (
          <div className={css.List} style={{ padding: 16 }}>
            <CreateForm
              kind={kind}
              busy={busy}
              balance={balance}
              onCreate={(name, stake, capacity, inviteOnly) =>
                run(() => api.create(kind, name, stake, capacity, inviteOnly)).then((created) => {
                  if (created) navigate(getGamesTableGamePath(kind, created.id));
                })
              }
            />
          </div>
        )}
        {!loaded && <p className={css.Muted}>{tr('table_games.loading', 'Loading…')}</p>}
        {section(
          tr('table_games.invites', 'Invitations'),
          sections.invited,
          tr('table_games.invited_you', 'invited you')
        )}
        {section(tr('table_games.your_tables', 'Your tables'), sections.mine)}
        {section(tr('table_games.open_tables', 'Open tables'), sections.open)}
        {section(
          tr('table_games.friends_playing', 'Friends playing'),
          sections.friends,
          tr('table_games.watch', 'watch')
        )}
        {loaded && nothingOpen && (
          <p className={css.Muted}>
            {tr(
              'table_games.empty_tables_bots',
              'No tables yet. Create one, invite friends or play against bots.'
            )}
          </p>
        )}
        {sections.recent.length > 0 && (
          <button
            type="button"
            className={css.Pill}
            aria-expanded={showRecent}
            onClick={() => setShowRecent(!showRecent)}
          >
            {showRecent
              ? tr('table_games.hide_recent', 'Hide your recent games')
              : tr('table_games.show_recent', 'Your recent games ({{n}})', {
                  n: sections.recent.length,
                })}
          </button>
        )}
        {showRecent &&
          section(tr('table_games.recent_games', 'Your recent games'), sections.recent)}
      </div>
    </main>
  );
}
