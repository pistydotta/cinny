import React, { useState } from 'react';
import { tr } from '../../translation/tr';
import { FodinhaTable } from './FodinhaTable';
import { phaseText, rulesText } from './text';
import { GameTable } from './types';
import * as css from './tableGames.css';

export type FodinhaScreenProps = {
  table: GameTable;
  busy: boolean;
  error: string;
  isOwner: boolean;
  onAct: (action: Record<string, unknown>) => void;
  onJoin: () => void;
  onBack: () => void;
  onOpenSheet: () => void;
  nameOf: (userId: string) => string;
  avatarOf: (userId: string) => string | undefined;
};

/**
 * A Fodinha table: the oval poker-style table inside the page, with the rules, the pot and the
 * table's controls around it. Seats, bots and invitations open in the sheet Truco uses.
 */
export function FodinhaScreen({
  table,
  busy,
  error,
  isOwner,
  onAct,
  onJoin,
  onBack,
  onOpenSheet,
  nameOf,
  avatarOf,
}: FodinhaScreenProps) {
  const [confirmResign, setConfirmResign] = useState(false);
  const me = table.mySeat >= 0 ? table.players[table.mySeat] : undefined;
  const live = table.phase !== 'waiting' && table.phase !== 'finished';
  const open = table.capacity - table.players.length;

  return (
    <main className={css.Page}>
      <div className={css.Inner}>
        <header className={css.Row}>
          <button type="button" className={css.Button} onClick={onBack}>
            {tr('games.action.back', 'Back')}
          </button>
          <h1>{table.name}</h1>
        </header>
        {error && (
          <p role="alert" className={css.Error}>
            {error}
          </p>
        )}
        <details className={css.Panel}>
          <summary>{tr('table_games.rules', 'Table rules')}</summary>
          <p className={css.Muted}>{rulesText('fodinha')}</p>
          <p className={css.Muted}>
            {tr(
              'table_games.timeout_rules',
              'Truco gives 45 seconds per turn and Fodinha 2 minutes. When time runs out the game plays for you: in Truco it plays a card or answers a raise, never raising; in Fodinha it bets 0 or plays your first card. A finished round moves on by itself after the same time. Waiting tables expire after 24 hours with a refund. Leaving a started game forfeits your stake. Stakes are play credits only.'
            )}
          </p>
        </details>
        <div className={css.Row} aria-live="polite">
          <strong>{phaseText(table.phase)}</strong>
          {table.round && (
            <span>{tr('table_games.round', 'Round {{round}}', { round: table.round })}</span>
          )}
          <span>
            {tr('table_games.pot', 'Pot: {{pot}} credits · fixed stake: {{stake}}', {
              pot: table.stake * table.players.length,
              stake: table.stake,
            })}
          </span>
        </div>
        {table.mySeat < 0 && (
          <p className={css.Muted}>
            {tr('table_games.spectating', 'You are watching this table.')}
          </p>
        )}
        <FodinhaTable table={table} busy={busy} onAct={onAct} nameOf={nameOf} avatarOf={avatarOf} />
        {table.phase === 'waiting' && (
          <div className={css.Panel}>
            <p className={css.Muted}>
              {open > 0
                ? tr('table_games.missing_seats', '{{n}} seats left: invite friends or add bots.', {
                    n: open,
                  })
                : tr(
                    'table_games.wait_full',
                    'The creator starts the game once every seat is filled. Players are seated in joining order.'
                  )}
            </p>
            <div className={css.Row}>
              {table.mySeat < 0 && open > 0 && (
                <button type="button" className={css.Button} disabled={busy} onClick={onJoin}>
                  {tr('table_games.join_stake', 'Join · reserve {{stake}} credits', {
                    stake: table.stake,
                  })}
                </button>
              )}
              {me && (
                <button type="button" className={css.Button} onClick={onOpenSheet}>
                  {tr('table_games.invite', '+ Invite')}
                </button>
              )}
              {isOwner && (
                <>
                  {open > 0 && (
                    <button
                      type="button"
                      className={css.Button}
                      disabled={busy}
                      onClick={() => onAct({ type: 'fill_bots' })}
                    >
                      {tr('table_games.fill_bots', 'Fill with bots')}
                    </button>
                  )}
                  <button
                    type="button"
                    className={css.Button}
                    disabled={busy || open !== 0}
                    onClick={() => onAct({ type: 'start' })}
                  >
                    {tr('table_games.start', 'Start game')}
                  </button>
                  <button
                    type="button"
                    className={css.Button}
                    disabled={busy}
                    onClick={() => onAct({ type: 'cancel' })}
                  >
                    {tr('table_games.cancel', 'Cancel table and refund stakes')}
                  </button>
                </>
              )}
              {me && !isOwner && (
                <button
                  type="button"
                  className={css.Button}
                  disabled={busy}
                  onClick={() => onAct({ type: 'leave' })}
                >
                  {tr('table_games.leave', 'Leave and refund stake')}
                </button>
              )}
            </div>
          </div>
        )}
        {table.phase === 'finished' && table.result !== 'cancelled' && (
          <div className={css.Panel} role="status">
            <p>
              {tr('table_games.paid', 'The pot has been paid into the winner’s card-game wallet.')}
            </p>
            <button type="button" className={css.Button} onClick={onBack}>
              {tr('table_games.back_to_tables', 'Back to tables')}
            </button>
          </div>
        )}
        {me && !me.eliminated && live && (
          <div className={css.Row}>
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
                    onAct({ type: 'resign' });
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
              <button type="button" className={css.Button} onClick={() => setConfirmResign(true)}>
                {tr('table_games.resign', 'Resign')}
              </button>
            )}
          </div>
        )}
        {live && table.deadline && (
          <p className={css.Muted}>
            {tr('table_games.deadline', 'Turn deadline: {{time}}', {
              time: new Date(table.deadline).toLocaleTimeString(),
            })}
          </p>
        )}
      </div>
    </main>
  );
}
