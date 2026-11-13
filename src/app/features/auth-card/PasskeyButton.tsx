import React from 'react';
import { Icon, Icons } from 'folds';
import { tr } from '../translation/tr';
import * as css from './authCard.css';

// Placeholder until passkey sign-in exists (Synapse needs MAS for it).
export function PasskeyButton() {
  return (
    <button
      type="button"
      className={css.Passkey}
      disabled
      title={tr('login.passkey_soon', 'Coming soon')}
    >
      <Icon size="100" src={Icons.ShieldLock} />
      {tr('login.passkey', 'Log in with passkey')}
      <span className={css.Soon}>{tr('login.passkey_soon', 'Coming soon')}</span>
    </button>
  );
}
