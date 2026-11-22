import React from 'react';
import { tr } from '../../translation/tr';
import * as css from '../poker/pokerPage.css';

type InviteOnlyToggleProps = {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (inviteOnly: boolean) => void;
};

/** Truco, Fodinha and chess: whether strangers may sit, the counterpart of poker's "Public table". */
export function InviteOnlyToggle({ id, checked, disabled, onChange }: InviteOnlyToggleProps) {
  return (
    <label className={css.CheckRow} htmlFor={id}>
      <input
        id={id}
        className={css.CheckInput}
        type="checkbox"
        disabled={disabled}
        checked={checked}
        onChange={() => onChange(!checked)}
      />
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span>{tr('table_games.invite_only', 'Invited only')}</span>
        <span className={css.Muted}>
          {tr(
            'table_games.invite_only_hint',
            'Only people you invite, or who have the link, can sit. Anyone can still watch.'
          )}
        </span>
      </span>
    </label>
  );
}
