import React, { useEffect, useRef, useState } from 'react';
import { Icon, Icons } from 'folds';
import { canStartHand, formatChips, getPlayer, isHandInProgress } from '../engine';
import { GameWallet } from '../../wallet/gameWallet';
import { PokerTable } from '../table/PokerTable';
import { TableLayout } from '../table/layout';
import { ActionBar } from '../ActionBar';
import { BuyInField, HistoryDrawer } from '../TableParts';
import { TableTransport } from './transport';
import { useSharedTable } from './useSharedTable';
import * as css from '../pokerPage.css';
import { tr } from '../../../translation/tr';

type SeatDialogProps = {
  seat: number;
  min: number;
  max: number;
  step: number;
  balance: number;
  onSit: (buyIn: number) => void;
  onCancel: () => void;
};

function SeatDialog({ seat, min, max, step, balance, onSit, onCancel }: SeatDialogProps) {
  const top = Math.min(max, balance);
  const [buyIn, setBuyIn] = useState(Math.max(min, top));
  const canAfford = balance >= min;

  return (
    <div className={css.Dialog} role="dialog" aria-label={tr('games.buy_in.sit', 'Sit down')}>
      <div>
        <h2 className={css.DialogTitle}>
          {tr('games.shared.sit_title', 'Sit in seat {{seat}}', { seat: seat + 1 })}
        </h2>
        <p className={css.DialogText}>
          {tr(
            'games.shared.sit_text',
            'The chips come out of your wallet and go back to it when you leave the table.'
          )}
        </p>
      </div>
      {canAfford ? (
        <BuyInField value={buyIn} min={min} max={top} step={step} onChange={setBuyIn} />
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
        <div className={css.InfoRow}>
          <span>{tr('games.wallet.after_sitting', 'After sitting down')}</span>
          <strong>
            {tr('games.wallet.coins', '{{coins}} coins', {
              coins: formatChips(Math.max(0, balance - buyIn)),
            })}
          </strong>
        </div>
      </div>
      <button
        type="button"
        className={css.PrimaryButton}
        disabled={!canAfford}
        onClick={() => onSit(buyIn)}
      >
        {tr('games.buy_in.sit', 'Sit down')}
      </button>
      <button type="button" className={css.SecondaryButton} onClick={onCancel}>
        {tr('games.shared.not_now', 'Not now')}
      </button>
    </div>
  );
}

type SharedPokerGameProps = {
  transport: TableTransport;
  /** Wallet key of this table. */
  tableKey: string;
  profile: { name: string; avatarUrl?: string };
  wallet: GameWallet;
  resolveAvatar?: (url: string) => string | undefined;
  onBack?: () => void;
};

export function SharedPokerGame({
  transport,
  tableKey,
  profile,
  wallet,
  resolveAvatar,
  onBack,
}: SharedPokerGameProps) {
  const table = useSharedTable(transport, tableKey, profile, wallet);
  const { config } = transport;
  const { replica, display, me, seated } = table;
  const [layout, setLayout] = useState<TableLayout>('landscape');
  const [pickedSeat, setPickedSeat] = useState<number>();
  const [showHistory, setShowHistory] = useState(false);
  const [rebuyAmount, setRebuyAmount] = useState(config.maxBuyIn);
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setLayout(width < height * 0.95 ? 'portrait' : 'landscape');
    });
    observer.observe(area);
    return () => observer.disconnect();
  }, []);

  const host = replica?.hostId ? getPlayer(display, replica.hostId) : undefined;
  const displayMe = getPlayer(display, transport.userId);
  const handOver = !isHandInProgress(display);
  const busted = seated && !!me && me.stack === 0 && handOver;
  const away = seated && !!me?.sittingOut;
  const playersSeated = display.players.length;

  let subtitle = tr('games.table.blinds', 'Blinds {{small}}/{{big}}', {
    small: formatChips(config.smallBlind),
    big: formatChips(config.bigBlind),
  });
  if (display.handNumber > 0) {
    subtitle = `${tr('games.log.hand', 'Hand #{{n}}', { n: display.handNumber })} · ${subtitle}`;
  }
  if (host) {
    subtitle = `${subtitle} · ★ ${tr('games.shared.host_shuffles', '{{name}} shuffles', {
      name: host.name,
    })}`;
  }

  let emptyLabel: string | undefined;
  if (!table.loading && playersSeated === 0)
    emptyLabel = tr('games.shared.pick_seat', 'Pick a seat to sit down');

  return (
    <div className={css.Page}>
      <div className={css.TopBar}>
        {onBack && (
          <button
            type="button"
            className={css.IconButton}
            onClick={onBack}
            aria-label={tr('games.action.back', 'Back')}
          >
            <Icon size="200" src={Icons.ArrowLeft} />
          </button>
        )}
        <div className={css.TopTitle}>
          <span className={css.TitleText}>{config.name}</span>
          <span className={css.SubtitleText}>{subtitle}</span>
        </div>
        <div className={css.WalletPill} title={tr('games.wallet.hint', 'Coins in your wallet')}>
          <span className={css.Coin}>$</span>
          <span className={css.WalletValue}>{formatChips(wallet.balance)}</span>
          {seated && me && (
            <span className={css.WalletMuted}>
              ·{' '}
              {tr('games.wallet.at_table', '{{chips}} at the table', {
                chips: formatChips(me.stack),
              })}
            </span>
          )}
        </div>
        <button
          type="button"
          className={css.IconButton}
          aria-pressed={showHistory}
          onClick={() => setShowHistory((v) => !v)}
          aria-label={tr('games.table.history', 'Table history')}
        >
          <Icon size="200" src={Icons.RecentClock} />
        </button>
        {seated && (
          <button
            type="button"
            className={css.IconButton}
            onClick={() => table.leave()}
            aria-label={tr('games.action.leave', 'Leave the table')}
          >
            <Icon size="200" src={Icons.Power} />
            <span className={css.WideOnly}>{tr('games.action.leave', 'Leave the table')}</span>
          </button>
        )}
      </div>

      <div className={css.TableArea} ref={areaRef}>
        <div className={css.StageWrap} data-layout={layout}>
          <PokerTable
            state={display}
            heroId={transport.userId}
            turnTimer={table.turnTimer}
            layout={layout}
            seatOffset={displayMe?.seat ?? 0}
            onSeatClick={seated || table.loading ? undefined : setPickedSeat}
            hostId={replica?.hostId}
            resolveAvatar={resolveAvatar}
            emptyLabel={emptyLabel}
          />
        </div>

        {showHistory && <HistoryDrawer log={display.log} />}

        {table.loading && (
          <div className={css.Overlay}>
            <div className={css.Dialog}>
              <h2 className={css.DialogTitle}>{tr('games.table.loading', 'Loading the table…')}</h2>
            </div>
          </div>
        )}

        {pickedSeat !== undefined && !seated && (
          <div className={css.Overlay}>
            <SeatDialog
              seat={pickedSeat}
              min={config.minBuyIn}
              max={config.maxBuyIn}
              step={config.bigBlind * 5}
              balance={wallet.balance}
              onCancel={() => setPickedSeat(undefined)}
              onSit={(buyIn) => {
                table.join(pickedSeat, buyIn);
                setPickedSeat(undefined);
              }}
            />
          </div>
        )}

        {busted && !away && (
          <div className={css.Overlay}>
            <div
              className={css.Dialog}
              role="dialog"
              aria-label={tr('games.rebuy.title', 'Out of chips')}
            >
              <div>
                <h2 className={css.DialogTitle}>{tr('games.rebuy.title', 'Out of chips')}</h2>
                <p className={css.DialogText}>
                  {tr(
                    'games.rebuy.text',
                    'Buy more chips with the coins in your wallet, or leave the table.'
                  )}
                </p>
              </div>
              {wallet.balance >= config.minBuyIn ? (
                <BuyInField
                  value={Math.min(rebuyAmount, wallet.balance, config.maxBuyIn)}
                  min={config.minBuyIn}
                  max={Math.min(config.maxBuyIn, wallet.balance)}
                  step={config.bigBlind * 5}
                  onChange={setRebuyAmount}
                />
              ) : (
                <p className={css.ErrorText}>
                  {tr('games.rebuy.not_enough', 'Your wallet does not have enough coins.')}
                </p>
              )}
              <button
                type="button"
                className={css.PrimaryButton}
                disabled={wallet.balance < config.minBuyIn}
                onClick={() => table.rebuy(Math.min(rebuyAmount, wallet.balance, config.maxBuyIn))}
              >
                {tr('games.rebuy.button', 'Buy chips')}
              </button>
              <button type="button" className={css.SecondaryButton} onClick={() => table.leave()}>
                {tr('games.action.leave', 'Leave the table')}
              </button>
            </div>
          </div>
        )}

        {away && (
          <div className={css.Overlay}>
            <div
              className={css.Dialog}
              role="dialog"
              aria-label={tr('games.shared.away_title', 'You were away')}
            >
              <div>
                <h2 className={css.DialogTitle}>
                  {tr('games.shared.away_title', 'You were away')}
                </h2>
                <p className={css.DialogText}>
                  {tr(
                    'games.shared.away_text',
                    "You ran out of time, so you folded that hand. You won't be dealt in until you come back."
                  )}
                </p>
              </div>
              <button type="button" className={css.PrimaryButton} onClick={table.back}>
                {tr('games.shared.back_to_game', 'Back to the game')}
              </button>
              <button type="button" className={css.SecondaryButton} onClick={() => table.leave()}>
                {tr('games.action.leave', 'Leave the table')}
              </button>
            </div>
          </div>
        )}
      </div>

      {table.error && (
        <p className={css.ErrorText} style={{ padding: '0 16px' }}>
          {table.error}
        </p>
      )}

      {seated && (
        <ActionBar
          state={display}
          hero={displayMe}
          legal={table.legal}
          leaveAfterHand={false}
          onAction={table.act}
          onCancelLeave={() => undefined}
          waitingText={
            canStartHand(display)
              ? tr('games.status.shuffling', 'Shuffling…')
              : tr('games.status.waiting_players', 'Waiting for more players to start…')
          }
        />
      )}
    </div>
  );
}
