import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Icon, Icons } from 'folds';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { ApiError } from '../../../utils/blazeroomApi';
import { friendDisplayName } from '../../friends/userDisplay';
import { useFriends } from '../../friends/useFriends';
import { TopUpButton } from '../credits/TopUpButton';
import { useCredits } from '../credits/useCredits';
import { createPokerApi } from './api';
import { errorText } from './errorText';
import { CloseDialog, LeaveDialog } from './TableDialogs';
import { formatChips, LobbyTable } from './types';
import { useLobby } from './useLobby';
import * as css from './pokerPage.css';
import { tr } from '../../translation/tr';

const BLIND_LEVELS = [
  { smallBlind: 10, bigBlind: 20 },
  { smallBlind: 25, bigBlind: 50 },
  { smallBlind: 50, bigBlind: 100 },
];

type NewTable = { name: string; smallBlind: number; invite: string[] };

type CreateTableDialogProps = {
  defaultName: string;
  friends: { userId: string; name: string }[];
  onCreate: (table: NewTable) => Promise<void>;
  onCancel: () => void;
};

function CreateTableDialog({ defaultName, friends, onCreate, onCancel }: CreateTableDialogProps) {
  const [name, setName] = useState(defaultName);
  const [level, setLevel] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const toggle = (userId: string) =>
    setSelected((list) =>
      list.includes(userId) ? list.filter((id) => id !== userId) : [...list, userId]
    );

  const handleSubmit = async (evt: FormEvent) => {
    evt.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await onCreate({
        name: name.trim() || defaultName,
        smallBlind: BLIND_LEVELS[level].smallBlind,
        invite: selected,
      });
    } catch (e) {
      setError(errorText(e instanceof ApiError ? e.code : 'unknown'));
      setBusy(false);
    }
  };

  return (
    <form
      className={css.Dialog}
      onSubmit={handleSubmit}
      aria-label={tr('games.lobby.create', 'Create table')}
    >
      <div>
        <h2 className={css.DialogTitle}>{tr('games.lobby.create', 'Create table')}</h2>
        <p className={css.DialogText}>
          {tr(
            'games.lobby.create_text',
            "The server deals the cards, so nobody sees anyone else's. You can close the table at any time."
          )}
        </p>
      </div>

      <div className={css.Field}>
        <div className={css.FieldHeader}>
          <span>{tr('games.lobby.table_name', 'Table name')}</span>
        </div>
        <input
          className={css.TextInput}
          value={name}
          maxLength={40}
          onChange={(evt) => setName(evt.target.value)}
        />
      </div>

      <div className={css.Field}>
        <div className={css.FieldHeader}>
          <span>{tr('games.lobby.blinds', 'Blinds')}</span>
          <span className={css.Muted}>
            {tr('games.lobby.buy_in_range', 'Buy-in from {{min}} to {{max}} chips', {
              min: formatChips(BLIND_LEVELS[level].bigBlind * 20),
              max: formatChips(BLIND_LEVELS[level].bigBlind * 100),
            })}
          </span>
        </div>
        <div className={css.Segmented} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {BLIND_LEVELS.map((blinds, index) => (
            <button
              key={blinds.bigBlind}
              type="button"
              className={css.SegmentButton}
              aria-pressed={level === index}
              onClick={() => setLevel(index)}
            >
              {blinds.smallBlind}/{blinds.bigBlind}
            </button>
          ))}
        </div>
      </div>

      <div className={css.Field}>
        <div className={css.FieldHeader}>
          <span>{tr('games.lobby.invite', 'Invite friends')}</span>
          <span className={css.Muted}>
            {tr('games.lobby.selected', '{{count}} selected', { count: selected.length })}
          </span>
        </div>
        {friends.length > 0 ? (
          <div className={css.ContactList}>
            {friends.map((friend) => (
              <label
                key={friend.userId}
                className={css.CheckRow}
                htmlFor={`invite-${friend.userId}`}
              >
                <input
                  id={`invite-${friend.userId}`}
                  className={css.CheckInput}
                  type="checkbox"
                  checked={selected.includes(friend.userId)}
                  onChange={() => toggle(friend.userId)}
                />
                <span>{friend.name}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className={css.Note}>
            {tr(
              'games.lobby.no_friends',
              'You have no friends to invite yet. Create the table and share its link instead.'
            )}
          </p>
        )}
      </div>

      {error && <p className={css.ErrorText}>{error}</p>}
      <button type="submit" className={css.PrimaryButton} disabled={busy}>
        {busy ? tr('games.lobby.creating', 'Creating…') : tr('games.lobby.create', 'Create table')}
      </button>
      <button type="button" className={css.SecondaryButton} onClick={onCancel}>
        {tr('games.action.cancel', 'Cancel')}
      </button>
    </form>
  );
}

type Confirm = { kind: 'leave' | 'close'; id: string };

type PokerLobbyProps = {
  onOpenTable: (tableId: string) => void;
  onPractice: () => void;
  onBack?: () => void;
};

export function PokerLobby({ onOpenTable, onPractice, onBack }: PokerLobbyProps) {
  const mx = useMatrixClient();
  const api = useMemo(() => createPokerApi(() => mx.getAccessToken()), [mx]);
  const { list, refresh: refreshLobby } = useLobby();
  const { balance, atTables, refresh: refreshCredits, topUp } = useCredits();
  const { lists } = useFriends();
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>();
  const [busyId, setBusyId] = useState<string>();
  const [error, setError] = useState<string>();

  const myId = mx.getUserId() ?? '';

  useEffect(() => {
    refreshLobby();
    refreshCredits();
  }, [refreshLobby, refreshCredits]);

  // A table can take chips back on its own (away or idle rule); the balance has to follow.
  const chipsKey = (list?.tables ?? []).map((t) => `${t.id}:${t.myChips}`).join(',');
  const lastChipsKey = useRef(chipsKey);
  useEffect(() => {
    if (lastChipsKey.current !== chipsKey) refreshCredits();
    lastChipsKey.current = chipsKey;
  }, [chipsKey, refreshCredits]);

  const friends = useMemo(
    () =>
      (lists?.friends ?? []).map((f) => ({
        userId: f.userId,
        name: friendDisplayName(mx, f.userId),
      })),
    [mx, lists]
  );

  // Practice has its own card below, so it is not a row here.
  const tables = (list?.tables ?? []).filter((t) => t.id !== list?.practiceId);
  const invites = list?.invites ?? [];

  const refreshAll = () => Promise.all([refreshLobby(), refreshCredits()]);

  // Runs what the person asked for and shows the server's refusal, if any.
  const run = async (id: string, task: () => Promise<void>): Promise<boolean> => {
    setBusyId(id);
    setError(undefined);
    try {
      await task();
      return true;
    } catch (e) {
      setError(errorText(e instanceof ApiError ? e.code : 'unknown'));
      return false;
    } finally {
      setBusyId(undefined);
    }
  };

  const accept = (table: LobbyTable) =>
    run(table.id, async () => {
      await api.accept(table.id);
      await refreshAll();
      onOpenTable(table.id);
    });

  const decline = (table: LobbyTable) =>
    run(table.id, async () => {
      await api.dropMembership(table.id);
      await refreshAll();
    });

  const ask = (kind: Confirm['kind'], id: string) => {
    setError(undefined);
    setConfirm({ kind, id });
  };

  const confirmed = async () => {
    if (!confirm) return;
    const { kind, id } = confirm;
    const ok = await run(id, async () => {
      if (kind === 'close') await api.close(id);
      else await api.dropMembership(id);
      await refreshAll();
    });
    if (ok) setConfirm(undefined);
  };

  const create = async ({ name, smallBlind, invite }: NewTable) => {
    const id = await api.create({ name, smallBlind, invite });
    await refreshAll();
    setCreating(false);
    onOpenTable(id);
  };

  const meta = (table: LobbyTable) =>
    [
      tr('games.table.blinds', 'Blinds {{small}}/{{big}}', {
        small: table.smallBlind,
        big: table.bigBlind,
      }),
      tr('games.lobby.members', '{{count}} in the room', { count: table.memberCount }),
      tr('games.lobby.my_chips', '{{chips}} chips of yours', { chips: formatChips(table.myChips) }),
    ].join(' · ');

  return (
    <div className={css.Page}>
      <div className={css.TopBar}>
        {onBack && (
          <button
            type="button"
            className={css.IconButton}
            onClick={onBack}
            aria-label={tr('games.action.back', 'Back')}
          >
            <Icon size="200" src={Icons.ArrowLeft} />
          </button>
        )}
        <div className={css.TopTitle}>
          <span className={css.TitleText}>Poker · Texas Hold’em</span>
          <span className={css.SubtitleText}>
            {tr('games.lobby.subtitle', 'Tables with friends and practice')}
          </span>
        </div>
        <div className={css.WalletPill} title={tr('games.wallet.hint', 'Coins in your wallet')}>
          <span className={css.Coin}>$</span>
          <span className={css.WalletValue}>{formatChips(balance ?? 0)}</span>
          {atTables > 0 && (
            <span className={css.WalletMuted}>
              ·{' '}
              {tr('games.wallet.at_tables', '{{chips}} at tables', {
                chips: formatChips(atTables),
              })}
            </span>
          )}
        </div>
        <TopUpButton atTables={atTables} topUp={topUp} className={css.SmallButton} />
      </div>

      <div className={css.LobbyScroll}>
        <div className={css.LobbyInner}>
          {error && !confirm && <p className={css.ErrorText}>{error}</p>}

          {invites.length > 0 && (
            <>
              <h2 className={css.SectionTitle}>{tr('games.lobby.invites', 'Invites')}</h2>
              <div className={css.TableList}>
                {invites.map((table) => (
                  <div key={table.id} className={css.TableRow}>
                    <div className={css.TableIcon}>♠</div>
                    <div className={css.TableInfo}>
                      <span className={css.TableName}>{table.name}</span>
                      <span className={css.TableMeta}>
                        {tr('games.lobby.invite_from', 'Invite from {{name}}', {
                          name: friendDisplayName(mx, table.invitedBy),
                        })}
                      </span>
                    </div>
                    <div className={css.RowActions}>
                      <button
                        type="button"
                        className={css.QuietButton}
                        disabled={busyId === table.id}
                        onClick={() => decline(table)}
                      >
                        {tr('games.lobby.decline', 'Decline')}
                      </button>
                      <button
                        type="button"
                        className={css.SmallButton}
                        disabled={busyId === table.id}
                        onClick={() => accept(table)}
                      >
                        {busyId === table.id
                          ? tr('games.lobby.joining', 'Joining…')
                          : tr('games.lobby.accept', 'Accept')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className={css.SectionHeader}>
            <h2 className={css.SectionTitle}>
              {tr('games.lobby.with_friends', 'Tables with friends')}
            </h2>
            <button type="button" className={css.SmallButton} onClick={() => setCreating(true)}>
              {tr('games.lobby.create', 'Create table')}
            </button>
          </div>

          {tables.length === 0 ? (
            <div className={css.EmptyState}>
              {tr(
                'games.lobby.empty',
                'No tables yet. Create one and invite your friends, or share its link.'
              )}
            </div>
          ) : (
            <div className={css.TableList}>
              {tables.map((table) => {
                const owned = table.ownerId === myId;
                return (
                  <div key={table.id} className={css.TableRow}>
                    <div className={css.TableIcon}>♠</div>
                    <div className={css.TableInfo}>
                      <span className={css.TableName}>{table.name}</span>
                      <span className={css.TableMeta}>{meta(table)}</span>
                    </div>
                    <div className={css.RowActions}>
                      <button
                        type="button"
                        className={css.QuietButton}
                        onClick={() => ask(owned ? 'close' : 'leave', table.id)}
                      >
                        {owned
                          ? tr('games.lobby.close', 'Close')
                          : tr('games.lobby.leave', 'Leave')}
                      </button>
                      <button
                        type="button"
                        className={css.SmallButton}
                        onClick={() => onOpenTable(table.id)}
                      >
                        {tr('games.lobby.open', 'Open')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <h2 className={css.SectionTitle}>{tr('games.lobby.practice', 'Practice')}</h2>
          <div className={css.PracticeCard}>
            <div className={css.TableIcon} style={{ background: '#1b65c0' }}>
              ♣
            </div>
            <div className={css.TableInfo}>
              <span className={css.TableName}>
                {tr('games.lobby.vs_bots', 'Play against bots')}
              </span>
              <span className={css.TableMeta}>
                {tr('games.lobby.vs_bots_meta', 'A table just for you, to practice any time')}
              </span>
            </div>
            <button type="button" className={css.SmallButton} onClick={onPractice}>
              {list?.practiceId
                ? tr('games.lobby.resume', 'Resume')
                : tr('games.lobby.train', 'Practice')}
            </button>
          </div>
        </div>
      </div>

      {creating && (
        <div className={css.Overlay}>
          <CreateTableDialog
            defaultName={tr('games.lobby.default_table_name', "{{name}}'s table", {
              name: friendDisplayName(mx, myId),
            })}
            friends={friends}
            onCreate={create}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}
      {confirm?.kind === 'leave' && (
        <LeaveDialog error={error} onLeave={confirmed} onCancel={() => setConfirm(undefined)} />
      )}
      {confirm?.kind === 'close' && (
        <CloseDialog error={error} onClose={confirmed} onCancel={() => setConfirm(undefined)} />
      )}
    </div>
  );
}
