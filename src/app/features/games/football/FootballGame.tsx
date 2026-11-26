import React, { useEffect, useMemo, useState } from 'react';
import { Segmented } from '../../forge-theme/Segmented';
import { tr } from '../../translation/tr';
import { GameDialog } from '../ui/GameDialog';
import { GameTopBar } from '../ui/GameTopBar';
import { LobbyScope, StageScope } from '../ui/gameTheme.css';
import { gameButton } from '../ui/gameUi.css';
import { createMatch } from './engine/match';
import { Team, matchKits, teamById } from './engine/teams';
import { Difficulty } from './engine/types';
import { ACTIONS, KeyMap, KeySets, keyLabel, loadKeys, saveKeys } from './controls';
import { Graphics, loadGraphics, saveGraphics } from './options';
import { OptionsDialog, actionName, useKeyboardLayout } from './OptionsDialog';
import { unlockAudio } from '../horde/audio/context';
import { FinalScore, MatchHud } from './MatchHud';
import { TeamPicker } from './TeamPicker';
import { localSource } from './source';
import { useMatchCanvas } from './useMatchCanvas';
import { OnlineLobby } from './OnlineLobby';
import { OnlineMatch } from './OnlineMatch';
import { SubsDialog } from './SubsDialog';
import { createFootballApi } from './online/api';
import * as css from './football.css';
import { Choices, HALF_OPTIONS, Mode, loadChoices, saveChoices } from './setup';

// The football game: a menu to pick the teams and the mode, then the match on a canvas with the
// scoreboard over it. The engine, the 3D scene and the sound load only when a match starts.

function ControlsHelp({ mode, keys }: { mode: Mode; keys: KeySets }) {
  const layout = useKeyboardLayout();
  const sets: [string | undefined, KeyMap][] =
    mode === 'local'
      ? [
          [tr('football.player1', 'Player 1'), keys.p1],
          [tr('football.player2', 'Player 2'), keys.p2],
        ]
      : [[undefined, keys.alone]];
  const names = (codes: string[]) => codes.map((c) => keyLabel(c, layout)).join(' / ') || '—';
  return (
    <div className={css.Picker}>
      <span className={css.Label}>{tr('football.controls', 'Controls')}</span>
      {sets.map(([who, map]) => (
        <div key={who ?? 'alone'} className={css.Keys}>
          {who && (
            <>
              <span className={css.Key}>{who}</span>
              <span />
            </>
          )}
          <span className={css.Key}>
            {(['up', 'left', 'down', 'right'] as const)
              .map((a) => (map[a][0] ? keyLabel(map[a][0], layout) : '—'))
              .join(' ')}
          </span>
          <span>{tr('football.keys.move', 'Run')}</span>
          {ACTIONS.filter((a) => !['up', 'down', 'left', 'right'].includes(a)).map((a) => (
            <React.Fragment key={a}>
              <span className={css.Key}>{names(map[a])}</span>
              <span>{actionName(a)}</span>
            </React.Fragment>
          ))}
        </div>
      ))}
      <div className={css.Keys}>
        <span className={css.Key}>Esc / P</span>
        <span>{tr('football.keys.pause', 'Pause')}</span>
      </div>
      <p className={css.Note}>
        {tr(
          'football.keys.first_time',
          'Press pass or shoot while the ball is on its way to play it first time. Defending, hold the through-ball key to press the player on the ball and tap it to tackle.'
        )}
      </p>
      <p className={css.Note}>
        {tr(
          'football.keys.pad',
          'Gamepads work too: A pass, B shoot, Y through ball, X lob, RT sprint.'
        )}
      </p>
    </div>
  );
}

type MatchProps = {
  choices: Choices;
  seed: number;
  inCall: boolean;
  keys: KeySets;
  graphics: Graphics;
  optionsOpen: boolean;
  onOptions: () => void;
  onExit: () => void;
  onRematch: () => void;
};

