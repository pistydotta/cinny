import React, { ReactNode } from 'react';
import { tr } from '../../translation/tr';
import { Kit, Team } from './engine/teams';
import { MatchState, Side } from './engine/types';
import type { Hud } from './runner';
import { shirtBackground } from './setup';
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
  failed: boolean;
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
      {failed && (
        <span className={css.Loading}>
          {tr('football.failed', 'The game could not start on this device (WebGL).')}
        </span>
      )}
      {hud && (
        <div className={css.Scoreboard}>
          <span className={css.KitBar} style={{ background: kits[0].shirt }} />
          <span className={css.ScoreTeam}>{home.short}</span>
          <span className={css.ScoreValue}>
            {hud.score[0]} – {hud.score[1]}
          </span>
          <span className={css.ScoreTeam}>{away.short}</span>
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
      {hud && hud.charge.some((c) => c > 0) && (
        <div className={css.PowerBar}>
          <div
            className={css.PowerFill}
            style={{ width: `${Math.round(Math.max(...hud.charge) * 100)}%` }}
          />
        </div>
      )}
      {hud?.restart && <span className={css.Hint}>{restartName(hud.restart)}</span>}
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
    </>
  );
}
