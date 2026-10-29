import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, Icons } from 'folds';
import { formatChips, LogEntry } from './engine';
import {
  MAX_BUY_IN,
  MIN_BUY_IN,
  POKER_CONFIG,
  PokerHero,
  TableSetup,
  usePokerTable,
} from './usePokerTable';
import { GameWallet } from '../wallet/gameWallet';
import { PokerTable } from './table/PokerTable';
import { TableLayout } from './table/layout';
import { ActionBar } from './ActionBar';
import * as css from './pokerPage.css';

type BuyInFieldProps = {
  value: number;
  max: number;
  onChange: (value: number) => void;
};

function BuyInField({ value, max, onChange }: BuyInFieldProps) {
  return (
    <div className={css.Field}>
      <div className={css.FieldHeader}>
        <span>Fichas para levar à mesa</span>
        <span className={css.FieldValue}>{formatChips(value)}</span>
      </div>
      <input
        className={css.Range}
        type="range"
        min={MIN_BUY_IN}
        max={max}
        step={POKER_CONFIG.bigBlind * 5}
        value={value}
        onChange={(evt) => onChange(Number(evt.target.value))}
        aria-label="Fichas para levar à mesa"
      />
      <div className={css.RangeLimits}>
        <span>{formatChips(MIN_BUY_IN)}</span>
        <span>{formatChips(max)}</span>
      </div>
    </div>
  );
}

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
    <div className={css.Dialog} role="dialog" aria-label="Entrar na mesa">
      <div>
        <h2 className={css.DialogTitle}>Mesa de Poker</h2>
        <p className={css.DialogText}>
          Texas Hold’em sem limite · Blinds {formatChips(POKER_CONFIG.smallBlind)}/
          {formatChips(POKER_CONFIG.bigBlind)}
        </p>
      </div>

      {canAfford ? (
        <BuyInField value={buyIn} max={maxBuyIn} onChange={setBuyIn} />
      ) : (
        <p className={css.ErrorText}>
          Você precisa de pelo menos {formatChips(MIN_BUY_IN)} moedas para sentar.
        </p>
      )}

      <div className={css.Field}>
        <div className={css.FieldHeader}>
          <span>Adversários</span>
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
          <span>Sua carteira</span>
          <strong>{formatChips(balance)} moedas</strong>
        </div>
        <div className={css.InfoRow}>
          <span>Depois de sentar</span>
          <strong>{formatChips(Math.max(0, balance - buyIn))} moedas</strong>
        </div>
      </div>

      {error && <p className={css.ErrorText}>{error}</p>}

      <button
        type="button"
        className={css.PrimaryButton}
        disabled={!ready || !canAfford || busy}
        onClick={handleSit}
      >
        Sentar à mesa
      </button>
      <p className={css.Note}>
        Por enquanto você joga contra bots. As fichas que você ganhar ou perder voltam para a sua
        carteira quando você sai da mesa.
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
    <div className={css.Dialog} role="dialog" aria-label="Recomprar fichas">
      <div>
        <h2 className={css.DialogTitle}>Suas fichas acabaram</h2>
        <p className={css.DialogText}>
          Você pode comprar mais fichas com as moedas da sua carteira ou sair da mesa.
        </p>
      </div>
      {canAfford ? (
        <BuyInField value={amount} max={maxBuyIn} onChange={setAmount} />
      ) : (
        <p className={css.ErrorText}>Sua carteira não tem moedas suficientes para recomprar.</p>
      )}
      {error && <p className={css.ErrorText}>{error}</p>}
      <button
        type="button"
        className={css.PrimaryButton}
        disabled={!canAfford}
        onClick={() => onRebuy(amount)}
      >
        Recomprar {formatChips(amount)}
      </button>
      <button type="button" className={css.SecondaryButton} onClick={onLeave}>
        Sair da mesa
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
    recoverTableChips().catch(() => undefined);
  }, [ready, recoverTableChips]);

  // Newest hand first, each hand read top to bottom.
  const history = useMemo(() => {
    const hands: LogEntry[][] = [];
    state.log.forEach((entry) => {
      const last = hands[hands.length - 1];
      if (last && last[0].hand === entry.hand) last.push(entry);
      else hands.push([entry]);
    });
    return hands.reverse().flat();
  }, [state.log]);

  return (
    <div className={css.Page}>
      <div className={css.TopBar}>
        {onBack && (
          <button type="button" className={css.IconButton} onClick={onBack} aria-label="Voltar">
            <Icon size="200" src={Icons.ArrowLeft} />
          </button>
        )}
        <div className={css.TopTitle}>
          <span className={css.TitleText}>Poker · Texas Hold’em</span>
          <span className={css.SubtitleText}>
            {seated ? `Mão #${Math.max(state.handNumber, 1)} · ` : ''}Blinds{' '}
            {formatChips(POKER_CONFIG.smallBlind)}/{formatChips(POKER_CONFIG.bigBlind)}
          </span>
        </div>
        <div className={css.WalletPill} title="Moedas na sua carteira">
          <span className={css.Coin}>$</span>
          <span className={css.WalletValue}>{formatChips(wallet.balance)}</span>
          {seated && hero && (
            <span className={css.WalletMuted}>· {formatChips(hero.stack)} na mesa</span>
          )}
        </div>
        {seated && (
          <>
            <button
              type="button"
              className={css.IconButton}
              aria-pressed={showHistory}
              onClick={() => setShowHistory((v) => !v)}
              aria-label="Histórico da mesa"
            >
              <Icon size="200" src={Icons.RecentClock} />
            </button>
            <button
              type="button"
              className={css.IconButton}
              onClick={() => table.leave()}
              disabled={table.leaveAfterHand}
              aria-label="Sair da mesa"
            >
              <Icon size="200" src={Icons.Power} />
              <span className={css.WideOnly}>Sair da mesa</span>
            </button>
          </>
        )}
      </div>

      <div className={css.TableArea} ref={areaRef}>
        <div className={css.StageWrap} data-layout={layout}>
          <PokerTable state={state} heroId={heroInfo.id} botTurn={table.botTurn} layout={layout} />
        </div>

        {showHistory && seated && (
          <div className={css.Drawer}>
            <div className={css.DrawerHeader}>Histórico da mesa</div>
            <div className={css.DrawerList}>
              {history.map((entry) =>
                entry.text.startsWith('—') ? (
                  <div key={entry.id} className={css.DrawerHand}>
                    {entry.text}
                  </div>
                ) : (
                  <div key={entry.id}>{entry.text}</div>
                )
              )}
            </div>
          </div>
        )}

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