function MatchScreen({
  choices,
  seed,
  inCall,
  keys,
  graphics,
  optionsOpen,
  onOptions,
  onExit,
  onRematch,
}: MatchProps) {
  const home = teamById(choices.home);
  const away = teamById(choices.away);
  const teams: [Team, Team] = [home, away];
  const kits = useMemo(() => matchKits(home, away), [home, away]);
  const local = choices.mode === 'local';
  const source = useMemo(
    () =>
      localSource(
        createMatch({
          seed,
          teams: [home.id, away.id],
          slots: local ? [0, 1] : [0],
          halfMinutes: choices.halfMinutes,
          difficulty: choices.difficulty,
        })
      ),
    // A new seed is a new match; the rest is fixed while it plays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed]
  );
  const { canvasRef, runnerRef, hud, loading, failed, ended } = useMatchCanvas({
    source,
    kits,
    devices: local ? ['p1', 'p2'] : ['p1'],
    mine: local ? [0, 1] : [0],
    labels: local
      ? [tr('football.player1', 'Player 1'), tr('football.player2', 'Player 2')]
      : undefined,
    keys,
    graphics,
    inCall,
  });

  const [subsOpen, setSubsOpen] = useState(false);
  // The substitutions screen belongs to the pause: playing on closes it.
  useEffect(() => {
    if (!hud?.paused) setSubsOpen(false);
  }, [hud?.paused]);
  const paused = !!hud?.paused && !ended && !optionsOpen && !subsOpen;
  // Leaving by the back arrow asks first, through the pause dialog, while a match is on.
  const back = () => {
    if (runnerRef.current && !ended) runnerRef.current.setPaused(true);
    else onExit();
  };

  return (
    <div className={`${css.Page} ${StageScope}`}>
      <GameTopBar
        title={`${home.name} × ${away.name}`}
        subtitle={
          local
            ? tr('football.mode.local', '2 players')
            : tr('football.mode.cpu_short', 'Against the CPU')
        }
        onBack={back}
      >
        <button
          type="button"
          className={gameButton({ size: 'sm', variant: 'secondary' })}
          onClick={() => runnerRef.current?.setPaused(!hud?.paused)}
          disabled={loading || !!ended}
        >
          {hud?.paused ? tr('football.resume', 'Resume') : tr('football.pause', 'Pause')}
        </button>
      </GameTopBar>
      <div className={css.Stage}>
        <canvas ref={canvasRef} className={css.Canvas} />
        <MatchHud hud={hud} loading={loading} failed={failed} teams={teams} kits={kits} />
      </div>

      {paused && (
        <GameDialog
          title={tr('football.paused', 'Paused')}
          onClose={() => runnerRef.current?.setPaused(false)}
          size="sm"
        >
          <div className={css.DialogBody}>
            <button
              type="button"
              className={gameButton({ variant: 'primary' })}
              onClick={() => runnerRef.current?.setPaused(false)}
            >
              {tr('football.resume', 'Resume')}
            </button>
            <button
              type="button"
              className={gameButton({ variant: 'secondary' })}
              onClick={() => setSubsOpen(true)}
            >
              {tr('football.subs.title', 'Substitutions')}
            </button>
            <button
              type="button"
              className={gameButton({ variant: 'secondary' })}
              onClick={onOptions}
            >
              {tr('football.options_title', 'Options')}
            </button>
            <button type="button" className={gameButton({ variant: 'secondary' })} onClick={onExit}>
              {tr('football.quit', 'Leave the match')}
            </button>
          </div>
        </GameDialog>
      )}

      {subsOpen && !ended && runnerRef.current && (
        <SubsDialog runner={runnerRef.current} teams={teams} onClose={() => setSubsOpen(false)} />
      )}

      {ended && (
        <GameDialog title={tr('football.full_time', 'Full time')} onClose={onExit} size="sm">
          <div className={css.DialogBody}>
            <FinalScore match={ended} teams={teams} />
            <button
              type="button"
              className={gameButton({ variant: 'primary' })}
              onClick={onRematch}
            >
              {tr('football.rematch', 'Rematch')}
            </button>
            <button type="button" className={gameButton({ variant: 'secondary' })} onClick={onExit}>
              {tr('football.back_menu', 'Back to the menu')}
            </button>
          </div>
        </GameDialog>
      )}
    </div>
  );
}

