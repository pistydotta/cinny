import React, { ReactNode } from 'react';
import { tr } from '../../translation/tr';
import { Kit, Team } from './engine/teams';
import { MatchState, Side } from './engine/types';
import type { Hud } from './runner';
import { shirtBackground } from './setup';
import type { MatchFailure } from './useMatchCanvas';
import { gameButton } from '../ui/gameUi.css';
import * as css from './football.css';

// What every match screen draws over the canvas (local, online, watching), and the full-time
// score: kept here so the three screens stay the same.

export function Shirt({ team, big }: { team: Team; big?: boolean }) {
  return (
    <span
      className={big ? `${css.Shirt} ${css.ShirtBig}` : css.Shirt}
      style={{ background: shirtBackground(team.home) }}
      aria-hidden
    />
  );
}

const restartName = (kind: Hud['restart']): string | undefined => {
  if (kind === 'throw') return tr('football.restart.throw', 'Throw-in');
  if (kind === 'corner') return tr('football.restart.corner', 'Corner');
  if (kind === 'goalkick') return tr('football.restart.goalkick', 'Goal kick');
  if (kind === 'kickoff') return tr('football.restart.kickoff', 'Kick-off');
  return undefined;
};

// A small red card per player sent off, next to the team on the scoreboard.
function RedCards({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <span className={css.RedCards} aria-label={tr('football.reds', '{{n}} sent off', { n })}>
      {Array.from({ length: n }, (_, k) => (
        <span key={k} className={css.RedCard} />
      ))}
    </span>
  );
}

// What the referee decided, while the restart waits: foul, offside or penalty, and the card.
function CallBanner({ call, teams }: { call: NonNullable<Hud['call']>; teams: [Team, Team] }) {
  let title = tr('football.call.foul', 'Foul');
  if (call.kind === 'offside') title = tr('football.call.offside', 'Offside');
  else if (call.kind === 'penalty') title = tr('football.call.penalty', 'Penalty!');
  const who = `${teams[call.side].short} #${call.num}`;
  let card: string | undefined;
  if (call.card === 'yellow') card = tr('football.call.yellow', 'Yellow card');
  else if (call.secondYellow) card = tr('football.call.second_yellow', 'Second yellow: sent off');
  else if (call.card === 'red') card = tr('football.call.red', 'Red card: sent off');
  return (
    <div className={css.CallBox}>
      <span className={css.CallTitle}>{title}</span>
      <span className={css.BannerSub}>
        {card && (
          <span className={call.card === 'red' ? css.CardRed : css.CardYellow} aria-hidden />
        )}
        {card ? `${card} · ${who}` : who}
      </span>
    </div>
  );
}

// A substitution on its way, while the fourth official holds the board up.
function SubBanner({ sub, teams }: { sub: NonNullable<Hud['sub']>; teams: [Team, Team] }) {
  return (
    <div className={css.CallBox}>
      <span className={css.CallTitle}>{tr('football.sub.title', 'Substitution')}</span>
      <span className={css.BannerSub}>
        {teams[sub.side].short} · <span className={css.SubOut}>▼ {sub.out}</span>{' '}
        <span className={css.SubIn}>▲ {sub.on}</span>
      </span>
    </div>
  );
}

