import React, { useMemo, useState } from 'react';
import { tr } from '../../translation/tr';
import { InvitePicker } from '../poker/InvitePicker';
import { TableStatus } from '../poker/inviteCandidates';
import { gameName, rulesText } from './text';
import { isBotId } from './tentosView';
import { GameTable } from './types';
import * as css from './tentos.css';

type SeatsSheetProps = {
  table: GameTable;
  busy: boolean;
  isOwner: boolean;
  onAct: (action: Record<string, unknown>) => void;
  onClose: () => void;
  nameOf: (userId: string) => string;
};

/** Everything that isn't the game: seats, bots, invitations, rules and leaving. */
export function SeatsSheet({ table, busy, isOwner, onAct, onClose, nameOf }: SeatsSheetProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const waiting = table.phase === 'waiting';
  const me = table.players[table.mySeat];
  const live = !waiting && table.phase !== 'finished';

  const status = useMemo(() => {
    const map = new Map<string, TableStatus>();
    table.invited?.forEach((id) => map.set(id, 'invited'));
    table.players.forEach((p) => map.set(p.userId, 'member'));
    return map;
  }, [table.invited, table.players]);

  const copy = () => {
    navigator.clipboard
      ?.writeText(window.location.href)
      .then(() => setCopied(true))
      .catch(() => undefined);
  };

  const seats = Math.max(table.capacity, table.players.length);
  return (
    <div
      className={css.Scrim}
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <aside className={css.Sheet} role="dialog" aria-modal="true" aria-labelledby="seats-title">
        <div className={css.SheetHead}>
          <div className={css.Grow}>
            <h2 id="seats-title" className={css.SheetTitle}>
              {waiting ? tr('table_games.seats_title', 'Seats') : table.name}
            </h2>
            <div className={css.Muted}>
              {gameName(table.kind)} · {table.players.length}/{table.capacity}
              {table.stake
                ? ` · ${tr('table_games.stake_amount', '{{stake}} credits per player', {
                    stake: table.stake,
                  })}`
                : ` · ${tr('table_games.free', 'free')}`}
            </div>
          </div>
          <button
            type="button"
            className={css.Pill}
            onClick={onClose}
            aria-label={tr('table_games.close', 'Close')}
          >
            ✕
          </button>
        </div>

        <div>
          {Array.from({ length: seats }, (_, seat) => {
            const p = table.players[seat];
            if (!p)
              return (
                // eslint-disable-next-line react/no-array-index-key
                <div key={`empty-${seat}`} className={css.SeatRow} data-empty="true">
                  <span className={`${css.Grow} ${css.Muted}`}>
                    {tr('table_games.empty_seat', 'Empty seat')}
                  </span>
                  {isOwner && waiting && (
                    <button
                      type="button"
                      className={css.Pill}
                      disabled={busy}
                      onClick={() => onAct({ type: 'add_bot' })}
                    >
                      {tr('table_games.add_bot', 'Bot')}
                    </button>
                  )}
                </div>
              );
            const bot = isBotId(p.userId);
            let tag = '';
            if (p.userId === table.ownerId) tag = tr('table_games.owner', 'owner');
            else if (bot) tag = tr('table_games.bot', 'bot');
            if (table.kind === 'truco')
              tag = [tag, tr('table_games.pair_n', 'pair {{n}}', { n: (seat % 2) + 1 })]
                .filter(Boolean)
                .join(' · ');
            return (
              <div key={p.userId} className={css.SeatRow}>
                <span className={css.SmallAvatar}>
                  {nameOf(p.userId).replace(/^Bot /, '').slice(0, 2).toUpperCase()}
                </span>
                <span className={css.Grow}>
                  {seat === table.mySeat ? tr('table_games.you', 'You') : nameOf(p.userId)}
                </span>
                <span className={css.Muted}>{tag}</span>
                {bot && isOwner && waiting && (
                  <button
                    type="button"
                    className={css.Pill}
                    disabled={busy}
                    onClick={() => onAct({ type: 'remove_bot', seat })}
                    aria-label={tr('table_games.remove_bot', 'Remove {{name}}', {
                      name: nameOf(p.userId),
                    })}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {waiting && me && (
          <>
            <p className={css.SectionLabel}>{tr('table_games.invite_people', 'Invite people')}</p>
            <InvitePicker everyone status={status} selected={selected} onChange={setSelected} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className={css.Pill} onClick={copy}>
                {copied
                  ? tr('table_games.link_copied', 'Link copied')
                  : tr('table_games.copy_link', 'Copy link')}
              </button>
              <button
                type="button"
                className={css.Pill}
                data-primary="true"
                style={{ flex: 1 }}
                disabled={busy || !selected.length}
                onClick={() => {
                  onAct({ type: 'invite', userIds: selected });
                  setSelected([]);
                }}
              >
                {tr('table_games.send_invites', 'Invite ({{count}})', { count: selected.length })}
              </button>
            </div>
            <p className={css.Muted}>
              {tr(
                'table_games.invite_hint',
                'Invited people see this table first in their lobby. Bots stake nothing and are never paid.'
              )}
            </p>
          </>
        )}

        <details>
          <summary>{tr('table_games.rules', 'Table rules')}</summary>
          <p className={css.Muted}>{rulesText(table.kind)}</p>
          <p className={css.Muted}>
            {tr(
              'table_games.timeout_rules',
              'Players have 2 minutes per turn. A timeout forfeits the match in Truco; in Fodinha it bets 0 or plays your first card for you. A finished round moves on by itself after 2 minutes. Waiting tables expire after 24 hours with a refund. Leaving a started game forfeits your stake. Stakes are play credits only.'
            )}
          </p>
        </details>

        <div style={{ marginTop: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {waiting && isOwner && (
            <button
              type="button"
              className={css.Pill}
              disabled={busy}
              onClick={() => onAct({ type: 'cancel' })}
            >
              {tr('table_games.cancel', 'Cancel table and refund stakes')}
            </button>
          )}
          {live &&
            me &&
            !me.eliminated &&
            (confirm ? (
              <>
                <span className={css.Muted}>
                  {tr(
                    'table_games.resign_confirm',
                    'Forfeit this game? Your stake will not be refunded.'
                  )}
                </span>
                <button
                  type="button"
                  className={css.Pill}
                  disabled={busy}
                  onClick={() => {
                    setConfirm(false);
                    onAct({ type: 'resign' });
                    onClose();
                  }}
                >
                  {tr('table_games.resign_yes', 'Yes, resign')}
                </button>
                <button type="button" className={css.Pill} onClick={() => setConfirm(false)}>
                  {tr('table_games.keep_playing', 'Keep playing')}
                </button>
              </>
            ) : (
              <button type="button" className={css.Pill} onClick={() => setConfirm(true)}>
                {tr('table_games.resign', 'Resign')}
              </button>
            ))}
        </div>
      </aside>
    </div>
  );
}
