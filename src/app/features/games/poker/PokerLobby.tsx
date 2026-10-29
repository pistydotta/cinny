import React, { FormEvent, useState } from 'react';
import { Icon, Icons } from 'folds';
import { formatChips } from './engine';
import { BLIND_LEVELS } from './multiplayer/protocol';
import * as css from './pokerPage.css';

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
      setError(`ID inválido: ${invalid.join(', ')} (use o formato @nome:servidor)`);
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
      setError(e instanceof Error ? e.message : 'Não foi possível criar a mesa.');
      setBusy(false);
    }
  };

  return (
    <form className={css.Dialog} onSubmit={handleSubmit} aria-label="Criar mesa">
      <div>
        <h2 className={css.DialogTitle}>Criar mesa</h2>
        <p className={css.DialogText}>
          Você organiza a mesa e embaralha as cartas, mas não vê as cartas de ninguém. Se você sair,
          outro jogador assume.
        </p>
      </div>

      <div className={css.Field}>
        <div className={css.FieldHeader}>
          <span>Nome da mesa</span>
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
          <span>Blinds</span>
          <span className={css.Muted}>
            Entrada de {formatChips(BLIND_LEVELS[level].bigBlind * 20)} a{' '}
            {formatChips(BLIND_LEVELS[level].bigBlind * 100)} fichas
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
          <span>Convidar amigos</span>
          <span className={css.Muted}>{selected.length} selecionados</span>
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
          placeholder="Outros IDs, ex.: @amigo:matrix.org"
          value={extra}
          onChange={(evt) => setExtra(evt.target.value)}
        />
      </div>

      {error && <p className={css.ErrorText}>{error}</p>}
      <button type="submit" className={css.PrimaryButton} disabled={busy}>
        {busy ? 'Criando…' : 'Criar mesa'}
      </button>
      <button type="button" className={css.SecondaryButton} onClick={onCancel}>
        Cancelar
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
          <button type="button" className={css.IconButton} onClick={onBack} aria-label="Voltar">
            <Icon size="200" src={Icons.ArrowLeft} />
          </button>
        )}
        <div className={css.TopTitle}>
          <span className={css.TitleText}>Poker · Texas Hold’em</span>
          <span className={css.SubtitleText}>Mesas com amigos e treino</span>
        </div>
        <div className={css.WalletPill} title="Moedas na sua carteira">
          <span className={css.Coin}>$</span>
          <span className={css.WalletValue}>{formatChips(balance)}</span>
        </div>
      </div>

      <div className={css.LobbyScroll}>
        <div className={css.LobbyInner}>
          <div className={css.SectionHeader}>
            <h2 className={css.SectionTitle}>Mesas com amigos</h2>
            <button type="button" className={css.SmallButton} onClick={() => setCreating(true)}>
              Criar mesa
            </button>
          </div>

          {tables.length === 0 ? (
            <div className={css.EmptyState}>
              Nenhuma mesa por enquanto. Crie uma e convide seus amigos — eles recebem o convite
              como uma sala nova.
            </div>
          ) : (
            <div className={css.TableList}>
              {tables.map((table) => (
                <div key={table.roomId} className={css.TableRow}>
                  <div className={css.TableIcon}>♠</div>
                  <div className={css.TableInfo}>
                    <span className={css.TableName}>{table.name}</span>
                    <span className={css.TableMeta}>
                      {table.bigBlind ? `Blinds ${table.smallBlind}/${table.bigBlind} · ` : ''}
                      {table.invited
                        ? `Convite${table.invitedBy ? ` de ${table.invitedBy}` : ''}`
                        : `${table.members} na sala`}
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
                      {accepting === table.roomId ? 'Entrando…' : 'Aceitar'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={css.SmallButton}
                      onClick={() => onOpenTable(table.roomId)}
                    >
                      Abrir
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <h2 className={css.SectionTitle}>Treino</h2>
          <div className={css.PracticeCard}>
            <div className={css.TableIcon} style={{ background: '#1b65c0' }}>
              ♣
            </div>
            <div className={css.TableInfo}>
              <span className={css.TableName}>Jogar contra bots</span>
              <span className={css.TableMeta}>Mesa só sua, para praticar a qualquer hora</span>
            </div>
            <button type="button" className={css.SmallButton} onClick={onPractice}>
              Treinar
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
