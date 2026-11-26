import React, { useEffect, useState } from 'react';
import { tr } from '../../translation/tr';
import { GameDialog } from '../ui/GameDialog';
import { gameButton } from '../ui/gameUi.css';
import { Team } from './engine/teams';
import { Player, Side } from './engine/types';
import type { FootballRunner } from './runner';
import { SquadPlayer, squadOf } from './subs';
import * as css from './football.css';

// The substitutions screen, from the pause menu (or online, the menu over a match that goes
// on): pick who goes off and who comes on. The change goes through the inputs and is made the
// next time the ball stops, with the fourth official's board.

const roleName = (role: Player['role']): string => {
  if (role === 'gk') return tr('football.role.gk', 'GK');
  if (role === 'def') return tr('football.role.def', 'DEF');
  if (role === 'mid') return tr('football.role.mid', 'MID');
  return tr('football.role.fwd', 'FWD');
};

function PlayerButton({
  player,
  selected,
  disabled,
  onClick,
}: {
  player: SquadPlayer;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${gameButton({ size: 'sm', variant: selected ? 'primary' : 'secondary' })} ${
        css.SubPick
      }`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
    >
      <span className={css.SubNum}>#{player.num}</span>
      <span>{roleName(player.role)}</span>
      {player.yellow > 0 && (
        <span className={css.CardYellow} aria-label={tr('football.call.yellow', 'Yellow card')} />
      )}
    </button>
  );
}

export function SubsDialog({
  runner,
  teams,
  onClose,
}: {
  runner: FootballRunner;
  teams: [Team, Team];
  onClose: () => void;
}) {
  const sides = runner.sides();
  const [side, setSide] = useState<Side>(sides[0] ?? 0);
  const [out, setOut] = useState<number>();
  const [on, setOn] = useState<number>();
  // Online the match goes on behind the dialog: read it again a few times a second.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 300);
    return () => window.clearInterval(id);
  }, []);

  const squad = squadOf(runner.match, side, runner.waitingSubs());
  const busy = new Set(squad.waiting.flatMap((w) => [w.out.index, w.on.index]));
  // A pick that went away (sent off, already changed) is dropped.
  const outNow = out !== undefined && squad.onPitch.some((p) => p.index === out) ? out : undefined;
  const onNow = on !== undefined && squad.bench.some((p) => p.index === on) ? on : undefined;
  const numOf = (i: number | undefined) => (i === undefined ? '' : runner.match.players[i].num);

  const confirm = () => {
    if (outNow === undefined || onNow === undefined) return;
    runner.requestSub(side, outNow, onNow);
    setOut(undefined);
    setOn(undefined);
  };

  return (
    <GameDialog title={tr('football.subs.title', 'Substitutions')} onClose={onClose} size="md">
      <div className={css.DialogBody}>
        {sides.length > 1 && (
          <div className={css.SubsSides}>
            {sides.map((s) => (
              <button
                key={s}
                type="button"
                className={gameButton({
                  size: 'sm',
                  variant: s === side ? 'primary' : 'secondary',
                })}
                aria-pressed={s === side}
                onClick={() => {
                  setSide(s);
                  setOut(undefined);
                  setOn(undefined);
                }}
              >
                {teams[s].name}
              </button>
            ))}
          </div>
        )}
        <p className={css.Note}>
          {squad.open
            ? tr(
                'football.subs.left',
                '{{n}} changes left. They are made the next time the ball stops.',
                { n: squad.left }
              )
            : tr('football.subs.none_left', 'No changes left.')}
        </p>
        <div className={css.SubsGrid}>
          <div className={css.SubsColumn}>
            <span className={css.Label}>{tr('football.subs.on_pitch', 'Goes off')}</span>
            {squad.onPitch.map((p) => (
              <PlayerButton
                key={p.index}
                player={p}
                selected={p.index === outNow}
                disabled={!squad.open || busy.has(p.index)}
                onClick={() => setOut(p.index === outNow ? undefined : p.index)}
              />
            ))}
          </div>
          <div className={css.SubsColumn}>
            <span className={css.Label}>{tr('football.subs.bench', 'Comes on')}</span>
            {squad.bench.map((p) => (
              <PlayerButton
                key={p.index}
                player={p}
                selected={p.index === onNow}
                disabled={!squad.open || busy.has(p.index)}
                onClick={() => setOn(p.index === onNow ? undefined : p.index)}
              />
            ))}
            {squad.bench.length === 0 && (
              <span className={css.Note}>
                {tr('football.subs.empty_bench', 'Nobody left on the bench.')}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          className={gameButton({ variant: 'primary' })}
          disabled={!squad.open || outNow === undefined || onNow === undefined}
          onClick={confirm}
        >
          {outNow !== undefined && onNow !== undefined
            ? tr('football.subs.confirm_pair', 'Change ▼{{out}} ▲{{on}}', {
                out: numOf(outNow),
                on: numOf(onNow),
              })
            : tr('football.subs.confirm', 'Pick one of each')}
        </button>
        {squad.waiting.length > 0 && (
          <div className={css.SubsColumn}>
            <span className={css.Label}>
              {tr('football.subs.waiting', 'Waiting for the ball to stop')}
            </span>
            {squad.waiting.map((w) => (
              <div key={w.out.index} className={css.SubsRow}>
                <span>
                  <span className={css.SubOut}>▼ {w.out.num}</span>{' '}
                  <span className={css.SubIn}>▲ {w.on.num}</span>
                </span>
                <button
                  type="button"
                  className={gameButton({ size: 'sm', variant: 'ghost' })}
                  onClick={() => runner.requestSub(side, w.out.index, undefined)}
                >
                  {tr('football.subs.undo', 'Call off')}
                </button>
              </div>
            ))}
          </div>
        )}
        {squad.made.length > 0 && (
          <p className={css.Note}>
            {tr('football.end.subs', 'Substitutions: {{list}}', {
              list: squad.made.map((s) => `${s.out}→${s.on} ${s.minute}′`).join(', '),
            })}
          </p>
        )}
        <button type="button" className={gameButton({ variant: 'secondary' })} onClick={onClose}>
          {tr('football.subs.back', 'Back')}
        </button>
      </div>
    </GameDialog>
  );
}
