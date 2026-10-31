import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon, Icons } from 'folds';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { mxcUrlToHttp } from '../../../utils/matrix';
import { ApiError } from '../../../utils/blazeroomApi';
import { getGamesPokerJoinPath } from '../../../pages/pathUtils';
import { useFriends } from '../../friends/useFriends';
import { friendDisplayName } from '../../friends/userDisplay';
import { useCredits } from '../credits/useCredits';
import { PokerTable } from './table/PokerTable';
import { TableLayout } from './table/layout';
import { ActionBar } from './ActionBar';
import { HistoryDrawer } from './TableParts';
import { AwayDialog, CloseDialog, InviteDialog, RebuyDialog, SeatDialog } from './TableDialogs';
import { errorText } from './errorText';
import { createInFlight } from './inFlight';
import { turnTimerFor } from './turnTimer';
import { formatChips, PokerAction } from './types';
import { useTable } from './useTable';
import * as css from './pokerPage.css';
import { tr } from '../../translation/tr';

type TableScreenProps = {
  tableId: string;
  onBack: () => void;
};

function Message({ text, onBack }: { text: string; onBack: () => void }) {
  return (
    <div className={css.Page}>
      <div className={css.Overlay} style={{ position: 'relative', flexGrow: 1 }}>
        <div className={css.Dialog}>
          <h2 className={css.DialogTitle}>{text}</h2>
          <button type="button" className={css.SecondaryButton} onClick={onBack}>
            {tr('games.table.back_to_lobby', 'Back to the lobby')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TableScreen({ tableId, onBack }: TableScreenProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const userId = mx.getUserId() ?? '';
  const { view, connected, closed, notFound, api } = useTable(tableId);
  const { balance, refresh: refreshCredits, topUp } = useCredits();
  const { lists } = useFriends();

  const [layout, setLayout] = useState<TableLayout>('landscape');
  const [pickedSeat, setPickedSeat] = useState<number>();
  const [showHistory, setShowHistory] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();
  const areaRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(createInFlight()).current;

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  // A closed table hands every stack back as credits.
  useEffect(() => {
    if (closed) refreshCredits();
  }, [closed, refreshCredits]);

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

  const resolveAvatar = useCallback(
    (url: string) =>
      url.startsWith('mxc://')
        ? mxcUrlToHttp(mx, url, useAuthentication, 128, 128, 'crop') ?? undefined
        : url,
    [mx, useAuthentication]
  );

  const friends = useMemo(
    () =>
      (lists?.friends ?? []).map((f) => ({
        userId: f.userId,
        name: friendDisplayName(mx, f.userId),
      })),
    [mx, lists]
  );

  // Runs what the person asked for and shows the server's refusal, if any.
  const run = async <T,>(
    key: string,
    task: () => Promise<T>,
    refresh = false
  ): Promise<{ ok: boolean; value?: T }> => {
    setError(undefined);
    try {
      const { skipped, value } = await inFlight(key, task);
      if (skipped) return { ok: false };
      if (refresh) refreshCredits();
      return { ok: true, value };
    } catch (e) {
      setError(errorText(e instanceof ApiError ? e.code : 'unknown'));
      return { ok: false };
    }
  };

  // A refusal belongs to the moment it happened; a new turn or hand makes it stale.
  const handNumber = view?.handNumber;
  const legalSeq = view?.legal?.seq;
  useEffect(() => {
    setError(undefined);
  }, [handNumber, legalSeq]);

  if (notFound) {
    return (
      <Message
        text={tr('games.table.not_found', 'This table does not exist, or you are not in it.')}
        onBack={onBack}
      />
    );
  }
  if (closed) {
    return <Message text={tr('games.table.closed', 'This table was closed.')} onBack={onBack} />;
  }

  const me = view?.players.find((p) => p.id === userId);
  // A player who left still holds the seat until the hand ends, but is no longer seated.
  const seated = !!me && !me.leaving;
  const handOver = view?.phase === 'waiting' || view?.phase === 'complete';
  const busted = seated && me.stack === 0 && view?.pendingChips === 0 && handOver;
  const away = seated && me.away;
  const step = (view?.bigBlind ?? 0) * 5;
  // Dialogs cover the page, so they show the error themselves.
  const inDialog =
    (pickedSeat !== undefined && !seated) || (busted && !away) || away || confirmClose;

  const leave = async () => {
    if (!view) return;
    const { value: reply } = await run('leave', () => api.leave(tableId), true);
    if (reply && 'closed' in reply && view.kind === 'practice') onBack();
  };

  const sit = async (seat: number, buyIn: number) => {
    if ((await run('sit', () => api.sit(tableId, seat, buyIn), true)).ok) setPickedSeat(undefined);
  };

  const topUpCredits = () => run('topUp', topUp);

  const close = async () => {
    if ((await run('close', () => api.close(tableId), true)).ok) onBack();
  };

  const copyLink = async () => {
    const { value: token } = await run('link', () => api.inviteLink(tableId));
    if (!token) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${getGamesPokerJoinPath(token)}`
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(errorText('unknown'));
    }
  };

  let subtitle = '';
  if (view) {
    subtitle = tr('games.table.blinds', 'Blinds {{small}}/{{big}}', {
      small: formatChips(view.smallBlind),
      big: formatChips(view.bigBlind),
    });
    if (view.handNumber > 0) {
      subtitle = `${tr('games.log.hand', 'Hand #{{n}}', { n: view.handNumber })} · ${subtitle}`;
    }
  }

  return (
    <div className={css.Page}>
      <div className={css.TopBar}>
        <button
          type="button"
          className={css.IconButton}
          onClick={onBack}
          aria-label={tr('games.action.back', 'Back')}
        >
          <Icon size="200" src={Icons.ArrowLeft} />
        </button>
        <div className={css.TopTitle}>
          <span className={css.TitleText}>{view?.name}</span>
          <span className={css.SubtitleText}>{subtitle}</span>
        </div>
        <div className={css.WalletPill} title={tr('games.wallet.hint', 'Coins in your wallet')}>
          <span className={css.Coin}>$</span>
          <span className={css.WalletValue}>{formatChips(balance ?? 0)}</span>
          {seated && (
            <span className={css.WalletMuted}>
              ·{' '}
              {tr('games.wallet.at_table', '{{chips}} at the table', {
                chips: formatChips(me.stack),
              })}
            </span>
          )}
        </div>
        {view?.kind === 'friends' && (
          <>
            <button
              type="button"
              className={css.IconButton}
              onClick={() => setShowInvite(true)}
              aria-label={tr('games.table.invite_title', 'Invite friends')}
            >
              <Icon size="200" src={Icons.UserPlus} />
            </button>
            <button
              type="button"
              className={css.IconButton}
              onClick={copyLink}
              aria-label={tr('games.table.copy_link', 'Copy invite link')}
            >
              <Icon size="200" src={Icons.Link} />
              {copied && <span>{tr('games.table.link_copied', 'Copied')}</span>}
            </button>
          </>
        )}
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
            onClick={leave}
            aria-label={tr('games.action.leave', 'Leave the table')}
          >
            <Icon size="200" src={Icons.Power} />
            <span className={css.WideOnly}>{tr('games.action.leave', 'Leave the table')}</span>
          </button>
        )}
        {view?.isOwner && view.kind === 'friends' && (
          <button
            type="button"
            className={css.IconButton}
            onClick={() => setConfirmClose(true)}
            aria-label={tr('games.table.close', 'Close the table')}
          >
            <Icon size="200" src={Icons.Delete} />
            <span className={css.WideOnly}>{tr('games.table.close', 'Close the table')}</span>
          </button>
        )}
      </div>

      {!connected && view && (
        <p className={css.Note} style={{ padding: '6px 16px', textAlign: 'center' }}>
          {tr('games.table.reconnecting', 'Connection lost. Reconnecting…')}
        </p>
      )}

      <div className={css.TableArea} ref={areaRef}>
        {view && (
          <div className={css.StageWrap} data-layout={layout}>
            <PokerTable
              view={view}
              heroId={userId}
              turnTimer={turnTimerFor(view, Date.now())}
              layout={layout}
              seatOffset={me?.seat ?? 0}
              onSeatClick={seated ? undefined : setPickedSeat}
              resolveAvatar={resolveAvatar}
              emptyLabel={tr('games.shared.pick_seat', 'Pick a seat to sit down')}
            />
          </div>
        )}

        {view && showHistory && <HistoryDrawer log={view.log} />}

        {!view && (
          <div className={css.Overlay}>
            <div className={css.Dialog}>
              <h2 className={css.DialogTitle}>{tr('games.table.loading', 'Loading the table…')}</h2>
            </div>
          </div>
        )}

        {view && pickedSeat !== undefined && !seated && (
          <SeatDialog
            key={balance}
            seat={pickedSeat}
            min={view.minBuyIn}
            max={view.maxBuyIn}
            step={step}
            balance={balance ?? 0}
            onCancel={() => setPickedSeat(undefined)}
            onSit={(buyIn) => sit(pickedSeat, buyIn)}
            onTopUp={topUpCredits}
            error={error}
          />
        )}

        {view && busted && !away && (
          <RebuyDialog
            key={balance}
            min={view.minBuyIn}
            max={view.maxBuyIn}
            step={step}
            balance={balance ?? 0}
            onRebuy={(amount) => run('rebuy', () => api.rebuy(tableId, amount), true)}
            onLeave={leave}
            error={error}
          />
        )}

        {away && (
          <AwayDialog
            onBack={() => run('back', () => api.back(tableId))}
            onLeave={leave}
            error={error}
          />
        )}

        {showInvite && (
          <InviteDialog
            friends={friends}
            onInvite={(id) => api.invite(tableId, id)}
            onDone={() => setShowInvite(false)}
          />
        )}

        {confirmClose && (
          <CloseDialog onClose={close} onCancel={() => setConfirmClose(false)} error={error} />
        )}
      </div>

      {error && !inDialog && (
        <p className={css.ErrorText} style={{ padding: '0 16px' }}>
          {error}
        </p>
      )}

      {view && me && (
        <ActionBar
          view={view}
          hero={me}
          onAction={(action: PokerAction) => {
            const { legal } = view;
            if (legal)
              run(`act:${legal.hand}:${legal.seq}`, () =>
                api.act(tableId, legal.hand, legal.seq, action)
              );
          }}
        />
      )}
    </div>
  );
}
