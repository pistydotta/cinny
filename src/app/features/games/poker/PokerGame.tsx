import React, { useEffect, useRef, useState } from 'react';
import { Icon, Icons } from 'folds';
import { formatChips } from './engine';
import { BuyInField, HistoryDrawer } from './TableParts';
import { tr } from '../../translation/tr';
import {
  MAX_BUY_IN,
  MIN_BUY_IN,
  POKER_CONFIG,
  PokerHero,
  TableSetup,
  usePokerTable,
} from './usePokerTable';
import { GameWallet, PRACTICE_TABLE } from '../wallet/gameWallet';
import { PokerTable } from './table/PokerTable';
import { TableLayout } from './table/layout';
import { ActionBar } from './ActionBar';
import * as css from './pokerPage.css';

type JoinDialogProps = {
  balance: number;
  ready: boolean;
  error?: string;
  onSit: (setup: TableSetup) => Promise<void>;
};

function JoinDialog({ balance, ready, error, onSit }: JoinDialogProps) {
  const maxBuyIn = Math.min(MAX_BUY_IN, balance);
  const [buyIn, setBuyIn] = useState(Math.max(MIN_BUY_IN, Math.min(maxBuyIn, MAX_BUY_IN)));
  const [bots, setBots] = useState(5);
  const [busy, setBusy] = useState(false);
  const canAfford = balance >= MIN_BUY_IN;

  useEffect(() => {
    setBuyIn((current) => Math.max(MIN_BUY_IN, Math.min(current, maxBuyIn)));
  }, [maxBuyIn]);

  const handleSit = async () => {
    setBusy(true);
    await onSit({ buyIn, bots });
    setBusy(false);
  };

  return (
    <div
      className={css.Dialog}
      role="dialog"
      aria-label={tr('games.practice.join', 'Join the table')}
    >
      <div>
        <h2 className={css.DialogTitle}>{tr('games.practice.title', 'Poker table')}</h2>
        <p className={css.DialogText}>
          {tr('games.practice.subtitle', 'No-limit Texas Hold’em · Blinds {{small}}/{{big}}', {
            small: formatChips(POKER_CONFIG.smallBlind),
            big: formatChips(POKER_CONFIG.bigBlind),
          })}
        </p>
      </div>

      {canAfford ? (
        <BuyInField
          value={buyIn}
          min={MIN_BUY_IN}
          max={maxBuyIn}
          step={POKER_CONFIG.bigBlind * 5}
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

      {error && <p className={css.ErrorText}>{error}</p>}

      <button
        type="button"
        className={css.PrimaryButton}
        disabled={!ready || !canAfford || busy}
        onClick={handleSit}
      >
        {tr('games.buy_in.sit', 'Sit down')}
      </button>
      <p className={css.Note}>
        {tr(
          'games.practice.note',
          'Here you play against bots. The chips you win or lose go back to your wallet when you leave the table.'
        )}
      </p>
    </div>
  );
}

type RebuyDialogProps = {
  balance: number;
  error?: string;
  onRebuy: (amount: number) => Promise<void>;
  onLeave: () => void;
};

function RebuyDialog({ balance, error, onRebuy, onLeave }: RebuyDialogProps) {
  const maxBuyIn = Math.min(MAX_BUY_IN, balance);
  const [amount, setAmount] = useState(Math.max(MIN_BUY_IN, maxBuyIn));
  const canAfford = balance >= MIN_BUY_IN;

  return (
    <div className={css.Dialog} role="dialog" aria-label={tr('games.rebuy.title', 'Out of chips')}>
      <div>
        <h2 className={css.DialogTitle}>{tr('games.rebuy.title', 'Out of chips')}</h2>
        <p className={css.DialogText}>
          {tr(
            'games.rebuy.text',
            'Buy more chips with the coins in your wallet, or leave the table.'
          )}
        </p>
      </div>
      {canAfford ? (
        <BuyInField
          value={amount}
          min={MIN_BUY_IN}
          max={maxBuyIn}
          step={POKER_CONFIG.bigBlind * 5}
          onChange={setAmount}
        />
      ) : (
        <p className={css.ErrorText}>
          {tr('games.rebuy.not_enough', 'Your wallet does not have enough coins.')}
        </p>
      )}
      {error && <p className={css.ErrorText}>{error}</p>}
      <button
        type="button"
        className={css.PrimaryButton}
        disabled={!canAfford}
        onClick={() => onRebuy(amount)}
      >
        {tr('games.rebuy.button_amount', 'Buy {{chips}} chips', { chips: formatChips(amount) })}
      </button>
      <button type="button" className={css.SecondaryButton} onClick={onLeave}>
        {tr('games.action.leave', 'Leave the table')}
      </button>
    </div>
  );
}

type PokerGameProps = {
  hero: PokerHero;
  wallet: GameWallet;
  onBack?: () => void;
};

export function PokerGame({ hero: heroInfo, wallet, onBack }: PokerGameProps) {
  const table = usePokerTable(heroInfo, wallet);
  const { state, seated, hero } = table;
  const [showHistory, setShowHistory] = useState(false);
  const [layout, setLayout] = useState<TableLayout>('landscape');
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

  // Chips left on a table that was never closed properly go back to the wallet, once, on entry.
  const { ready, recoverTableChips } = wallet;
  const recoveredRef = useRef(false);
  useEffect(() => {
    if (!ready || recoveredRef.current) return;
    recoveredRef.current = true;
    recoverTableChips(PRACTICE_TABLE).catch(() => undefined);
  }, [ready, recoverTableChips]);

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
          <span className={css.TitleText}>Poker · Texas Hold’em</span>
          <span className={css.SubtitleText}>
            {seated
              ? `${tr('games.log.hand', 'Hand #{{n}}', { n: Math.max(state.handNumber, 1) })} · `
              : ''}
            {tr('games.table.blinds', 'Blinds {{small}}/{{big}}', {
              small: formatChips(POKER_CONFIG.smallBlind),
              big: formatChips(POKER_CONFIG.bigBlind),
            })}
          </span>
        </div>
        <div className={css.WalletPill} title={tr('games.wallet.hint', 'Coins in your wallet')}>
          <span className={css.Coin}>$</span>
          <span className={css.WalletValue}>{formatChips(wallet.balance)}</span>
          {seated && hero && (
            <span className={css.WalletMuted}>
              ·{' '}
              {tr('games.wallet.at_table', '{{chips}} at the table', {
                chips: formatChips(hero.stack),
              })}
            </span>
          )}
        </div>
        {seated && (
          <>
            <button
              type="button"
              className={css.IconButton}
              aria-pressed={showHistory}
              onClick={() => setShowHistory((v) => !v)}
              aria-label={tr('games.table.history', 'Table history')}
            >
              <Icon size="200" src={Icons.RecentClock} />
            </button>
            <button
              type="button"
              className={css.IconButton}
              onClick={() => table.leave()}
              disabled={table.leaveAfterHand}
              aria-label={tr('games.action.leave', 'Leave the table')}
            >
              <Icon size="200" src={Icons.Power} />
              <span className={css.WideOnly}>{tr('games.action.leave', 'Leave the table')}</span>
            </button>
          </>
        )}
      </div>

      <div className={css.TableArea} ref={areaRef}>
        <div className={css.StageWrap} data-layout={layout}>
          <PokerTable
            state={state}
            heroId={heroInfo.id}
            turnTimer={table.botTurn}
            layout={layout}
          />
        </div>

        {showHistory && seated && <HistoryDrawer log={state.log} />}

        {!seated && (
          <div className={css.Overlay}>
            <JoinDialog
              balance={wallet.balance}
              ready={wallet.ready}
              error={table.error}
              onSit={table.sit}
            />
          </div>
        )}

        {seated && table.needsRebuy && (
          <div className={css.Overlay}>
            <RebuyDialog
              balance={wallet.balance}
              error={table.error}
              onRebuy={table.rebuy}
              onLeave={() => table.leave()}
            />
          </div>
        )}
      </div>

      {seated && (
        <ActionBar
          state={state}
          hero={hero}
          legal={table.legal}
          leaveAfterHand={table.leaveAfterHand}
          onAction={table.act}
          onCancelLeave={table.cancelLeave}
        />
      )}
    </div>
  );
}
