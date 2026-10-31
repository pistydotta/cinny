import React, { useState } from 'react';
import { ApiError } from '../../../utils/blazeroomApi';
import { errorText } from '../poker/errorText';
import * as css from '../poker/pokerPage.css';
import { tr } from '../../translation/tr';

type TopUpButtonProps = {
  atTables: number;
  topUp: () => Promise<void>;
  className: string;
};

// The server refuses a top-up while seated; hiding the button when chips are at tables is
// only the courtesy, so a seated player with no chips left still gets the reason.
export function TopUpButton({ atTables, topUp, className }: TopUpButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  if (atTables > 0) return null;

  const handleClick = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await topUp();
    } catch (e) {
      setError(errorText(e instanceof ApiError ? e.code : 'unknown'));
    }
    setBusy(false);
  };

  return (
    <>
      <button type="button" className={className} disabled={busy} onClick={handleClick}>
        {tr('games.wallet.top_up', 'Get more coins')}
      </button>
      {error && <p className={css.ErrorText}>{error}</p>}
    </>
  );
}
