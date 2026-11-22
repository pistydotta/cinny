import React from 'react';
import { tr } from '../../translation/tr';
import * as css from '../poker/pokerPage.css';

export type SwitchOption = {
  id: string;
  name: string;
  /** Seats, stake or blinds: whatever tells two tables of this game apart. */
  detail: string;
  /** Already mine: going there leaves nothing here. */
  mine?: boolean;
};

type SwitchTableDialogProps = {
  /** Undefined while loading. */
  options?: SwitchOption[];
  /** What happens to my place at this table when I go to another. */
  warning?: string;
  error?: string;
  busy: boolean;
  onPick: (option: SwitchOption) => void;
  onCancel: () => void;
};

/** Every game's way to another table of the same game, without going back through the lobby. */
export function SwitchTableDialog({
  options,
  warning,
  error,
  busy,
  onPick,
  onCancel,
}: SwitchTableDialogProps) {
  const title = tr('games.switch.title', 'Switch table');
  return (
    <div className={css.Overlay}>
      <div className={css.Dialog} role="dialog" aria-label={title}>
        <div>
          <h2 className={css.DialogTitle}>{title}</h2>
          {warning && <p className={css.DialogText}>{warning}</p>}
        </div>
        {!options && (
          <p className={css.Note}>{tr('games.switch.loading', 'Looking for tables…')}</p>
        )}
        {options?.length === 0 && (
          <p className={css.Note}>
            {tr('games.switch.none', 'No other open table right now. Create one from the lobby.')}
          </p>
        )}
        {!!options?.length && (
          <div className={css.ContactList}>
            {options.map((o) => (
              <div key={o.id} className={css.CheckRow}>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <span>{o.name}</span>
                  <span className={css.Muted}>{o.detail}</span>
                </span>
                <button
                  type="button"
                  className={css.QuietButton}
                  disabled={busy}
                  onClick={() => onPick(o)}
                >
                  {o.mine ? tr('games.switch.open', 'Open') : tr('games.switch.go', 'Go there')}
                </button>
              </div>
            ))}
          </div>
        )}
        {error && <p className={css.ErrorText}>{error}</p>}
        <button type="button" className={css.SecondaryButton} onClick={onCancel}>
          {tr('games.switch.stay', 'Stay here')}
        </button>
      </div>
    </div>
  );
}
