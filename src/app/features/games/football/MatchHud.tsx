import React, { ReactNode } from 'react';
import { tr } from '../../translation/tr';
import { Kit, Team } from './engine/teams';
import { MatchState, ReplayKind, Side, VarChoice } from './engine/types';
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

const replayName = (kind: ReplayKind): string =>
  ({
    goal: tr('football.replay.goal', 'Goal'),
    penalty: tr('football.replay.penalty', 'Penalty'),
    foul: tr('football.replay.foul', 'Foul'),
    offside: tr('football.replay.offside', 'Offside'),
    save: tr('football.replay.save', 'Save'),
    chance: tr('football.replay.chance', 'So close'),
  }[kind]);

// A replay on screen, as TV marks one: bars top and bottom, a sweep as it starts, the tag with
// what it shows and how far it has played, and how to skip it.
function ReplayTag({ replay, teams }: { replay: NonNullable<Hud['replay']>; teams: [Team, Team] }) {
  const who =
    replay.side !== undefined && replay.num !== undefined
      ? `${teams[replay.side].short} #${replay.num}`
      : undefined;
  let hint: string | undefined;
  if (replay.skipped) hint = tr('football.replay.waiting', 'Waiting for the other side to skip');
  else if (replay.canSkip) hint = tr('football.replay.skip', 'Pass or shoot to skip');
  return (
    <>
      <span className={css.ReplayBarTop} />
      <span className={css.ReplayBarBottom} />
      <span key={replay.at} className={css.ReplayWipe} aria-hidden>
        {tr('football.replay.title', 'Replay')}
      </span>
      <div className={css.ReplayTag} role="status">
        <span className={css.ReplayTitle}>
          <span className={css.ReplayDot} aria-hidden />
          {tr('football.replay.title', 'Replay')} · {replayName(replay.kind)}
        </span>
        {(who || replay.slow) && (
          <span className={css.ReplaySub}>
            {[who, replay.slow ? tr('football.replay.slow', 'Slow motion') : undefined]
              .filter(Boolean)
              .join(' · ')}
          </span>
        )}
        <div className={css.ReplayProgress}>
          <div
            className={css.ReplayFill}
            style={{ width: `${Math.round(replay.progress * 100)}%` }}
          />
        </div>
      </div>
      {hint && <span className={css.Hint}>{hint}</span>}
    </>
  );
}

export const varChoiceName = (c: VarChoice): string =>
  ({
    goal: tr('football.var.goal', 'Goal stands'),
    nogoal_offside: tr('football.var.nogoal_offside', 'No goal: offside'),
    nogoal_foul: tr('football.var.nogoal_foul', 'No goal: foul in the build-up'),
    nofoul: tr('football.var.nofoul', 'No foul'),
    foul: tr('football.var.foul', 'Foul, no card'),
    yellow: tr('football.var.yellow', 'Foul and a yellow card'),
    red: tr('football.var.red', 'Foul and a red card'),
    offside: tr('football.var.offside', 'Offside'),
    onside: tr('football.var.onside', 'Onside'),
  }[c]);