export function MatchHud({
  hud,
  loading,
  failed,
  teams,
  kits,
  waitingText,
  children,
}: {
  hud: Hud | undefined;
  loading: boolean;
  failed: MatchFailure | undefined;
  teams: [Team, Team];
  kits: [Kit, Kit];
  // What to say while the match waits on the network.
  waitingText?: string;
  children?: ReactNode;
}) {
  const [home, away] = teams;
  return (
    <div className={css.Overlay}>
      {loading && !failed && (
        <span className={css.Loading}>{tr('football.loading', 'Opening the stadium…')}</span>
      )}
      {failed === 'device' && (
        <span className={css.Loading}>
          {tr('football.failed', 'The game could not start on this device (WebGL).')}
        </span>
      )}
      {failed === 'update' && (
        <div className={css.Updated}>
          <span className={css.Loading}>
            {tr('football.updated', 'The app was updated. Reload to play.')}
          </span>
          <button
            type="button"
            className={gameButton({ variant: 'primary' })}
            onClick={() => window.location.reload()}
          >
            {tr('football.reload', 'Reload')}
          </button>
        </div>
      )}
      {hud && (
        <div className={css.Scoreboard}>
          <span className={css.KitBar} style={{ background: kits[0].shirt }} />
          <span className={css.ScoreTeam}>
            {home.short}
            <RedCards n={hud.reds[0]} />
          </span>
          <span className={css.ScoreValue}>
            {hud.score[0]} – {hud.score[1]}
          </span>
          <span className={css.ScoreTeam}>
            <RedCards n={hud.reds[1]} />
            {away.short}
          </span>
          <span className={css.KitBar} style={{ background: kits[1].shirt }} />
          <span className={css.Clock}>{`${Math.min(90, hud.minute)}′`}</span>
        </div>
      )}
      {hud?.goal && (
        <>
          <span className={css.Banner}>{tr('football.goal', 'GOAL!')}</span>
          <span className={css.BannerSub}>
            {hud.goal.own
              ? tr('football.own_goal', 'Own goal')
              : `${teams[hud.goal.side].name} · #${hud.goal.num}`}
          </span>
        </>
      )}
      {hud?.phase === 'halftime' && (
        <span className={css.Banner}>{tr('football.halftime', 'Half time')}</span>
      )}
      {hud?.waiting && waitingText && <span className={css.BannerSub}>{waitingText}</span>}
      {hud && hud.charge > 0 && (
        <div className={css.PowerBar}>
          <div className={css.PowerFill} style={{ width: `${Math.round(hud.charge * 100)}%` }} />
        </div>
      )}
      {hud?.call && <CallBanner call={hud.call} teams={teams} />}
      {hud?.sub && !hud.call && <SubBanner sub={hud.sub} teams={teams} />}
      {(hud?.restart || hud?.subsWaiting) && !hud.sub && (
        <span className={css.Hint}>
          {[
            restartName(hud.restart),
            hud.subsWaiting
              ? tr('football.subs.hint', '{{n}} change(s) waiting for the ball to stop', {
                  n: hud.subsWaiting,
                })
              : undefined,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      )}
      {children}
    </div>
  );
}

const scoreLine = (m: MatchState, side: Side) =>
  m.scorers
    .filter((s) => s.side === side)
    .map((s) =>
      s.own
        ? tr('football.end.own_goal', '{{minute}}′ (own goal)', { minute: s.minute })
        : tr('football.end.goal', '#{{num}} {{minute}}′', { num: s.num, minute: s.minute })
    )
    .join(', ');

export function FinalScore({ match, teams }: { match: MatchState; teams: [Team, Team] }) {
  const [home, away] = teams;
  return (
    <>
      <div className={css.FinalScore}>
        <Shirt team={home} big />
        <span>
          {match.score[0]} – {match.score[1]}
        </span>
        <Shirt team={away} big />
      </div>
      <p className={css.Scorers}>
        {home.name}: {scoreLine(match, 0) || '—'}
        <br />
        {away.name}: {scoreLine(match, 1) || '—'}
      </p>
      {match.cards.length > 0 && (
        <p className={css.Scorers}>
          {tr('football.end.cards', 'Cards: {{list}}', {
            list: match.cards
              .map(
                (c) =>
                  `${teams[c.side].short} #${c.num} ${c.color === 'red' ? '🟥' : '🟨'} ${c.minute}′`
              )
              .join(', '),
          })}
        </p>
      )}
      {match.subs.length > 0 && (
        <p className={css.Scorers}>
          {tr('football.end.subs', 'Substitutions: {{list}}', {
            list: match.subs
              .map((s) => `${teams[s.side].short} ${s.out}→${s.on} ${s.minute}′`)
              .join(', '),
          })}
        </p>
      )}
    </>
  );
}