export function FootballGame({
  onBack,
  inCall,
  userId,
  getToken,
  nameOf,
  matchId,
  matchRole,
  onOpenMatch,
  onCloseMatch,
}: {
  onBack: () => void;
  inCall: boolean;
  userId: string;
  getToken: () => string | null;
  nameOf: (userId: string) => string;
  // An online match's link: /games/football/match/<id>/, with ?as=play|watch from the lobby.
  matchId?: string;
  matchRole?: 'play' | 'watch';
  onOpenMatch: (id: string, role: 'play' | 'watch') => void;
  onCloseMatch: () => void;
}) {
  const api = useMemo(() => createFootballApi(getToken), [getToken]);
  const [choices, setChoices] = useState<Choices>(loadChoices);
  const [seed, setSeed] = useState<number>();
  const set = (patch: Partial<Choices>) =>
    setChoices((c) => {
      const next = { ...c, ...patch };
      saveChoices(next);
      return next;
    });
  const [keys, setKeys] = useState<KeySets>(loadKeys);
  const [graphics, setGraphics] = useState<Graphics>(loadGraphics);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const changeKeys = (k: KeySets) => {
    setKeys(k);
    saveKeys(k);
  };
  const changeGraphics = (g: Graphics) => {
    setGraphics(g);
    saveGraphics(g);
  };
  const start = () => {
    // On the click: browsers only let a page make sound after the person did something.
    unlockAudio();
    setSeed(Math.floor(Math.random() * 2 ** 31));
  };

  const options = optionsOpen && (
    <OptionsDialog
      keys={keys}
      graphics={graphics}
      onKeys={changeKeys}
      onGraphics={changeGraphics}
      onClose={() => setOptionsOpen(false)}
      twoPlayers={choices.mode === 'local'}
    />
  );

  if (matchId)
    return (
      <>
        <OnlineMatch
          key={matchId}
          matchId={matchId}
          wanted={matchRole}
          userId={userId}
          getToken={getToken}
          nameOf={nameOf}
          api={api}
          keys={keys}
          graphics={graphics}
          inCall={inCall}
          optionsOpen={optionsOpen}
          onOptions={() => setOptionsOpen(true)}
          onLeave={onCloseMatch}
        />
        {options}
      </>
    );

  if (seed !== undefined)
    return (
      <>
        <MatchScreen
          key={seed}
          choices={choices}
          seed={seed}
          inCall={inCall}
          keys={keys}
          graphics={graphics}
          optionsOpen={optionsOpen}
          onOptions={() => setOptionsOpen(true)}
          onExit={() => setSeed(undefined)}
          onRematch={start}
        />
        {options}
      </>
    );

  return (
    <div className={`${css.Page} ${LobbyScope}`}>
      <GameTopBar
        title={tr('football.title', 'FIFUMA')}
        subtitle={tr('football.subtitle', 'Brasileirão and national teams')}
        onBack={onBack}
      />
      <div className={css.Menu}>
        <div className={css.Row}>
          <Segmented<Mode>
            label={tr('football.mode_label', 'Mode')}
            value={choices.mode}
            onChange={(mode) => set({ mode })}
            options={[
              { value: 'cpu', name: tr('football.mode.cpu', 'Against the CPU') },
              { value: 'local', name: tr('football.mode.local', '2 players') },
              { value: 'online', name: tr('football.mode.online', 'Online') },
            ]}
          />
        </div>

        <div className={css.Pickers}>
          <TeamPicker
            title={
              {
                local: tr('football.player1', 'Player 1'),
                cpu: tr('football.your_team', 'Your team'),
                online: tr('football.home_team', 'Home team'),
              }[choices.mode]
            }
            value={choices.home}
            onChange={(home) => set({ home })}
          />
          <TeamPicker
            title={
              {
                local: tr('football.player2', 'Player 2'),
                cpu: tr('football.opponent', 'Opponent'),
                online: tr('football.away_team', 'Away team'),
              }[choices.mode]
            }
            value={choices.away}
            onChange={(away) => set({ away })}
          />
        </div>

        <div className={css.Row}>
          {choices.mode === 'cpu' && (
            <>
              <span className={css.Label}>{tr('football.difficulty', 'Difficulty')}</span>
              <Segmented<Difficulty>
                label={tr('football.difficulty', 'Difficulty')}
                value={choices.difficulty}
                onChange={(difficulty) => set({ difficulty })}
                options={[
                  { value: 'easy', name: tr('football.easy', 'Easy') },
                  { value: 'normal', name: tr('football.normal', 'Normal') },
                  { value: 'hard', name: tr('football.hard', 'Hard') },
                ]}
              />
            </>
          )}
          {choices.mode === 'online' && (
            <>
              <span className={css.Label}>{tr('football.per_side', 'People a side')}</span>
              <Segmented<string>
                label={tr('football.per_side', 'People a side')}
                value={String(choices.perSide)}
                onChange={(v) => set({ perSide: Number(v) })}
                options={['1', '2', '3', '4'].map((n) => ({ value: n, name: n }))}
              />
            </>
          )}
          <span className={css.Label}>{tr('football.half_length', 'Each half')}</span>
          <Segmented<string>
            label={tr('football.half_length', 'Each half')}
            value={String(choices.halfMinutes)}
            onChange={(v) => set({ halfMinutes: Number(v) })}
            options={HALF_OPTIONS.map((n) => ({
              value: String(n),
              name: tr('football.minutes', '{{n}} min', { n }),
            }))}
          />
        </div>

        {choices.mode === 'online' && (
          <OnlineLobby
            api={api}
            userId={userId}
            home={choices.home}
            away={choices.away}
            perSide={choices.perSide}
            halfMinutes={choices.halfMinutes}
            nameOf={nameOf}
            onOpen={(id, role) => {
              unlockAudio();
              onOpenMatch(id, role);
            }}
          />
        )}

        <div className={css.Row}>
          {choices.mode !== 'online' && (
            <button
              type="button"
              className={gameButton({ variant: 'primary', size: 'lg' })}
              onClick={start}
            >
              {tr('football.play', 'Play')}
            </button>
          )}
          <button
            type="button"
            className={gameButton({ variant: 'secondary', size: 'lg' })}
            onClick={() => setOptionsOpen(true)}
          >
            {tr('football.options_title', 'Options')}
          </button>
        </div>

        <ControlsHelp mode={choices.mode} keys={keys} />
      </div>
      {options}
    </div>
  );
}