// The video referee's review: the moment loops under the tag while the people watching vote
// (here, as buttons; players see the count), then the decision.
function VarReview({
  review,
  teams,
  onVote,
  myVote,
}: {
  review: NonNullable<Hud['var']>;
  teams: [Team, Team];
  onVote?: (choice: number) => void;
  myVote?: number;
}) {
  const who =
    review.side !== undefined && review.num !== undefined
      ? `${teams[review.side].short} #${review.num}`
      : undefined;
  if (review.verdict >= 0) {
    const changed = review.verdict !== review.called;
    return (
      <div className={css.CallBox} role="status">
        <span className={css.CallTitle}>{tr('football.var.decision', 'VAR decision')}</span>
        <span className={css.BannerSub}>
          {varChoiceName(review.options[review.verdict].choice)}
        </span>
        <span className={css.ReplaySub}>
          {changed
            ? tr('football.var.changed', "The referee's call is changed")
            : tr('football.var.stands', "The referee's call stands")}
        </span>
      </div>
    );
  }
  const total = review.options.reduce((sum, o) => sum + o.votes, 0);
  const voting = !!onVote && myVote === undefined;
  return (
    <>
      <span className={css.ReplayBarTop} />
      <span className={css.ReplayBarBottom} />
      <div className={css.ReplayTag} role="status">
        <span className={css.ReplayTitle}>
          <span className={css.ReplayDot} aria-hidden />
          {tr('football.var.title', 'VAR')} · {replayName(review.kind)}
        </span>
        {who && <span className={css.ReplaySub}>{who}</span>}
        <div className={css.ReplayProgress}>
          <div
            className={css.ReplayFill}
            style={{ width: `${Math.round((1 - review.left) * 100)}%` }}
          />
        </div>
      </div>
      <div className={css.VarPanel}>
        <span className={css.VarHead}>
          {onVote
            ? tr('football.var.vote_help', 'Your vote: what should the referee decide?')
            : tr('football.var.watchers_decide', 'The people watching are deciding')}
        </span>
        {review.options.map((o, k) => {
          const body = (
            <>
              <span className={css.VarRow}>
                <span>
                  {varChoiceName(o.choice)}
                  {k === review.called && (
                    <span className={css.VarCalled}>{tr('football.var.called', 'referee')}</span>
                  )}
                </span>
                <span>{o.votes}</span>
              </span>
              <span className={css.VarBar}>
                <span
                  className={css.VarFill}
                  style={{
                    display: 'block',
                    width: `${total ? Math.round((o.votes / total) * 100) : 0}%`,
                  }}
                />
              </span>
            </>
          );
          return onVote ? (
            <button
              key={o.choice}
              type="button"
              className={`${gameButton({ size: 'sm', variant: 'secondary' })} ${css.VarOption}`}
              aria-pressed={myVote === k}
              disabled={!voting}
              onClick={() => onVote(k)}
            >
              {body}
            </button>
          ) : (
            <div key={o.choice} className={css.VarOption}>
              {body}
            </div>
          );
        })}
        <span className={css.VarHead}>
          {tr('football.var.count', '{{votes}} of {{voters}} voted · a tie keeps the call', {
            votes: total,
            voters: review.voters,
          })}
        </span>
      </div>
    </>
  );
}

export function MatchHud({
  hud,
  loading,
  failed,
  teams,
  kits,
  waitingText,
  onCallVar,
  onVote,
  myVote,
  children,
}: {
  hud: Hud | undefined;
  loading: boolean;
  failed: MatchFailure | undefined;
  teams: [Team, Team];
  kits: [Kit, Kit];
  // What to say while the match waits on the network.
  waitingText?: string;
  // Online, for the people watching: ask the video referee for a review, and vote (`myVote` is
  // the option they picked in the review on screen).
  onCallVar?: () => void;
  onVote?: (choice: number) => void;
  myVote?: number;
  children?: ReactNode;
}) {
  const [home, away] = teams;
  // The restart's name and changes waiting, under the pitch (a free kick has no name: the
  // referee's call says it).
  const hint =
    hud && !hud.sub && !hud.replay && !hud.var
      ? [
          restartName(hud.restart),
          hud.subsWaiting
            ? tr('football.subs.hint', '{{n}} change(s) waiting for the ball to stop', {
                n: hud.subsWaiting,
              })
            : undefined,
        ]
          .filter(Boolean)
          .join(' · ')
      : '';
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
      {hud?.replay && <ReplayTag replay={hud.replay} teams={teams} />}
      {hud?.var && <VarReview review={hud.var} teams={teams} onVote={onVote} myVote={myVote} />}
      {hud?.canCallVar && onCallVar && (
        <button
          type="button"
          className={`${gameButton({ variant: 'primary' })} ${css.VarCall}`}
          onClick={onCallVar}
        >
          {tr('football.var.call', 'Call the VAR')}
        </button>
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
      {hint && <span className={css.Hint}>{hint}</span>}
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
      {match.varLog?.length > 0 && (
        <p className={css.Scorers}>
          {tr('football.end.var', 'VAR: {{list}}', {
            list: match.varLog
              .map(
                (v) =>
                  `${v.minute}′ ${varChoiceName(v.choice)}${
                    v.changed ? ` (${tr('football.end.var_changed', 'changed')})` : ''
                  }`
              )
              .join(', '),
          })}
        </p>
      )}
    </>
  );
}
