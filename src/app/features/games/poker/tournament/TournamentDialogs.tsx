import React, { ReactNode } from 'react';
import { tr } from '../../../translation/tr';
import {
  Card,
  formatChips,
  RANK_LABEL,
  SUIT_SYMBOL,
  TournamentReport,
  TournamentView,
} from '../types';
import * as page from '../pokerPage.css';
import { actionText, reportRows, streetText, verdictText } from './coachText';
import { placeText } from './TournamentBar';
import * as css from './tournament.css';

const cardsText = (cards: Card[]) =>
  cards.map((card) => `${RANK_LABEL[card.rank]}${SUIT_SYMBOL[card.suit]}`).join(' ');

type FrameProps = { title: string; text?: string; error?: string; children: ReactNode };

function Frame({ title, text, error, children }: FrameProps) {
  return (
    <div className={page.Overlay}>
      <div className={`${page.Dialog} ${css.WideDialog}`} role="dialog" aria-label={title}>
        <div>
          <h2 className={page.DialogTitle}>{title}</h2>
          {text && <p className={page.DialogText}>{text}</p>}
        </div>
        {children}
        {error && <p className={page.ErrorText}>{error}</p>}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={page.InfoRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export const tournamentTitle = (field: number) =>
  tr('tourney.title_field', 'Tournament · {{field}} players', { field });

/** What the tournament is, for the setup screen and the waiting room. */
export function TournamentFacts({ tournament: t }: { tournament: TournamentView }) {
  return (
    <div className={page.InfoBox}>
      <InfoRow
        label={tr('tourney.facts.buy_in', 'Buy-in')}
        value={
          t.buyIn > 0
            ? tr('games.wallet.coins', '{{coins}} coins', { coins: formatChips(t.buyIn) })
            : tr('tourney.free', 'Free')
        }
      />
      <InfoRow
        label={tr('tourney.facts.stack', 'Starting stack')}
        value={tr('tourney.facts.stack_value', '{{chips}} chips (100 BB)', {
          chips: formatChips(t.startStack),
        })}
      />
      <InfoRow
        label={tr('tourney.facts.levels', 'Blinds go up')}
        value={tr('tourney.facts.levels_value', 'every {{count}} hands', {
          count: t.handsPerLevel,
        })}
      />
      <InfoRow
        label={tr('tourney.facts.paid', 'Places paid')}
        value={tr('tourney.facts.paid_value', '{{count}} of {{field}}', {
          count: t.paidPlaces,
          field: t.field,
        })}
      />
      {t.buyIn > 0 && (
        <InfoRow
          label={tr('tourney.bar.first_prize', 'First prize')}
          value={tr('games.wallet.coins', '{{coins}} coins', {
            coins: formatChips(t.payouts[0] ?? 0),
          })}
        />
      )}
    </div>
  );
}

type WaitingRoomProps = {
  tournament: TournamentView;
  isOwner: boolean;
  busy: boolean;
  error?: string;
  onStart: () => void;
  onRegister: () => void;
  onInvite: () => void;
  onCopyLink: () => void;
  copied: boolean;
  onLeave: () => void;
};

/** Before the first hand: who is in, and the owner's button to start. */
export function WaitingRoom({
  tournament: t,
  isOwner,
  busy,
  error,
  onStart,
  onRegister,
  onInvite,
  onCopyLink,
  copied,
  onLeave,
}: WaitingRoomProps) {
  const entered = !!t.me;
  return (
    <Frame
      title={tournamentTitle(t.field)}
      error={error}
      text={
        isOwner
          ? tr(
              'tourney.waiting.owner',
              'Start whenever you want. Friends you invite sit at your table; bots fill the rest of the field.'
            )
          : tr('tourney.waiting.guest', 'The tournament starts when its creator presses start.')
      }
    >
      <TournamentFacts tournament={t} />
      <div>
        <h3 className={css.Heading}>
          {tr('tourney.waiting.entered', 'Entered ({{count}})', { count: t.entrants.length })}
        </h3>
        <div className={css.Entrants} style={{ marginTop: 8 }}>
          {t.entrants.map((entrant) => (
            <span key={entrant.userId} className={css.Entrant}>
              {entrant.name}
            </span>
          ))}
        </div>
      </div>
      {isOwner && (
        <button type="button" className={page.PrimaryButton} disabled={busy} onClick={onStart}>
          {tr('tourney.waiting.start', 'Start the tournament')}
        </button>
      )}
      {!isOwner && !entered && (
        <button type="button" className={page.PrimaryButton} disabled={busy} onClick={onRegister}>
          {t.buyIn > 0
            ? tr('tourney.waiting.enter_paid', 'Enter for {{coins}} coins', {
                coins: formatChips(t.buyIn),
              })
            : tr('tourney.waiting.enter', 'Enter')}
        </button>
      )}
      <button type="button" className={page.SecondaryButton} onClick={onInvite}>
        {tr('games.table.invite_title', 'Invite friends')}
      </button>
      <button type="button" className={page.SecondaryButton} onClick={onCopyLink}>
        {copied
          ? tr('games.table.link_copied', 'Copied')
          : tr('games.table.copy_link', 'Copy invite link')}
      </button>
      {entered && (
        <button type="button" className={page.SecondaryButton} disabled={busy} onClick={onLeave}>
          {isOwner
            ? tr('tourney.waiting.cancel', 'Cancel the tournament')
            : tr('tourney.waiting.leave', 'Leave and get the buy-in back')}
        </button>
      )}
    </Frame>
  );
}

type AbandonDialogProps = {
  error?: string;
  busy: boolean;
  onLeave: () => void;
  onStay: () => void;
};

export function AbandonDialog({ error, busy, onLeave, onStay }: AbandonDialogProps) {
  return (
    <Frame
      title={tr('tourney.abandon.title', 'Leave the tournament?')}
      text={tr(
        'tourney.abandon.text',
        'You give up your chips and finish in the place you are in now. To take a break instead, just go back: your seat waits for you.'
      )}
      error={error}
    >
      <button type="button" className={page.PrimaryButton} onClick={onStay}>
        {tr('tourney.abandon.stay', 'Keep playing')}
      </button>
      <button type="button" className={page.SecondaryButton} disabled={busy} onClick={onLeave}>
        {tr('tourney.abandon.leave', 'Leave the tournament')}
      </button>
    </Frame>
  );
}

type ReportDialogProps = {
  tournament: TournamentView;
  report: TournamentReport;
  busy: boolean;
  error?: string;
  /** Only while friends are still playing. */
  onWatch?: () => void;
  onLeave: () => void;
  onAgain: () => void;
};

/** The end of the run: place, prize and, with the coach, how the player played. */
export function ReportDialog({
  tournament: t,
  report,
  busy,
  error,
  onWatch,
  onLeave,
  onAgain,
}: ReportDialogProps) {
  const paid = report.prize > 0;
  let text = tr('tourney.report.no_prize', 'Out before the money. {{count}} places were paid.', {
    count: t.paidPlaces,
  });
  if (t.buyIn === 0) text = tr('tourney.report.free', 'A free tournament: no coins won or lost.');
  if (paid) {
    text = tr('tourney.report.prize', 'You won {{coins}} coins.', {
      coins: formatChips(report.prize),
    });
  }

  return (
    <Frame
      title={
        report.place === 1
          ? tr('tourney.report.won', 'You won the tournament!')
          : tr('tourney.report.title', 'Your tournament is over')
      }
      text={text}
      error={error}
    >
      <div>
        <div className={css.Place}>
          {report.place ? placeText(report.place) : '—'}
          <span className={css.InfoSub}>
            {' '}
            {tr('tourney.report.of', 'of {{field}}', { field: t.field })}
          </span>
        </div>
        <div className={css.InfoSub}>
          {tr('tourney.report.hands', '{{count}} hands played', { count: report.hands })}
        </div>
      </div>

      {report.stats && (
        <>
          <h3 className={css.Heading}>{tr('tourney.report.how', 'How you played')}</h3>
          <div className={css.StatGrid}>
            {reportRows(report.stats, report.hands).map((row) => (
              <React.Fragment key={row.label}>
                <span>{row.label}</span>
                <span className={css.StatValue}>{row.value}</span>
              </React.Fragment>
            ))}
            <span>{tr('tourney.report.ev_loss', 'Chips given up in mistakes (estimate)')}</span>
            <span className={css.StatValue}>{formatChips(report.stats.evLoss)}</span>
          </div>
        </>
      )}

      {report.worst.length > 0 && (
        <>
          <h3 className={css.Heading}>{tr('tourney.report.worst', 'Hands worth another look')}</h3>
          <div className={css.Costly}>
            {report.worst.map((item, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={index} className={css.CostlyRow}>
                <div className={css.CostlyHead}>
                  <span>
                    {tr('games.log.hand', 'Hand #{{n}}', { n: item.hand })} ·{' '}
                    {streetText(item.street)} · {cardsText(item.cards)}
                    {item.board.length > 0 && ` | ${cardsText(item.board)}`}
                  </span>
                  <span className={css.CostlyLoss}>−{formatChips(item.evLoss)}</span>
                </div>
                <span>
                  {actionText(item, formatChips)}: {verdictText(item.key)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <button type="button" className={page.PrimaryButton} disabled={busy} onClick={onAgain}>
        {tr('tourney.report.again', 'Play another tournament')}
      </button>
      {onWatch && (
        <button type="button" className={page.SecondaryButton} onClick={onWatch}>
          {tr('tourney.report.watch', 'Keep watching the table')}
        </button>
      )}
      <button type="button" className={page.SecondaryButton} disabled={busy} onClick={onLeave}>
        {tr('games.table.back_to_lobby', 'Back to the lobby')}
      </button>
    </Frame>
  );
}
