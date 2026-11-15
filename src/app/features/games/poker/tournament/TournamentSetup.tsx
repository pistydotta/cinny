import React, { useEffect, useMemo, useState } from 'react';
import { useMatrixClient } from '../../../../hooks/useMatrixClient';
import { ApiError } from '../../../../utils/blazeroomApi';
import { useCredits } from '../../credits/useCredits';
import { tr } from '../../../translation/tr';
import { createPokerApi } from '../api';
import { errorText } from '../errorText';
import { formatChips } from '../types';
import * as css from '../pokerPage.css';

// What the API accepts (api/src/poker/tournament/structure.js).
const FIELDS = [45, 90, 180];
const BUY_INS = [0, 100, 500, 2000];
const SPEEDS = [
  { key: 'turbo', hands: 6 },
  { key: 'regular', hands: 10 },
] as const;
const START_STACK = 5000;
const PAID_FRACTION = 0.15;

type Speed = typeof SPEEDS[number]['key'];

type TournamentSetupProps = {
  onBack: () => void;
  onOpen: (tableId: string) => void;
};

/** Picks the size, the buy-in and the pace of a new tournament. */
export function TournamentSetup({ onBack, onOpen }: TournamentSetupProps) {
  const mx = useMatrixClient();
  const myId = mx.getUserId() ?? '';
  const api = useMemo(() => createPokerApi(() => mx.getAccessToken()), [mx]);
  const { balance, refresh, topUp } = useCredits();
  const [checking, setChecking] = useState(true);
  const [field, setField] = useState(180);
  const [buyIn, setBuyIn] = useState(100);
  const [speed, setSpeed] = useState<Speed>('turbo');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  // One tournament of your own at a time: an open one is where this screen leads.
  useEffect(() => {
    let cancelled = false;
    Promise.all([api.list().catch(() => undefined), refresh()]).then(([list]) => {
      if (cancelled) return;
      const mine = list?.tournaments?.find((t) => t.ownerId === myId);
      if (mine) onOpen(mine.id);
      else setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [api, refresh, myId, onOpen]);

  if (checking) return <div className={css.Page} />;

  const money = balance ?? 0;
  const canAfford = money >= buyIn;

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
      const id = await api.createTournament({ field, buyIn, speed });
      refresh();
      onOpen(id);
    });

  return (
    <div className={css.Page}>
      <div className={css.Overlay} style={{ position: 'relative', flexGrow: 1 }}>
        <div className={css.Dialog} role="dialog" aria-label={tr('tourney.title', 'Tournament')}>
          <div>
            <h2 className={css.DialogTitle}>{tr('tourney.setup.title', 'New tournament')}</h2>
            <p className={css.DialogText}>
              {tr(
                'tourney.setup.subtitle',
                'No-limit Hold’em, nine per table, against a field of bots. Play alone or invite friends to your table before you start.'
              )}
            </p>
          </div>

          <div className={css.Field}>
            <div className={css.FieldHeader}>
              <span>{tr('tourney.setup.field', 'Players')}</span>
            </div>
            <div className={css.Segmented}>
              {FIELDS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={css.SegmentButton}
                  aria-pressed={field === n}
                  onClick={() => setField(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className={css.Field}>
            <div className={css.FieldHeader}>
              <span>{tr('tourney.facts.buy_in', 'Buy-in')}</span>
            </div>
            <div className={css.Segmented}>
              {BUY_INS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={css.SegmentButton}
                  aria-pressed={buyIn === n}
                  onClick={() => setBuyIn(n)}
                >
                  {n === 0 ? tr('tourney.free', 'Free') : formatChips(n)}
                </button>
              ))}
            </div>
          </div>

          <div className={css.Field}>
            <div className={css.FieldHeader}>
              <span>{tr('tourney.setup.speed', 'Pace')}</span>
            </div>
            <div className={css.Segmented}>
              {SPEEDS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={css.SegmentButton}
                  aria-pressed={speed === option.key}
                  onClick={() => setSpeed(option.key)}
                >
                  {option.key === 'turbo'
                    ? tr('tourney.setup.turbo', 'Turbo · {{count}} hands a level', {
                        count: option.hands,
                      })
                    : tr('tourney.setup.regular', 'Regular · {{count}} hands a level', {
                        count: option.hands,
                      })}
                </button>
              ))}
            </div>
          </div>

          <div className={css.InfoBox}>
            <div className={css.InfoRow}>
              <span>{tr('tourney.facts.stack', 'Starting stack')}</span>
              <strong>
                {tr('tourney.facts.stack_value', '{{chips}} chips (100 BB)', {
                  chips: formatChips(START_STACK),
                })}
              </strong>
            </div>
            <div className={css.InfoRow}>
              <span>{tr('tourney.facts.paid', 'Places paid')}</span>
              <strong>
                {tr('tourney.facts.paid_value', '{{count}} of {{field}}', {
                  count: Math.max(1, Math.round(field * PAID_FRACTION)),
                  field,
                })}
              </strong>
            </div>
            <div className={css.InfoRow}>
              <span>{tr('tourney.setup.pool', 'Prize pool')}</span>
              <strong>
                {buyIn > 0
                  ? tr('games.wallet.coins', '{{coins}} coins', {
                      coins: formatChips(field * buyIn),
                    })
                  : tr('tourney.setup.no_pool', 'none')}
              </strong>
            </div>
            <div className={css.InfoRow}>
              <span>{tr('games.wallet.yours', 'Your wallet')}</span>
              <strong>
                {tr('games.wallet.coins', '{{coins}} coins', {
                  coins: balance === undefined ? '—' : formatChips(money),
                })}
              </strong>
            </div>
          </div>

          {error && <p className={css.ErrorText}>{error}</p>}

          {canAfford ? (
            <button type="button" className={css.PrimaryButton} disabled={busy} onClick={create}>
              {buyIn > 0
                ? tr('tourney.setup.create_paid', 'Create for {{coins}} coins', {
                    coins: formatChips(buyIn),
                  })
                : tr('tourney.setup.create', 'Create tournament')}
            </button>
          ) : (
            <button
              type="button"
              className={css.PrimaryButton}
              disabled={busy}
              onClick={() => attempt(balance === undefined ? refresh : topUp)}
            >
              {balance === undefined
                ? tr('games.wallet.retry', 'Try again')
                : tr('games.wallet.top_up', 'Get more coins')}
            </button>
          )}
          <button type="button" className={css.SecondaryButton} onClick={onBack}>
            {tr('games.action.back', 'Back')}
          </button>
          <p className={css.Note}>
            {tr(
              'tourney.setup.note',
              'Blinds go up by hands played, not by the clock, and the hand runs fast once you fold. Leave the page to pause: your seat waits up to a day.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
