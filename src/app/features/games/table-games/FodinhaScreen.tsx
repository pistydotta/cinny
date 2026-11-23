import React, { ReactNode, useState } from 'react';
import { tr } from '../../translation/tr';
import { FodinhaTable } from './FodinhaTable';
import { rulesText } from './text';
import { GameTable } from './types';
import { isBotId } from './tentosView';
import * as css from './tableGames.css';
import { GameTopBar } from '../ui/GameTopBar';

export type FodinhaScreenProps = {
  table: GameTable;
  busy: boolean;
  error: string;
  isOwner: boolean;
  onAct: (action: Record<string, unknown>) => void;
  onJoin: () => void;
  onBack: () => void;
  onOpenSheet: () => void;
  onSwitchTable: () => void;
  nameOf: (userId: string) => string;
  avatarOf: (userId: string) => string | undefined;
};

/**
 * A Fodinha table: the oval table under one bar that always says what's going on and what you
 * can do now (sit, start, take a seat someone left, leave). Empty seats are buttons too. Seats,
 * bots and invitations open in the sheet Truco uses.
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
  onSwitchTable,
  nameOf,
  avatarOf,
}: FodinhaScreenProps) {
  const [rules, setRules] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const me = table.mySeat >= 0 ? table.players[table.mySeat] : undefined;
  const waiting = table.phase === 'waiting';
  const live = !waiting && table.phase !== 'finished';
  const open = table.capacity - table.players.length;
  const seated = table.players.length;
  const vacant = table.players.some((p) => p.vacant);
  const people = table.players.filter((p) => !isBotId(p.userId)).length;
  const pot = table.pot ?? table.stake * people;
  const stakeText = table.stake
    ? tr('table_games.stake_amount', '{{stake}} credits per player', { stake: table.stake })
    : tr('table_games.free', 'free');

  let text: ReactNode = '';
  let sub = '';
  let actions: ReactNode = null;

  if (waiting) {
    sub = tr('table_games.seated_of', '{{n}} of {{total}} seated · {{stake}}', {
      n: seated,
      total: table.capacity,
      stake: stakeText,
    });
    if (!me) {
      text = open
        ? tr('table_games.pick_seat', 'Pick an empty seat to sit down.')
        : tr('table_games.table_full', 'This table is full.');
      actions = open > 0 && (
        <button type="button" className={css.SmallPrimary} disabled={busy} onClick={onJoin}>
          {table.stake
            ? tr('table_games.sit_stake', 'Sit · {{stake}} credits', { stake: table.stake })
            : tr('games.table.sit', 'Sit')}
        </button>
      );
    } else if (isOwner) {
      text =
        seated >= 2
          ? tr('table_games.ready_n', 'Ready to start with {{n}}. More can still sit down.', {
              n: seated,
            })
          : tr(
              'table_games.need_one',
              'One more player and you can start: invite someone or add a bot.'
            );
      actions = (
        <>
          {open > 0 && (
            <button
              type="button"
              className={css.SmallButton}
              disabled={busy}
              onClick={() => onAct({ type: 'fill_bots' })}
            >
              {tr('table_games.fill_bots', 'Fill with bots')}
            </button>
          )}
          <button type="button" className={css.SmallButton} onClick={onOpenSheet}>
            {tr('table_games.invite', '+ Invite')}
          </button>
          <button
            type="button"
            className={css.SmallPrimary}
            disabled={busy || seated < 2}
            onClick={() => onAct({ type: 'start' })}
          >
            {tr('table_games.start_n', 'Start with {{n}}', { n: seated })}
          </button>
          <button
            type="button"
            className={css.SmallDanger}
            disabled={busy}
            onClick={() => onAct({ type: 'cancel' })}
          >
            {tr('table_games.cancel_short', 'Cancel table')}
          </button>
        </>
      );
    } else {
      text = tr('table_games.wait_owner', 'Waiting for {{name}} to start.', {
        name: nameOf(table.ownerId),
      });
      actions = (
        <>
          <button type="button" className={css.SmallButton} onClick={onOpenSheet}>
            {tr('table_games.invite', '+ Invite')}
          </button>
          <button
            type="button"
            className={css.SmallGhost}
            disabled={busy}
            onClick={() => onAct({ type: 'leave' })}
          >
            {tr('table_games.leave_refund', 'Leave · stake back')}
          </button>
        </>
      );
    }
  } else if (live) {
    sub = [
      table.round ? tr('table_games.round', 'Round {{round}}', { round: table.round }) : '',
      tr('table_games.pot_short', 'Pot: {{pot}} credits', { pot }),
    ]
      .filter(Boolean)
      .join(' · ');
    if (!me) {
      text = vacant
        ? tr('table_games.seat_free', 'Someone left: their seat is free, and a bot is playing it.')
        : tr('table_games.spectating', 'You are watching this table.');
      actions = vacant && (
        <button type="button" className={css.SmallPrimary} disabled={busy} onClick={onJoin}>
          {table.stake
            ? tr('table_games.take_stake', 'Take the seat · {{stake}} credits', {
                stake: table.stake,
              })
            : tr('table_games.take_seat', 'Take this seat')}
        </button>
      );
    } else if (confirmLeave) {
      text = me.eliminated
        ? tr('table_games.leave_out', 'Leave the table? You are already out.')
        : tr(
            'table_games.leave_confirm',
            'Leave? A bot plays your seat on and your stake stays in the pot. Anyone can take the seat.'
          );
      actions = (
        <>
          <button type="button" className={css.SmallButton} onClick={() => setConfirmLeave(false)}>
            {tr('table_games.keep_playing', 'Keep playing')}
          </button>
          <button
            type="button"
            className={css.SmallDanger}
            disabled={busy}
            onClick={() => {
              setConfirmLeave(false);
              onAct({ type: 'leave' });
            }}
          >
            {tr('table_games.leave_yes', 'Leave the table')}
          </button>
        </>
      );
    } else {
      text = me.eliminated
        ? tr('table_games.you_out', 'You are out. You can keep watching.')
        : tr('table_games.you_playing', 'You are playing.');
      actions = (
        <button type="button" className={css.SmallGhost} onClick={() => setConfirmLeave(true)}>
          {tr('table_games.leave_short', 'Leave')}
        </button>
      );
    }
  } else {
    if (table.result === 'cancelled')
      text = tr('table_games.cancelled', 'Table cancelled · stakes refunded');
    else if (table.result === 'abandoned')
      text = tr('table_games.abandoned', 'Table closed: nobody was playing anymore.');
    else text = tr('table_games.paid', 'The pot has been paid into the winner’s card-game wallet.');
    actions = (
      <button type="button" className={css.SmallPrimary} onClick={onBack}>
        {tr('table_games.back_to_tables', 'Back to tables')}
      </button>
    );
  }

  // An empty seat sits you down, or, for the owner, adds a bot.
  let emptySeat: { label: string; onClick: () => void } | undefined;
  if (waiting && !me && open > 0)
    emptySeat = { label: tr('games.table.sit', 'Sit'), onClick: onJoin };
  else if (waiting && isOwner)
    emptySeat = {
      label: tr('table_games.add_bot_seat', '+ Bot'),
      onClick: () => onAct({ type: 'add_bot' }),
    };

  return (
    <main className={css.StagePage}>
      <div className={css.Head}>
        <GameTopBar
          title={table.name}
          subtitle={table.stake ? `Fodinha · ${stakeText}` : 'Fodinha'}
          onBack={onBack}
        >
          <div className={css.Actions}>
            <button
              type="button"
              className={css.SmallGhost}
              aria-pressed={rules}
              onClick={() => setRules(!rules)}
            >
              {tr('table_games.rules_short', 'Rules')}
            </button>
            <button type="button" className={css.SmallGhost} onClick={onSwitchTable}>
              {tr('games.switch.title', 'Switch table')}
            </button>
            {me && !waiting && (
              <button type="button" className={css.SmallButton} onClick={onOpenSheet}>
                {tr('table_games.table_menu', 'Table')}
              </button>
            )}
          </div>
        </GameTopBar>
        <div className={css.ActionBar} aria-live="polite">
          <div className={css.ActionText}>
            <span>{text}</span>
            {sub && <span className={css.ActionSub}>{sub}</span>}
          </div>
          {actions && <div className={css.Actions}>{actions}</div>}
        </div>
      </div>
      <div className={css.Inner}>
        {error && (
          <p role="alert" className={css.Error}>
            {error}
          </p>
        )}
        {rules && (
          <div className={css.Panel}>
            <p className={css.Muted}>{rulesText('fodinha')}</p>
            <p className={css.Muted}>
              {tr(
                'table_games.timeout_rules',
                'Truco gives 45 seconds per turn and Fodinha 2 minutes. When time runs out the game plays for you: in Truco it plays a card or answers a raise, never raising; in Fodinha it bets 0 or plays your first card. A finished round moves on by itself after the same time. A waiting table closes an hour after the last person sat down, with a refund, and a game nobody plays for 30 minutes ends with a refund. Fodinha starts with two or more players. Leaving a started Fodinha leaves a bot in your seat and your stake in the pot; anyone can take the seat over. Stakes are play credits only.'
              )}
            </p>
          </div>
        )}
        <FodinhaTable
          table={table}
          busy={busy}
          onAct={onAct}
          nameOf={nameOf}
          avatarOf={avatarOf}
          emptySeat={emptySeat}
          onTakeSeat={!me && live ? onJoin : undefined}
        />
      </div>
    </main>
  );
}
