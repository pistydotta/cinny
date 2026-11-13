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

// The server refuses a top-up while credits sit at a table. The button stays visible then,
// disabled with the reason: hiding it left players with no idea where it went.
export function TopUpButton({ atTables, topUp, className }: TopUpButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

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
      <button
        type="button"
        className={className}
        disabled={busy || atTables > 0}
        onClick={handleClick}
      >
        {tr('games.wallet.top_up', 'Get more coins')}
      </button>
      {atTables > 0 && (
        <p className={css.Note}>
          {tr(
            'games.wallet.top_up_blocked',
            'Finish or leave your card-game tables to get more coins.'
          )}
        </p>
      )}
      {error && <p className={css.ErrorText}>{error}</p>}
    </>
  );
}
