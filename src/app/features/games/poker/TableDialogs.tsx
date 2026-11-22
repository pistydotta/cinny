import React, { ReactNode, useEffect, useState } from 'react';
import { ApiError } from '../../../utils/blazeroomApi';
import { BuyInField } from './TableParts';
import { AccessFields, TableAccess } from '../invite/InvitePicker';
import { InvitePanel } from '../invite/InvitePanel';
import type { TableStatus } from '../invite/inviteCandidates';
import { errorText } from './errorText';
import { defaultBuyIn } from './buyIn';
import { formatChips } from './types';
import * as css from './pokerPage.css';
import { tr } from '../../translation/tr';

type DialogFrameProps = { title: string; text?: string; error?: string; children: ReactNode };

function DialogFrame({ title, text, error, children }: DialogFrameProps) {
  return (
    <div className={css.Overlay}>
      <div className={css.Dialog} role="dialog" aria-label={title}>
        <div>
          <h2 className={css.DialogTitle}>{title}</h2>
          {text && <p className={css.DialogText}>{text}</p>}
        </div>
        {children}
        {error && <p className={css.ErrorText}>{error}</p>}
      </div>
    </div>
  );
}

type BuyInLimits = { min: number; max: number; step: number; balance: number };

type SeatDialogProps = BuyInLimits & {
  error?: string;
  seat: number;
  onSit: (buyIn: number) => void;
  onTopUp: () => void;
  onCancel: () => void;
};

export function SeatDialog({
  seat,
  min,
  max,
  step,
  balance,
  onSit,
  onTopUp,
  onCancel,
  error,
}: SeatDialogProps) {
  const [buyIn, setBuyIn] = useState(() => defaultBuyIn(balance, min, max, step));
  const canAfford = balance >= min;

  return (
    <DialogFrame
      title={tr('games.shared.sit_title', 'Sit in seat {{seat}}', { seat: seat + 1 })}
      error={error}
      text={tr(
        'games.shared.sit_text',
        'The chips come out of your wallet and go back to it when you leave the table.'
      )}
    >
      {canAfford ? (
        <BuyInField
          value={buyIn}
          min={min}
          max={Math.min(max, balance)}
          step={step}
          onChange={setBuyIn}
        />
      ) : (
        <p className={css.ErrorText}>
          {tr('games.buy_in.need_at_least', 'You need at least {{coins}} coins to sit down.', {
            coins: formatChips(min),
          })}
        </p>
      )}
      <div className={css.InfoBox}>
        <div className={css.InfoRow}>
          <span>{tr('games.wallet.yours', 'Your wallet')}</span>
          <strong>
            {tr('games.wallet.coins', '{{coins}} coins', { coins: formatChips(balance) })}
          </strong>
        </div>
      </div>
      {canAfford ? (
        <button type="button" className={css.PrimaryButton} onClick={() => onSit(buyIn)}>
          {tr('games.buy_in.sit', 'Sit down')}
        </button>
      ) : (
        <button type="button" className={css.PrimaryButton} onClick={onTopUp}>
          {tr('games.wallet.top_up', 'Get more coins')}
        </button>
      )}
      <button type="button" className={css.SecondaryButton} onClick={onCancel}>
        {tr('games.shared.not_now', 'Not now')}
      </button>
    </DialogFrame>
  );
}

type RebuyDialogProps = BuyInLimits & {
  error?: string;
  onRebuy: (amount: number) => void;
  onLeave: () => void;
};

export function RebuyDialog({
  min,
  max,
  step,
  balance,
  onRebuy,
  onLeave,
  error,
}: RebuyDialogProps) {
  const [amount, setAmount] = useState(() => defaultBuyIn(balance, min, max, step));
  const canAfford = balance >= min;

  return (
    <DialogFrame
      title={tr('games.rebuy.title', 'Out of chips')}
      error={error}
      text={tr(
        'games.rebuy.text',
        'Buy more chips with the coins in your wallet, or leave the table.'
      )}
    >
      {canAfford ? (
        <BuyInField
          value={amount}
          min={min}
          max={Math.min(max, balance)}
          step={step}
          onChange={setAmount}
        />
      ) : (
        <p className={css.ErrorText}>
          {tr('games.rebuy.not_enough', 'Your wallet does not have enough coins.')}
        </p>
      )}
      {canAfford ? (
        <button type="button" className={css.PrimaryButton} onClick={() => onRebuy(amount)}>
          {tr('games.rebuy.button', 'Buy chips')}
        </button>
      ) : (
        // Seated players can't top up; leaving returns the chips and then the button works.
        <p className={css.Note}>
          {tr('games.rebuy.top_up_after_leaving', 'Leave the table to get more coins.')}
        </p>
      )}
      <button type="button" className={css.SecondaryButton} onClick={onLeave}>
        {tr('games.action.leave', 'Leave the table')}
      </button>
    </DialogFrame>
  );
}

