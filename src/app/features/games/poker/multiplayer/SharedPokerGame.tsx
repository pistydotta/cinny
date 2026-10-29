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
    <div className={css.Dialog} role="dialog" aria-label="Sentar à mesa">
      <div>
        <h2 className={css.DialogTitle}>Sentar no lugar {seat + 1}</h2>
        <p className={css.DialogText}>
          As fichas saem da sua carteira e voltam para ela quando você sair da mesa.
        </p>
      </div>
      {canAfford ? (
        <BuyInField value={buyIn} min={min} max={top} step={step} onChange={setBuyIn} />
      ) : (
        <p className={css.ErrorText}>
          Você precisa de pelo menos {formatChips(min)} moedas para sentar.
        </p>
      )}
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
      <button
        type="button"
        className={css.PrimaryButton}
        disabled={!canAfford}
        onClick={() => onSit(buyIn)}
      >
        Sentar à mesa
      </button>
      <button type="button" className={css.SecondaryButton} onClick={onCancel}>
        Agora não
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

  let subtitle = `Blinds ${formatChips(config.smallBlind)}/${formatChips(config.bigBlind)}`;
  if (display.handNumber > 0) subtitle = `Mão #${display.handNumber} · ${subtitle}`;
  if (host) subtitle = `${subtitle} · ★ ${host.name} embaralha`;

  let emptyLabel: string | undefined;
  if (!table.loading && playersSeated === 0) emptyLabel = 'Escolha um lugar para sentar';

  return (
    <div className={css.Page}>
      <div className={css.TopBar}>
        {onBack && (
          <button type="button" className={css.IconButton} onClick={onBack} aria-label="Voltar">
            <Icon size="200" src={Icons.ArrowLeft} />
          </button>
        )}
        <div className={css.TopTitle}>
          <span className={css.TitleText}>{config.name}</span>
          <span className={css.SubtitleText}>{subtitle}</span>
        </div>
        <div className={css.WalletPill} title="Moedas na sua carteira">
          <span className={css.Coin}>$</span>
          <span className={css.WalletValue}>{formatChips(wallet.balance)}</span>
          {seated && me && (
            <span className={css.WalletMuted}>· {formatChips(me.stack)} na mesa</span>
          )}
        </div>
        <button
          type="button"
          className={css.IconButton}
          aria-pressed={showHistory}
          onClick={() => setShowHistory((v) => !v)}
          aria-label="Histórico da mesa"
        >
          <Icon size="200" src={Icons.RecentClock} />
        </button>
        {seated && (
          <button
            type="button"
            className={css.IconButton}
            onClick={() => table.leave()}
            aria-label="Sair da mesa"
          >
            <Icon size="200" src={Icons.Power} />
            <span className={css.WideOnly}>Sair da mesa</span>
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
              <h2 className={css.DialogTitle}>Carregando a mesa…</h2>
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
            <div className={css.Dialog} role="dialog" aria-label="Recomprar fichas">
              <div>
                <h2 className={css.DialogTitle}>Suas fichas acabaram</h2>
                <p className={css.DialogText}>
                  Compre mais fichas com as moedas da sua carteira ou saia da mesa.
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
                <p className={css.ErrorText}>Sua carteira não tem moedas suficientes.</p>
              )}
              <button
                type="button"
                className={css.PrimaryButton}
                disabled={wallet.balance < config.minBuyIn}
                onClick={() => table.rebuy(Math.min(rebuyAmount, wallet.balance, config.maxBuyIn))}
              >
                Recomprar
              </button>
              <button type="button" className={css.SecondaryButton} onClick={() => table.leave()}>
                Sair da mesa
              </button>
            </div>
          </div>
        )}

        {away && (
          <div className={css.Overlay}>
            <div className={css.Dialog} role="dialog" aria-label="Você está ausente">
              <div>
                <h2 className={css.DialogTitle}>Você ficou ausente</h2>
                <p className={css.DialogText}>
                  O tempo da sua jogada acabou, então você desistiu da mão e não vai receber cartas
                  até voltar.
                </p>
              </div>
              <button type="button" className={css.PrimaryButton} onClick={table.back}>
                Voltar a jogar
              </button>
              <button type="button" className={css.SecondaryButton} onClick={() => table.leave()}>
                Sair da mesa
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
            canStartHand(display) ? 'Embaralhando…' : 'Aguardando mais jogadores para começar…'
          }
        />
      )}
    </div>
  );
}
