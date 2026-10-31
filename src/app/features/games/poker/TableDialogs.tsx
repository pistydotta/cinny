import React, { ReactNode, useState } from 'react';
import { ApiError } from '../../../utils/blazeroomApi';
import { BuyInField } from './TableParts';
import { errorText } from './errorText';
import { defaultBuyIn } from './buyIn';
import { formatChips } from './types';
import * as css from './pokerPage.css';
import { tr } from '../../translation/tr';

type DialogFrameProps = { title: string; text?: string; children: ReactNode };

function DialogFrame({ title, text, children }: DialogFrameProps) {
  return (
    <div className={css.Overlay}>
      <div className={css.Dialog} role="dialog" aria-label={title}>
        <div>
          <h2 className={css.DialogTitle}>{title}</h2>
          {text && <p className={css.DialogText}>{text}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

type BuyInLimits = { min: number; max: number; step: number; balance: number };

type SeatDialogProps = BuyInLimits & {
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
}: SeatDialogProps) {
  const [buyIn, setBuyIn] = useState(() => defaultBuyIn(balance, min, max, step));
  const canAfford = balance >= min;

  return (
    <DialogFrame
      title={tr('games.shared.sit_title', 'Sit in seat {{seat}}', { seat: seat + 1 })}
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
  onRebuy: (amount: number) => void;
  onLeave: () => void;
};

export function RebuyDialog({ min, max, step, balance, onRebuy, onLeave }: RebuyDialogProps) {
  const [amount, setAmount] = useState(() => defaultBuyIn(balance, min, max, step));
  const canAfford = balance >= min;

  return (
    <DialogFrame
      title={tr('games.rebuy.title', 'Out of chips')}
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

export function AwayDialog({ onBack, onLeave }: { onBack: () => void; onLeave: () => void }) {
  return (
    <DialogFrame
      title={tr('games.shared.away_title', 'You were away')}
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

export function CloseDialog({ onClose, onCancel }: { onClose: () => void; onCancel: () => void }) {
  return (
    <DialogFrame
      title={tr('games.table.close_title', 'Close the table?')}
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

export type InviteFriend = { userId: string; name: string };

type InviteDialogProps = {
  friends: InviteFriend[];
  onInvite: (userId: string) => Promise<void>;
  onDone: () => void;
};

export function InviteDialog({ friends, onInvite, onDone }: InviteDialogProps) {
  const [invited, setInvited] = useState<string[]>([]);
  const [error, setError] = useState<string>();

  const invite = async (userId: string) => {
    setError(undefined);
    try {
      await onInvite(userId);
      setInvited((list) => [...list, userId]);
    } catch (e) {
      setError(errorText(e instanceof ApiError ? e.code : 'unknown'));
    }
  };

  return (
    <DialogFrame title={tr('games.table.invite_title', 'Invite friends')}>
      {friends.length === 0 ? (
        <p className={css.DialogText}>
          {tr('games.table.invite_no_friends', 'You have no friends to invite yet.')}
        </p>
      ) : (
        <div className={css.ContactList}>
          {friends.map((friend) => (
            <div key={friend.userId} className={css.CheckRow}>
              <span>{friend.name}</span>
              <button
                type="button"
                className={css.SmallButton}
                disabled={invited.includes(friend.userId)}
                onClick={() => invite(friend.userId)}
              >
                {invited.includes(friend.userId)
                  ? tr('games.table.invited', 'Invited')
                  : tr('games.table.invite', 'Invite')}
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <p className={css.ErrorText}>{error}</p>}
      <button type="button" className={css.SecondaryButton} onClick={onDone}>
        {tr('games.table.done', 'Done')}
      </button>
    </DialogFrame>
  );
}
