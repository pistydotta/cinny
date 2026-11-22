import React, { useMemo, useState } from 'react';
import { ApiError } from '../../../utils/blazeroomApi';
import { tr } from '../../translation/tr';
import { InvitePanel } from '../invite/InvitePanel';
import { InviteOnlyToggle } from '../invite/InviteOnlyToggle';
import { TableStatus } from '../invite/inviteCandidates';
import { gameError, gameName, rulesText } from './text';
import { isBotId } from './tentosView';
import { GameTable } from './types';
import * as css from './tentos.css';

type SeatsSheetProps = {
  table: GameTable;
  busy: boolean;
  isOwner: boolean;
  onAct: (action: Record<string, unknown>) => unknown;
  /** The table's join link, for people who weren't picked by name. */
  getLink: () => Promise<string>;
  onSwitchTable: () => void;
  onClose: () => void;
  nameOf: (userId: string) => string;
  /** Fodinha keeps rules, cancel and resign on its page: the sheet only holds seats and invites. */
  seatsOnly?: boolean;
};

type SwapButtonProps = {
  busy: boolean;
  bot: boolean;
  iAsked: boolean;
  name: string;
  onSwap: () => void;
  onWithdraw: () => void;
};

/** A seat's swap button: take a bot's seat, ask a person for theirs, or withdraw my request. */
function SwapButton({ busy, bot, iAsked, name, onSwap, onWithdraw }: SwapButtonProps) {
  if (iAsked)
    return (
      <button type="button" className={css.Pill} disabled={busy} onClick={onWithdraw}>
        {tr('table_games.swap_waiting', 'Asked · cancel')}
      </button>
    );
  return (
    <button
      type="button"
      className={css.Pill}
      disabled={busy}
      onClick={onSwap}
      aria-label={tr('table_games.swap_with', 'Swap seats with {{name}}', { name })}
    >
      {bot ? tr('table_games.swap_take', 'Swap') : tr('table_games.swap_ask', 'Ask to swap')}
    </button>
  );
}

/** Everything that isn't the game: seats, bots, invitations, rules and leaving. */
export function SeatsSheet({
  table,
  busy,
  isOwner,
  onAct,
  getLink,
  onSwitchTable,
  onClose,
  nameOf,
  seatsOnly,
}: SeatsSheetProps) {
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

  const myId = me?.userId;
  const asked = (from?: string, to?: string) =>
    !!table.swaps?.some((r) => r.from === from && r.to === to);

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

        {waiting &&
          table.swaps
            ?.filter((r) => r.to === myId)
            .map((r) => {
              const from = table.players.findIndex((p) => p.userId === r.from);
              return (
                <div key={r.from} className={css.SeatRow} role="status">
                  <span className={css.Grow}>
                    {tr('table_games.swap_request', '{{name}} wants to swap seats with you', {
                      name: nameOf(r.from),
                    })}
                  </span>
                  <button
                    type="button"
                    className={css.Pill}
                    data-primary="true"
                    disabled={busy || from < 0}
                    onClick={() => onAct({ type: 'swap', seat: from })}
                  >
                    {tr('table_games.swap_accept', 'Swap')}
                  </button>
                  <button
                    type="button"
                    className={css.Pill}
                    disabled={busy}
                    onClick={() => onAct({ type: 'swap_cancel', from: r.from })}
                  >
                    {tr('table_games.swap_decline_short', 'No')}
                  </button>
                </div>
              );
            })}

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
                  {isOwner && waiting && table.kind !== 'chess' && (
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
                  {tag && (
                    <span className={css.Muted} style={{ display: 'block' }}>
                      {tag}
                    </span>
                  )}
                </span>
                {waiting && me && seat !== table.mySeat && !asked(p.userId, myId) && (
                  <SwapButton
                    busy={busy}
                    bot={bot}
                    iAsked={asked(myId, p.userId)}
                    name={nameOf(p.userId)}
                    onSwap={() => onAct({ type: 'swap', seat })}
                    onWithdraw={() => onAct({ type: 'swap_cancel' })}
                  />
                )}
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
          <p className={css.Muted}>
            {table.kind === 'truco'
              ? tr(
                  'table_games.swap_hint_truco',
                  'Seats 1 and 3 play against 2 and 4. Swap seats with someone on the other pair to change pairs: a bot’s seat is yours at once, a person has to accept.'
                )
              : tr(
                  'table_games.swap_hint',
                  'Swap seats with anyone before the start: a bot’s seat is yours at once, a person has to accept.'
                )}
          </p>
        )}

        {waiting && me && (
          <>
            <p className={css.SectionLabel}>{tr('table_games.invite_people', 'Invite people')}</p>
            {isOwner && (
              <InviteOnlyToggle
                id="invite-only"
                disabled={busy}
                checked={table.inviteOnly === true}
                onChange={(inviteOnly) => onAct({ type: 'access', inviteOnly })}
              />
            )}
            <InvitePanel
              everyone
              status={status}
              onInvite={(userIds) => Promise.resolve(onAct({ type: 'invite', userIds }))}
              getLink={getLink}
              describeError={(e) => gameError(e instanceof ApiError ? e.code : undefined)}
              disabled={busy}
              hint={
                table.kind === 'chess'
                  ? tr(
                      'table_games.invite_hint_chess',
                      'Invited people see this table first in their lobby.'
                    )
                  : tr(
                      'table_games.invite_hint',
                      'Invited people see this table first in their lobby. Bots stake nothing and are never paid.'
                    )
              }
            />
          </>
        )}

        <button
          type="button"
          className={css.Pill}
          style={{ flexShrink: 0, alignSelf: 'flex-start' }}
          onClick={onSwitchTable}
        >
          {tr('games.switch.title', 'Switch table')}
        </button>

        {!seatsOnly && (
          <>
            <details>
              <summary>{tr('table_games.rules', 'Table rules')}</summary>
              <p className={css.Muted}>{rulesText(table.kind)}</p>
              <p className={css.Muted}>
                {tr(
                  'table_games.timeout_rules',
                  'Truco gives 45 seconds per turn and Fodinha 2 minutes. When time runs out the game plays for you: in Truco it plays a card or answers a raise, never raising; in Fodinha it bets 0 or plays your first card. A finished round moves on by itself after the same time. Waiting tables expire after 24 hours with a refund. Leaving a started game forfeits your stake. Stakes are play credits only.'
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
          </>
        )}
      </aside>
    </div>
  );
}
