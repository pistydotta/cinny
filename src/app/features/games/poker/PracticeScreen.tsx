import React, { useEffect, useMemo, useState } from 'react';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { ApiError } from '../../../utils/blazeroomApi';
import { useCredits } from '../credits/useCredits';
import { createPokerApi } from './api';
import { defaultBuyIn } from './buyIn';
import { errorText } from './errorText';
import { BuyInField } from './TableParts';
import { TableScreen } from './TableScreen';
import { formatChips } from './types';
import * as css from './pokerPage.css';
import { tr } from '../../translation/tr';

// The blinds and buy-in limits of the server's practice table, which doesn't exist yet to ask.
const BIG_BLIND = 20;
const MIN_BUY_IN = BIG_BLIND * 20;
const MAX_BUY_IN = BIG_BLIND * 100;
const STEP = BIG_BLIND * 5;

type PracticeScreenProps = {
  onBack: () => void;
};

export function PracticeScreen({ onBack }: PracticeScreenProps) {
  const mx = useMatrixClient();
  const api = useMemo(() => createPokerApi(() => mx.getAccessToken()), [mx]);
  const { balance, refresh, topUp } = useCredits();
  const [tableId, setTableId] = useState<string>();
  const [checking, setChecking] = useState(true);
  const [bots, setBots] = useState(5);
  const [buyIn, setBuyIn] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    refresh();
    api
      .list()
      .then(({ practiceId }) => {
        if (cancelled) return;
        if (practiceId) setTableId(practiceId);
        else setChecking(false);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, refresh]);

  if (tableId) return <TableScreen key={tableId} tableId={tableId} onBack={onBack} />;
  if (checking) return <div className={css.Page} />;

  const money = balance ?? 0;
  const canAfford = money >= MIN_BUY_IN;
  const chosen = buyIn ?? defaultBuyIn(money, MIN_BUY_IN, MAX_BUY_IN, STEP);

  const attempt = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await task();
    } catch (e) {
      setError(errorText(e instanceof ApiError ? e.code : 'unknown'));
    }
    setBusy(false);
  };

  const create = () =>
    attempt(async () => {
      const id = await api.practice({ bots, buyIn: chosen });
      refresh();
      setTableId(id);
    });

  return (
    <div className={css.Page}>
      <div className={css.Overlay} style={{ position: 'relative', flexGrow: 1 }}>
        <div
          className={css.Dialog}
          role="dialog"
          aria-label={tr('games.practice.join', 'Join the table')}
        >
          <div>
            <h2 className={css.DialogTitle}>{tr('games.practice.title', 'Poker table')}</h2>
            <p className={css.DialogText}>
              {tr('games.practice.subtitle', 'No-limit Texas Hold’em · Blinds {{small}}/{{big}}', {
                small: formatChips(BIG_BLIND / 2),
                big: formatChips(BIG_BLIND),
              })}
            </p>
          </div>

          {canAfford ? (
            <BuyInField
              value={chosen}
              min={MIN_BUY_IN}
              max={Math.min(MAX_BUY_IN, money)}
              step={STEP}
              onChange={setBuyIn}
            />
          ) : (
            <p className={css.ErrorText}>
              {tr('games.buy_in.need_at_least', 'You need at least {{coins}} coins to sit down.', {
                coins: formatChips(MIN_BUY_IN),
              })}
            </p>
          )}

          <div className={css.Field}>
            <div className={css.FieldHeader}>
              <span>{tr('games.practice.opponents', 'Opponents')}</span>
            </div>
            <div className={css.Segmented}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={css.SegmentButton}
                  aria-pressed={bots === n}
                  onClick={() => setBots(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className={css.InfoBox}>
            <div className={css.InfoRow}>
              <span>{tr('games.wallet.yours', 'Your wallet')}</span>
              <strong>
                {tr('games.wallet.coins', '{{coins}} coins', { coins: formatChips(money) })}
              </strong>
            </div>
          </div>

          {error && <p className={css.ErrorText}>{error}</p>}

          {canAfford ? (
            <button type="button" className={css.PrimaryButton} disabled={busy} onClick={create}>
              {tr('games.buy_in.sit', 'Sit down')}
            </button>
          ) : (
            <button
              type="button"
              className={css.PrimaryButton}
              disabled={busy}
              onClick={() => attempt(topUp)}
            >
              {tr('games.wallet.top_up', 'Get more coins')}
            </button>
          )}
          <button type="button" className={css.SecondaryButton} onClick={onBack}>
            {tr('games.action.back', 'Back')}
          </button>
          <p className={css.Note}>
            {tr(
              'games.practice.note',
              'Here you play against bots. The chips you win or lose go back to your wallet when you leave the table.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
