import React from 'react';
import { tr } from '../../../translation/tr';
import { formatChips, TableView, TournamentView } from '../types';
import * as page from '../pokerPage.css';
import * as css from './tournament.css';

const blindsText = (smallBlind: number, bigBlind: number) =>
  `${formatChips(smallBlind)}/${formatChips(bigBlind)}`;

const inBigBlinds = (chips: number, bigBlind: number) =>
  `${Math.round(chips / Math.max(1, bigBlind))} BB`;

export const placeText = (place: number) => tr('tourney.place', '#{{n}}', { n: place });

type ItemProps = { label: string; value: string; sub?: string; accent?: boolean };

function Item({ label, value, sub, accent }: ItemProps) {
  return (
    <div className={css.InfoItem}>
      <span className={css.InfoLabel}>{label}</span>
      <span className={css.InfoValue} data-accent={accent}>
        {value}
      </span>
      <span className={css.InfoSub}>{sub ?? ' '}</span>
    </div>
  );
}

type TournamentBarProps = {
  view: TableView;
  tournament: TournamentView;
  heroId: string;
  detailsOpen: boolean;
  onDetails: () => void;
};

/** The numbers a tournament lobby shows, in one strip above the table. */
export function TournamentBar({
  view,
  tournament: t,
  heroId,
  detailsOpen,
  onDetails,
}: TournamentBarProps) {
  const myStack = view.players.find((p) => p.id === heroId);
  const toMoney = t.remaining - t.paidPlaces;

  return (
    <div className={css.InfoBar}>
      <Item
        label={tr('tourney.bar.level', 'Level')}
        value={`${t.level} · ${blindsText(view.smallBlind, view.bigBlind)}`}
        sub={
          view.ante
            ? tr('tourney.bar.ante', 'ante {{chips}}', { chips: formatChips(view.ante) })
            : tr('tourney.bar.no_ante', 'no ante')
        }
      />
      <Item
        label={tr('tourney.bar.next', 'Next level')}
        value={blindsText(t.nextBlinds.smallBlind, t.nextBlinds.bigBlind)}
        sub={tr('tourney.bar.in_hands', 'in {{count}} hands', { count: t.handsToNextLevel })}
      />
      <Item
        label={tr('tourney.bar.players', 'Players')}
        value={`${t.remaining}/${t.field}`}
        sub={
          toMoney > 0
            ? tr('tourney.bar.to_money', '{{count}} to the money', { count: toMoney })
            : tr('tourney.bar.in_money', 'in the money')
        }
        accent={toMoney <= 0}
      />
      <Item
        label={tr('tourney.bar.average', 'Average stack')}
        value={formatChips(t.avgStack)}
        sub={inBigBlinds(t.avgStack, view.bigBlind)}
      />
      <Item
        label={tr('tourney.bar.rank', 'Your place')}
        value={t.myRank ? `${placeText(t.myRank)}` : '—'}
        sub={myStack ? inBigBlinds(myStack.stack, view.bigBlind) : undefined}
        accent={!!t.myRank && t.myRank <= t.paidPlaces}
      />
      <Item
        label={tr('tourney.bar.first_prize', 'First prize')}
        value={t.buyIn > 0 ? formatChips(t.payouts[0] ?? 0) : tr('tourney.free', 'Free')}
        sub={tr('tourney.bar.paid', '{{count}} paid', { count: t.paidPlaces })}
      />
      <button
        type="button"
        className={css.InfoButton}
        aria-pressed={detailsOpen}
        onClick={onDetails}
      >
        {tr('tourney.bar.details', 'Prizes and chips')}
      </button>
    </div>
  );
}

/** Prizes per place and the chip leaders, in the same drawer as the table history. */
export function TournamentDetails({ tournament: t }: { tournament: TournamentView }) {
  return (
    <div className={page.Drawer}>
      <div className={page.DrawerHeader}>{tr('tourney.bar.details', 'Prizes and chips')}</div>
      <div className={page.DrawerList}>
        <div className={css.DetailsSection}>{tr('tourney.details.leaders', 'Chip leaders')}</div>
        {t.leaders.map((leader, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={index} className={css.DetailsRow} data-me={leader.me}>
            <span>
              {placeText(index + 1)} {leader.name}
              {leader.atTable && !leader.me
                ? ` · ${tr('tourney.details.your_table', 'your table')}`
                : ''}
            </span>
            <span>{formatChips(leader.stack)}</span>
          </div>
        ))}
        <div className={css.DetailsSection}>
          {tr('tourney.details.prizes', 'Prizes ({{pool}} in the pool)', {
            pool: formatChips(t.prizePool),
          })}
        </div>
        {t.buyIn === 0 && (
          <div>{tr('tourney.details.free', 'A free tournament pays no coins.')}</div>
        )}
        {t.buyIn > 0 &&
          t.payouts.map((prize, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={index} className={css.DetailsRow} data-dim={index + 1 > t.remaining}>
              <span>{placeText(index + 1)}</span>
              <span>{formatChips(prize)}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
