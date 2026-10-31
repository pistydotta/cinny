import React, { FormEvent, useState } from 'react';
import { Icon, Icons } from 'folds';
import { formatChips } from './engine';
import { BLIND_LEVELS } from './multiplayer/protocol';
import * as css from './pokerPage.css';
import { tr } from '../../translation/tr';

export type LobbyTable = {
  roomId: string;
  name: string;
  smallBlind?: number;
  bigBlind?: number;
  members: number;
  invited: boolean;
  invitedBy?: string;
};

export type LobbyContact = {
  userId: string;
  name: string;
};

export type NewTable = {
  name: string;
  smallBlind: number;
  bigBlind: number;
  invite: string[];
};

type CreateTableDialogProps = {
  defaultName: string;
  contacts: LobbyContact[];
  onCreate: (table: NewTable) => Promise<void>;
  onCancel: () => void;
};

const MXID = /^@[^:\s]+:[^\s]+$/;

function CreateTableDialog({ defaultName, contacts, onCreate, onCancel }: CreateTableDialogProps) {
  const [name, setName] = useState(defaultName);
  const [level, setLevel] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [extra, setExtra] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const toggle = (userId: string) =>
    setSelected((list) =>
      list.includes(userId) ? list.filter((id) => id !== userId) : [...list, userId]
    );

  const handleSubmit = async (evt: FormEvent) => {
    evt.preventDefault();
    const typed = extra
      .split(/[\s,]+/)
      .map((id) => id.trim())
      .filter(Boolean);
    const invalid = typed.filter((id) => !MXID.test(id));
    if (invalid.length > 0) {
      setError(
        tr('games.lobby.invalid_ids', 'Invalid ID: {{ids}} (use the @name:server format)', {
          ids: invalid.join(', '),
        })
      );
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const { smallBlind, bigBlind } = BLIND_LEVELS[level];
      await onCreate({
        name: name.trim() || defaultName,
        smallBlind,
        bigBlind,
        invite: Array.from(new Set([...selected, ...typed])),
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : tr('games.error.create', 'Could not create the table.')
      );
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
            "You run the table and shuffle the cards, but you don't see anyone's cards. If you leave, another player takes over."
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
        {contacts.length > 0 && (
          <div className={css.ContactList}>
            {contacts.map((contact) => (
              <label
                key={contact.userId}
                className={css.CheckRow}
                htmlFor={`invite-${contact.userId}`}
              >
                <input
                  id={`invite-${contact.userId}`}
                  className={css.CheckInput}
                  type="checkbox"
                  checked={selected.includes(contact.userId)}
                  onChange={() => toggle(contact.userId)}
                />
                <span>{contact.name}</span>
                <span className={css.Muted}>{contact.userId}</span>
              </label>
            ))}
          </div>
        )}
        <input
          className={css.TextInput}
          placeholder={tr('games.lobby.other_ids', 'Other IDs, e.g. @friend:matrix.org')}
          value={extra}
          onChange={(evt) => setExtra(evt.target.value)}
        />
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

type PokerLobbyProps = {
  balance: number;
  tables: LobbyTable[];
  contacts: LobbyContact[];
  defaultTableName: string;
  onOpenTable: (roomId: string) => void;
  onAcceptInvite: (roomId: string) => Promise<void>;
  onCreateTable: (table: NewTable) => Promise<void>;
  onPractice: () => void;
  onBack?: () => void;
};

export function PokerLobby({
  balance,
  tables,
  contacts,
  defaultTableName,
  onOpenTable,
  onAcceptInvite,
  onCreateTable,
  onPractice,
  onBack,
}: PokerLobbyProps) {
  const [creating, setCreating] = useState(false);
  const [accepting, setAccepting] = useState<string>();

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
          <span className={css.WalletValue}>{formatChips(balance)}</span>
        </div>
      </div>

      <div className={css.LobbyScroll}>
        <div className={css.LobbyInner}>
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
                'No tables yet. Create one and invite your friends: they get the invite as a new room.'
              )}
            </div>
          ) : (
            <div className={css.TableList}>
              {tables.map((table) => (
                <div key={table.roomId} className={css.TableRow}>
                  <div className={css.TableIcon}>♠</div>
                  <div className={css.TableInfo}>
                    <span className={css.TableName}>{table.name}</span>
                    <span className={css.TableMeta}>
                      {table.bigBlind
                        ? `${tr('games.table.blinds', 'Blinds {{small}}/{{big}}', {
                            small: table.smallBlind ?? 0,
                            big: table.bigBlind,
                          })} · `
                        : ''}
                      {table.invited
                        ? (table.invitedBy &&
                            tr('games.lobby.invite_from', 'Invite from {{name}}', {
                              name: table.invitedBy,
                            })) ||
                          tr('games.lobby.invite_pending', 'Invite')
                        : tr('games.lobby.members', '{{count}} in the room', {
                            count: table.members,
                          })}
                    </span>
                  </div>
                  {table.invited ? (
                    <button
                      type="button"
                      className={css.SmallButton}
                      disabled={accepting === table.roomId}
                      onClick={async () => {
                        setAccepting(table.roomId);
                        try {
                          await onAcceptInvite(table.roomId);
                        } finally {
                          setAccepting(undefined);
                        }
                      }}
                    >
                      {accepting === table.roomId
                        ? tr('games.lobby.joining', 'Joining…')
                        : tr('games.lobby.accept', 'Accept')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={css.SmallButton}
                      onClick={() => onOpenTable(table.roomId)}
                    >
                      {tr('games.lobby.open', 'Open')}
                    </button>
                  )}
                </div>
              ))}
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
              {tr('games.lobby.train', 'Practice')}
            </button>
          </div>
        </div>
      </div>

      {creating && (
        <div className={css.Overlay}>
          <CreateTableDialog
            defaultName={defaultTableName}
            contacts={contacts}
            onCreate={onCreateTable}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}
    </div>
  );
}