export function AwayDialog({
  onBack,
  onLeave,
  error,
}: {
  onBack: () => void;
  onLeave: () => void;
  error?: string;
}) {
  return (
    <DialogFrame
      title={tr('games.shared.away_title', 'You were away')}
      error={error}
      text={tr(
        'games.shared.away_text',
        "You ran out of time, so you folded that hand. You won't be dealt in until you come back."
      )}
    >
      <button type="button" className={css.PrimaryButton} onClick={onBack}>
        {tr('games.shared.back_to_game', 'Back to the game')}
      </button>
      <button type="button" className={css.SecondaryButton} onClick={onLeave}>
        {tr('games.action.leave', 'Leave the table')}
      </button>
    </DialogFrame>
  );
}

export function CloseDialog({
  onClose,
  onCancel,
  error,
}: {
  onClose: () => void;
  onCancel: () => void;
  error?: string;
}) {
  return (
    <DialogFrame
      title={tr('games.table.close_title', 'Close the table?')}
      error={error}
      text={tr(
        'games.table.close_text',
        'Everyone is sent home with their chips and the table is deleted.'
      )}
    >
      <button type="button" className={css.PrimaryButton} onClick={onClose}>
        {tr('games.table.close', 'Close the table')}
      </button>
      <button type="button" className={css.SecondaryButton} onClick={onCancel}>
        {tr('games.shared.not_now', 'Not now')}
      </button>
    </DialogFrame>
  );
}

export function LeaveDialog({
  onLeave,
  onCancel,
  error,
}: {
  onLeave: () => void;
  onCancel: () => void;
  error?: string;
}) {
  return (
    <DialogFrame
      title={tr('games.lobby.leave_title', 'Leave the table?')}
      error={error}
      text={tr(
        'games.lobby.leave_text',
        'You get your chips back and the table leaves your list. You can only come back with a new invite.'
      )}
    >
      <button type="button" className={css.PrimaryButton} onClick={onLeave}>
        {tr('games.action.leave', 'Leave the table')}
      </button>
      <button type="button" className={css.SecondaryButton} onClick={onCancel}>
        {tr('games.shared.not_now', 'Not now')}
      </button>
    </DialogFrame>
  );
}

type InviteDialogProps = {
  access: TableAccess;
  /** Only the owner changes who may come in. */
  canChangeAccess: boolean;
  loadStatus: () => Promise<ReadonlyMap<string, TableStatus>>;
  onInvite: (userIds: string[]) => Promise<void>;
  getLink: () => Promise<string>;
  onAccess: (access: TableAccess) => Promise<void>;
  onDone: () => void;
};

export function InviteDialog({
  access,
  canChangeAccess,
  loadStatus,
  onInvite,
  getLink,
  onAccess,
  onDone,
}: InviteDialogProps) {
  const [status, setStatus] = useState<ReadonlyMap<string, TableStatus>>(new Map());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    loadStatus().then(setStatus, () => undefined);
  }, [loadStatus]);

  const describe = (e: unknown) => errorText(e instanceof ApiError ? e.code : 'unknown');
  const changeAccess = async (next: TableAccess) => {
    setBusy(true);
    setError(undefined);
    try {
      await onAccess(next);
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogFrame title={tr('games.table.invite_title', 'Invite friends')}>
      {canChangeAccess && <AccessFields value={access} disabled={busy} onChange={changeAccess} />}
      {error && <p className={css.ErrorText}>{error}</p>}
      <InvitePanel
        everyone={access.inviteAnyone}
        status={status}
        onInvite={async (userIds) => {
          await onInvite(userIds);
          setStatus(await loadStatus());
        }}
        getLink={getLink}
        describeError={describe}
        hint={tr(
          'games.invite.hint',
          'Invited people see the table in their lobby and on the games page. The link lets anyone with it in.'
        )}
      />
      <button type="button" className={css.SecondaryButton} onClick={onDone}>
        {tr('games.table.done', 'Done')}
      </button>
    </DialogFrame>
  );
}
