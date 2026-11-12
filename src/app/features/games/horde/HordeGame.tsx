import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, Icons } from 'folds';
import {
  CHARACTER_IDS,
  ENGINE_VERSION,
  MAX_TIER,
  META_IDS,
  META_UPGRADES,
  RUN_SECONDS,
  TIER_DIFFICULTY,
  metaCost,
} from './engine/data';
import { MetaSave, finishRun, progressOf, runGold } from './engine/meta';
import { CharacterId, MetaBonuses, RunState, WeaponId } from './engine/types';
import { NO_META, createRun, runStats } from './engine/run';
import {
  ACHIEVEMENTS,
  AchievementId,
  MAX_MASTERY,
  isDone,
  lockedContent,
  masteryKills,
  masteryLevel,
  nearestAchievement,
} from './engine/achievements';
import { RankingQuery, RankingRow } from './profile';
import { PixelIcon } from './icons/PixelIcon';
import { ReplayStart, decodeLog, runFrom } from './engine/replay';
import { StatsPanel } from './StatsPanel';
import { BuildPanel } from './BuildPanel';
import { Hud, HordeRunner } from './runner';
import {
  achievementLabel,
  buildItemLabel,
  unlockName,
  abilityLabel,
  characterLabel,
  choiceLabel,
  formatTime,
  keyLabel,
  keysOf,
  metaLabel,
  passiveLabel,
  shrineLabel,
  weaponLabel,
} from './labels';
import { Controls, loadControls, saveControls } from './controls';
import { audioContext, unlockAudio } from './audio/context';
import { ControlsPanel, useKeyboardLayout } from './ControlsPanel';
import { HERO_SPRITES } from './sprites';
import { useHordeProfile } from './useHordeProfile';
import { firstRunHere, forgetRun, readRun, storeRun } from './savedRun';
import * as css from './horde.css';
import { tr } from '../../translation/tr';

type Result = {
  won: boolean;
  time: number;
  kills: number;
  level: number;
  gold: number;
  // Damage of each weapon, most first.
  damage: [WeaponId, number][];
  // Records beaten in this run, or how far it fell short of them.
  bestTime: boolean;
  bestKills: boolean;
  timeShort: number;
  killsShort: number;
  // Achievements done for the first time in this run.
  unlocked: AchievementId[];
  // The unfinished achievement closest to done after this run.
  nearest: { id: AchievementId; value: number; goal: number } | undefined;
  daily: boolean;
};

// Everything a run starts from, fixed when Play is pressed.
export type RunSetup = {
  seed: number;
  character: CharacterId;
  upgrades: MetaBonuses;
  tier: number;
  locked: string[];
  mastery: number;
  // The daily challenge's day, when it counts.
  daily?: string;
  // The save before the run, to tell records and achievements apart afterwards.
  before: MetaSave;
  // A run kept in this browser, picked up where it was.
  resume?: RunState;
  // Show the first run's tips.
  tips?: boolean;
  // Bumped on every start, so starting again (even the same run) makes a fresh game.
  attempt: number;
  // Watching someone's recorded run: its commands, and whose it is.
  watch?: { log: number[]; endTick: number; name: string };
  replayStart?: ReplayStart;
};

type Panel = 'controls' | 'stats' | 'build' | undefined;

type HordeRunProps = {
  setup: RunSetup;
  // This player's place in the overall ranking, when known.
  rank: number | undefined;
  controls: Controls;
  onControls: (controls: Controls) => void;
  onEnd: (run: RunState) => void;
  onAgain: () => void;
  onExit: () => void;
  // Keeps the run in the browser, and forgets it once it's over or given up.
  onSave: (run: RunState) => void;
  onForget: () => void;
  // The 3D was lost: start again from the kept run.
  onRecover: () => void;
  inCall: boolean;
};

const TOUCH = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

const saveMuted = (controls: Controls, muted: boolean): Controls => {
  const next = { ...controls, muted };
  saveControls(next);
  return next;
};

function HelpText({ controls }: { controls: Controls }) {
  const layout = useKeyboardLayout();
  if (TOUCH) {
    return (
      <p className={css.Hint}>
        {tr(
          'games.horde.help_touch',
          'Left side of the screen to move, right side to turn the camera. Weapons attack by themselves.'
        )}
      </p>
    );
  }
  const move = ['forward', 'left', 'back', 'right'] as const;
  return (
    <p className={css.Hint}>
      {tr(
        'games.horde.help_keys',
        '{{move}} to move, the mouse turns the camera, {{jump}} to jump, {{dash}} to dodge, {{pause}} to pause. Weapons attack by themselves.',
        {
          move: move
            .map((action) =>
              keysOf(
                {
                  ...controls,
                  keys: { ...controls.keys, [action]: [controls.keys[action][0], ''] },
                },
                action,
                layout
              )
            )
            .join(' '),
          jump: keysOf(controls, 'jump', layout),
          dash: keysOf(controls, 'dash', layout),
          pause: keysOf(controls, 'pause', layout),
        }
      )}
    </p>
  );
}

// A few words at the start of someone's first run here, one after another, never in the way.
function FirstRunTip({ time, controls }: { time: number; controls: Controls }) {
  const layout = useKeyboardLayout();
  const keys = (action: Parameters<typeof keysOf>[1]) => keysOf(controls, action, layout);
  let tip: string | undefined;
  if (time < 6) {
    tip = TOUCH
      ? tr('games.horde.tip.move_touch', 'Drag on the left to walk, on the right to look around')
      : tr('games.horde.tip.move', '{{keys}} to walk, the mouse to look around', {
          keys: ['forward', 'left', 'back', 'right']
            .map((a) => keyLabel(controls.keys[a as 'forward'][0], layout))
            .join(' '),
        });
  } else if (time < 12) {
    tip = TOUCH
      ? tr('games.horde.tip.jump_touch', 'Jump and Dodge get you out of trouble')
      : tr('games.horde.tip.jump', '{{jump}} jumps, {{dash}} dodges through enemies', {
          jump: keys('jump'),
          dash: keys('dash'),
        });
  } else if (time < 18) {
    tip = tr('games.horde.tip.gems', 'Pick up the blue gems to level up and choose upgrades');
  } else if (time < 24) {
    tip = TOUCH
      ? tr('games.horde.tip.ability_touch', "The round button is your hero's ability")
      : tr('games.horde.tip.ability', "{{key}} is your hero's ability", { key: keys('ability') });
  }
  if (!tip) return null;
  return <div className={css.Tip}>{tip}</div>;
}

function HordeRun({
  setup,
  rank,
  controls,
  onControls,
  onEnd,
  onAgain,
  onExit,
  onSave,
  onForget,
  onRecover,
  inCall,
}: HordeRunProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const runnerRef = useRef<HordeRunner>();
  const [hud, setHud] = useState<Hud>();
  const [result, setResult] = useState<Result>();
  const [failed, setFailed] = useState(false);
  // The graphics card dropped the 3D (it happens on phones): the run waits to be picked up.
  const [lost, setLost] = useState(false);
  // The end of a watched run.
  const [watched, setWatched] = useState<{ won: boolean; time: number; kills: number }>();
  const [panel, setPanel] = useState<Panel>();
  // The run starts with the save as it was when Play was pressed; later saves don't restart it.
  const start = useRef({ setup, controls, onEnd, onSave, onForget });

  const giveUp = () => {
    runnerRef.current?.discard();
    onForget();
    onExit();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const onLost = (event: Event) => {
      event.preventDefault();
      runnerRef.current?.save();
      runnerRef.current?.setPaused(true);
      setLost(true);
    };
    canvas.addEventListener('webglcontextlost', onLost);
    return () => canvas.removeEventListener('webglcontextlost', onLost);
  }, []);
  const hero = start.current.setup.character;

  // Enter or R plays again from the result screen.
  useEffect(() => {
    if (!result) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Enter' || event.code === 'KeyR') onAgain();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [result, onAgain]);

  useEffect(() => {
    runnerRef.current?.setControls(controls);
  }, [controls]);

  useEffect(() => {
    runnerRef.current?.setInCall(inCall);
  }, [inCall]);

  const inCallRef = useRef(inCall);
  inCallRef.current = inCall;

  useEffect(() => {
    let cancelled = false;
    const {
      setup: runSetup,
      controls: runControls,
      onEnd: end,
      onSave: keep,
      onForget: forget,
    } = start.current;
    // three.js and the sounds are big, so they only load when a run starts.
    Promise.all([import('./render/scene'), import('./audio/sound')])
      .then(([{ HordeScene }, { HordeAudio }]) => {
        const canvas = canvasRef.current;
        const overlay = overlayRef.current;
        if (cancelled || !canvas || !overlay) return;
        let run: RunState;
        if (runSetup.watch) run = runFrom(runSetup.replayStart as ReplayStart);
        else
          run =
            runSetup.resume ??
            createRun(runSetup.seed, runSetup.character, runSetup.upgrades, runSetup.tier, {
              locked: runSetup.locked,
              mastery: runSetup.mastery,
              daily: runSetup.daily,
            });
        const ctx = audioContext();
        runnerRef.current = new HordeRunner(
          run,
          new HordeScene(canvas, run),
          overlay,
          runControls,
          setHud,
          (ended) => {
            if (runSetup.watch) {
              setWatched({ won: ended.phase === 'won', time: ended.time, kills: ended.kills });
              return;
            }
            const { before } = runSetup;
            const after = finishRun(before, ended);
            const near = nearestAchievement(progressOf(after));
            setResult({
              won: ended.phase === 'won',
              time: ended.time,
              kills: ended.kills,
              level: ended.player.level,
              gold: runGold(ended),
              damage: (Object.entries(ended.damageBy) as [WeaponId, number][]).sort(
                (a, b) => b[1] - a[1]
              ),
              bestTime: before.runs > 0 && Math.floor(ended.time) > before.bestTime,
              bestKills: before.runs > 0 && ended.kills > before.bestKills,
              timeShort: Math.max(0, before.bestTime - Math.floor(ended.time)),
              killsShort: Math.max(0, before.bestKills - ended.kills),
              unlocked: ACHIEVEMENTS.filter(
                (a) => !isDone(a, progressOf(before)) && isDone(a, progressOf(after))
              ).map((a) => a.id),
              nearest: near && {
                id: near.id,
                value: near.value(progressOf(after)),
                goal: near.goal,
              },
              daily: !!ended.daily,
            });
            forget();
            end(ended);
          },
          {
            audio: ctx ? new HordeAudio(ctx, 0) : undefined,
            inCall: inCallRef.current,
            onSave: runSetup.watch ? undefined : keep,
            watch: runSetup.watch,
          }
        );
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      runnerRef.current?.stop();
      runnerRef.current = undefined;
    };
  }, []);

  const runner = runnerRef.current;

  return (
    <div className={css.Stage}>
      <canvas ref={canvasRef} className={css.Canvas} />
      <div ref={overlayRef} className={css.Overlay} />

      {hud && (
        <>
          <div className={css.HudTop}>
            <div className={css.XpBar}>
              <div className={css.XpFill} style={{ width: `${Math.min(1, hud.xp) * 100}%` }} />
            </div>
            <div className={css.HudRow}>
              <span>{tr('games.horde.hud.level', 'Lv {{level}}', { level: hud.level })}</span>
              <span className={css.Grow} />
              <span className={css.Timer}>{formatTime(hud.time)}</span>
              <span className={css.Grow} />
              <span>💀 {hud.kills}</span>
              <span>🪙 {hud.gold}</span>
              <button
                type="button"
                className={css.HudButton}
                onClick={() => runner?.setPaused(true)}
                aria-label={tr('games.horde.pause', 'Pause')}
              >
                ⏸
              </button>
            </div>
            <div className={css.Slots}>
              {hud.weapons.map((w) => (
                <span key={w.id} className={css.Slot} title={weaponLabel(w.id).name}>
                  <PixelIcon art={weaponLabel(w.id).art} emoji={weaponLabel(w.id).icon} />
                  <span className={css.SlotLevel}>{w.level}</span>
                </span>
              ))}
              {hud.passives.map((p) => (
                <span key={p.id} className={css.Slot} title={passiveLabel(p.id).name}>
                  <PixelIcon art={passiveLabel(p.id).art} emoji={passiveLabel(p.id).icon} />
                  <span className={css.SlotLevel}>{p.level}</span>
                </span>
              ))}
            </div>
            {hud.boss !== undefined && (
              <div className={css.BossBar}>
                <div className={css.BossFill} style={{ width: `${hud.boss * 100}%` }} />
              </div>
            )}
          </div>

          <div className={css.HudBottom}>
            {hud.challenge && (
              <span className={css.Objective}>
                {tr('games.horde.challenge_hud', '⚔️ {{kills}} more in {{seconds}} s', {
                  kills: hud.challenge.kills,
                  seconds: Math.ceil(hud.challenge.seconds),
                })}
              </span>
            )}
            {hud.curse > 0 && (
              <span className={css.Objective} data-curse>
                {tr('games.horde.curse_hud', '☠️ Curse: {{seconds}} s', {
                  seconds: Math.ceil(hud.curse),
                })}
              </span>
            )}
            {hud.shrine && <span className={css.Objective}>{shrineLabel(hud.shrine)}</span>}
            <span className={css.Speed} data-fast={hud.speed > 9}>
              {tr('games.horde.hud.speed', '{{speed}} m/s', { speed: hud.speed.toFixed(1) })}
            </span>
            {(hud.buffs.rage > 0 || hud.buffs.freeze > 0 || hud.buffs.star > 0) && (
              <div className={css.Buffs}>
                {hud.buffs.rage > 0 && (
                  <span className={css.Buff}>😡 {Math.ceil(hud.buffs.rage)}</span>
                )}
                {hud.buffs.freeze > 0 && (
                  <span className={css.Buff}>🧊 {Math.ceil(hud.buffs.freeze)}</span>
                )}
                {hud.buffs.star > 0 && (
                  <span className={css.Buff}>⭐ {Math.ceil(hud.buffs.star)}</span>
                )}
              </div>
            )}
            <span>
              {Math.ceil(hud.hp)} / {hud.maxHp}
              {hud.overHp >= 1 && ` +${Math.floor(hud.overHp)}`}
            </span>
            <div className={css.HpBar}>
              <div className={css.HpFill} style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }} />
            </div>
            {hud.maxShield > 0 && (
              <div className={css.ShieldBar}>
                <div
                  className={css.ShieldFill}
                  style={{ width: `${(hud.shield / hud.maxShield) * 100}%` }}
                />
              </div>
            )}
          </div>

          {!TOUCH && !hud.aiming && hud.phase === 'playing' && !hud.paused && (
            <div className={css.AimHint}>
              {tr('games.horde.aim_hint', 'Click to turn the camera with the mouse')}
            </div>
          )}

          {!TOUCH && (
            <div
              className={css.AbilityChip}
              data-ready={hud.ability >= 1}
              title={`${abilityLabel(hero).name}: ${abilityLabel(hero).text}`}
            >
              <div
                className={css.AbilityFill}
                style={{ height: `${Math.min(1, hud.ability) * 100}%` }}
              />
              <PixelIcon art={abilityLabel(hero).art} emoji={abilityLabel(hero).icon} />
              <span className={css.AbilityKey}>{keyLabel(controls.keys.ability[0])}</span>
            </div>
          )}

          {TOUCH && (
            <>
              <button
                type="button"
                className={css.AbilityButton}
                data-ready={hud.ability >= 1}
                onPointerDown={() => runner?.pressAbility()}
                aria-label={abilityLabel(hero).name}
              >
                <PixelIcon art={abilityLabel(hero).art} emoji={abilityLabel(hero).icon} />
              </button>
              <button
                type="button"
                className={css.JumpButton}
                onPointerDown={() => runner?.holdJump(true)}
                onPointerUp={() => runner?.holdJump(false)}
                onPointerCancel={() => runner?.holdJump(false)}
                onPointerLeave={() => runner?.holdJump(false)}
              >
                {tr('games.horde.jump', 'Jump')}
              </button>
              <button
                type="button"
                className={css.DashButton}
                data-ready={hud.dash >= 1}
                onPointerDown={() => runner?.pressDash()}
              >
                {tr('games.horde.dash', 'Dash')}
              </button>
            </>
          )}
        </>
      )}

      {hud?.phase === 'choosing' && hud.choices && (
        <div className={css.Curtain}>
          <div className={css.Panel}>
            <h2 className={css.PanelTitle}>
              {hud.choices[0]?.kind === 'blessing'
                ? tr('games.horde.choose_blessing', 'Shrine: choose a blessing')
                : tr('games.horde.choose', 'Choose an upgrade')}
            </h2>
            <div className={css.Cards}>
              {hud.choices.map((choice, index) => {
                const label = choiceLabel(choice);
                const canBanish =
                  hud.banishes > 0 && (choice.kind === 'weapon' || choice.kind === 'passive');
                let rarity: string | undefined;
                if (choice.kind === 'evolve') rarity = 'evolve';
                else if (
                  choice.kind === 'weapon' ||
                  choice.kind === 'passive' ||
                  choice.kind === 'blessing'
                ) {
                  rarity = choice.rarity;
                }
                return (
                  // The same offer can come again after a reroll, in another place.
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={index} className={css.CardSlot}>
                    <button
                      type="button"
                      className={css.Card}
                      data-rarity={rarity}
                      onClick={() => runner?.choose(index)}
                    >
                      <span className={css.CardIcon}>
                        <PixelIcon art={label.art} emoji={label.icon} />
                      </span>
                      <span className={css.CardName}>{label.name}</span>
                      {label.tag && <span className={css.CardTag}>{label.tag}</span>}
                      <span className={css.CardText}>{label.text}</span>
                      {!TOUCH && <span className={css.KeyHint}>{index + 1}</span>}
                    </button>
                    {canBanish && (
                      <button
                        type="button"
                        className={css.SmallButton}
                        onClick={() => runner?.banish(index)}
                      >
                        {tr('games.horde.banish', '🚫 Banish ({{count}})', { count: hud.banishes })}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {(hud.rerolls > 0 || hud.skips > 0) && (
              <div className={css.PanelRow}>
                {hud.rerolls > 0 && (
                  <button
                    type="button"
                    className={css.PlainButton}
                    onClick={() => runner?.reroll()}
                  >
                    {tr('games.horde.reroll', '🎲 Reroll ({{count}})', { count: hud.rerolls })}
                  </button>
                )}
                {hud.skips > 0 && (
                  <button type="button" className={css.PlainButton} onClick={() => runner?.skip()}>
                    {tr('games.horde.skip', '⏭️ Skip for gold ({{count}})', { count: hud.skips })}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {hud?.phase === 'chest' && hud.chest && (
        <div className={css.Curtain}>
          <div className={css.Panel}>
            <h2 className={css.PanelTitle}>
              {hud.chest.length > 1
                ? tr('games.horde.chest_many', 'Chest! {{count}} upgrades', {
                    count: hud.chest.length,
                  })
                : tr('games.horde.chest_one', 'Chest!')}
            </h2>
            <div className={css.Cards}>
              {hud.chest.map((reward, index) => {
                const label = choiceLabel(reward);
                return (
                  <div
                    // A chest can give the same thing twice.
                    // eslint-disable-next-line react/no-array-index-key
                    key={index}
                    className={css.ChestCard}
                    data-rarity={reward.kind === 'evolve' ? 'evolve' : undefined}
                    style={{ animationDelay: `${index * 220}ms` }}
                  >
                    <span className={css.CardIcon}>
                      <PixelIcon art={label.art} emoji={label.icon} />
                    </span>
                    <span className={css.CardName}>{label.name}</span>
                    {label.tag && <span className={css.CardTag}>{label.tag}</span>}
                    <span className={css.CardText}>{label.text}</span>
                  </div>
                );
              })}
            </div>
            <div className={css.PanelRow}>
              <button type="button" className={css.PlayButton} onClick={() => runner?.closeChest()}>
                {tr('games.horde.chest_take', 'Take it')}
              </button>
            </div>
          </div>
        </div>
      )}

      {hud?.paused && hud.phase === 'playing' && !lost && (
        <div className={css.Curtain}>
          <div className={css.Panel}>
            {panel === 'controls' && (
              <ControlsPanel
                controls={controls}
                onChange={onControls}
                onClose={() => setPanel(undefined)}
                touch={!!TOUCH}
                inCall={inCall}
              />
            )}
            {panel === 'build' && runner && (
              <BuildPanel {...runner.build()} onClose={() => setPanel(undefined)} />
            )}
            {panel === 'stats' && runner && (
              <StatsPanel
                stats={runner.stats()}
                title={tr('games.horde.stats', 'Stats')}
                onClose={() => setPanel(undefined)}
              />
            )}
            {!panel && (
              <>
                <h2 className={css.PanelTitle}>{tr('games.horde.paused', 'Paused')}</h2>
                <HelpText controls={controls} />
                <div className={css.PanelRow}>
                  <button
                    type="button"
                    className={css.PlayButton}
                    onClick={() => runner?.setPaused(false)}
                  >
                    {tr('games.horde.resume', 'Continue')}
                  </button>
                </div>
                <div className={css.PanelRow}>
                  <button
                    type="button"
                    className={css.PlainButton}
                    onClick={() => onControls(saveMuted(controls, !controls.muted))}
                  >
                    {controls.muted
                      ? tr('games.horde.unmute', '🔇 Sound off')
                      : tr('games.horde.mute', '🔊 Sound on')}
                  </button>
                  <button
                    type="button"
                    className={css.PlainButton}
                    onClick={() => setPanel('build')}
                  >
                    {tr('games.horde.build', 'Build')}
                  </button>
                  <button
                    type="button"
                    className={css.PlainButton}
                    onClick={() => setPanel('stats')}
                  >
                    {tr('games.horde.stats', 'Stats')}
                  </button>
                  <button
                    type="button"
                    className={css.PlainButton}
                    onClick={() => setPanel('controls')}
                  >
                    {tr('games.horde.controls', 'Controls')}
                  </button>
                  <button type="button" className={css.PlainButton} onClick={giveUp}>
                    {tr('games.horde.give_up', 'Give up the run')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {setup.watch && !watched && (
        <div className={css.Watching}>
          {tr('games.horde.watching', '▶ Watching {{name}}', { name: setup.watch.name })}
        </div>
      )}

      {watched && (
        <div className={css.Curtain}>
          <div className={css.Panel}>
            <h2 className={css.PanelTitle}>{tr('games.horde.watch_end', 'End of the replay')}</h2>
            <p className={css.Hint}>
              {tr('games.horde.watch_summary', '{{name}}: {{time}}, {{kills}} kills', {
                name: setup.watch?.name ?? '',
                time: formatTime(watched.time),
                kills: watched.kills,
              })}
            </p>
            <div className={css.PanelRow}>
              <button type="button" className={css.PlayButton} onClick={onExit}>
                {tr('games.action.back', 'Back')}
              </button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className={css.Curtain}>
          <div className={css.Panel}>
            <h2 className={css.PanelTitle}>
              {result.won
                ? tr('games.horde.won', 'Victory! The horde is down')
                : tr('games.horde.dead', 'You were defeated')}
            </h2>
            <div className={css.Stats}>
              <span className={css.Stat}>
                <span className={css.StatValue}>{formatTime(result.time)}</span>
                {tr('games.horde.stat.time', 'Survived')}
              </span>
              <span className={css.Stat}>
                <span className={css.StatValue}>{result.kills}</span>
                {tr('games.horde.stat.kills', 'Kills')}
              </span>
              <span className={css.Stat}>
                <span className={css.StatValue}>{result.level}</span>
                {tr('games.horde.stat.level', 'Level')}
              </span>
              <span className={css.Stat}>
                <span className={css.StatValue}>+{result.gold}</span>
                {tr('games.horde.stat.gold', 'Gold')}
              </span>
            </div>
            <div className={css.ResultNotes}>
              {result.daily && (
                <span>
                  {tr('games.horde.result.daily', '📅 Daily challenge: your try for today')}
                </span>
              )}
              {result.bestTime && (
                <span className={css.Good}>
                  {tr('games.horde.result.best_time', '⏱️ New best time!')}
                </span>
              )}
              {result.bestKills && (
                <span className={css.Good}>
                  {tr('games.horde.result.best_kills', '💀 New record of kills!')}
                </span>
              )}
              {!result.bestTime && !result.won && result.timeShort > 0 && (
                <span>
                  {tr('games.horde.result.time_short', '{{time}} short of your best time', {
                    time: formatTime(result.timeShort),
                  })}
                </span>
              )}
              {!result.bestKills && result.killsShort > 0 && (
                <span>
                  {tr('games.horde.result.kills_short', '{{count}} kills short of your record', {
                    count: result.killsShort,
                  })}
                </span>
              )}
              {result.unlocked.map((id) => {
                const done = ACHIEVEMENTS.find((a) => a.id === id);
                return (
                  <span key={id} className={css.Good}>
                    {tr('games.horde.result.achievement', '🏅 {{name}}', {
                      name: achievementLabel(id, done?.goal ?? 0).name,
                    })}
                    {done?.unlocks &&
                      ` — ${tr('games.horde.result.unlocks', 'unlocks {{thing}}', {
                        thing: unlockName(done.unlocks),
                      })}`}
                  </span>
                );
              })}
              {result.nearest && (
                <span>
                  {tr('games.horde.result.nearest', 'Next: {{name}} ({{value}}/{{goal}})', {
                    name: achievementLabel(result.nearest.id, result.nearest.goal).text,
                    value: Math.max(0, Math.floor(result.nearest.value)),
                    goal: result.nearest.goal,
                  })}
                </span>
              )}
              {rank !== undefined && (
                <span>
                  {tr('games.horde.result.rank', '🏆 You are #{{rank}} in the ranking', {
                    rank: rank + 1,
                  })}
                </span>
              )}
            </div>
            {result.damage.length > 0 && (
              <div className={css.DamageList}>
                {result.damage.map(([id, amount]) => (
                  <div key={id} className={css.DamageRow}>
                    <PixelIcon art={weaponLabel(id).art} emoji={weaponLabel(id).icon} />
                    <span className={css.Grow}>
                      <span
                        className={css.DamageBar}
                        style={{
                          display: 'block',
                          width: `${(amount / result.damage[0][1]) * 100}%`,
                        }}
                      />
                    </span>
                    <span>{Math.round(amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
            <div className={css.PanelRow}>
              <button type="button" className={css.PlayButton} onClick={onAgain}>
                {tr('games.horde.again', 'Play again')}
                {!TOUCH && <span className={css.KeyHint}>Enter</span>}
              </button>
            </div>
            <div className={css.PanelRow}>
              <button type="button" className={css.PlainButton} onClick={onExit}>
                {tr('games.horde.to_menu', 'Upgrades and heroes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {setup.tips && hud?.phase === 'playing' && !hud.paused && (
        <FirstRunTip time={hud.time} controls={controls} />
      )}

      {lost && (
        <div className={css.Curtain}>
          <div className={css.Panel}>
            <p className={css.Hint}>
              {tr(
                'games.horde.lost',
                'The 3D graphics stopped (this happens on some phones). Your run was kept.'
              )}
            </p>
            <div className={css.PanelRow}>
              <button type="button" className={css.PlayButton} onClick={onRecover}>
                {tr('games.horde.recover', 'Pick it up again')}
              </button>
              <button type="button" className={css.PlainButton} onClick={onExit}>
                {tr('games.action.back', 'Back')}
              </button>
            </div>
          </div>
        </div>
      )}

      {failed && (
        <div className={css.Curtain}>
          <div className={css.Panel}>
            <p className={css.Hint}>
              {tr(
                'games.horde.failed',
                'The game could not start: this device has no 3D graphics on.'
              )}
            </p>
            <div className={css.PanelRow}>
              <button type="button" className={css.PlainButton} onClick={onExit}>
                {tr('games.action.back', 'Back')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type HordeGameProps = {
  userId: string;
  // The Matrix token for the blazeroom API. Without it the game keeps everything in the browser.
  getToken?: () => string | null;
  nameOf?: (userId: string) => string;
  onBack: () => void;
  // Whether this person is in a voice call here: the game then plays quietly.
  inCall?: boolean;
};

const newSeed = (): number => Math.floor(Math.random() * 4294967296);

// A hero's mastery level and how far to the next, on its card.
function MasteryTag({ kills }: { kills: number }) {
  const level = masteryLevel(kills);
  if (level === 0 && kills === 0) return null;
  const next = level < MAX_MASTERY ? masteryKills(level + 1) : undefined;
  return (
    <span className={css.CardTag}>
      {tr('games.horde.mastery', 'Mastery {{level}}', { level })}
      {next !== undefined && ` · ${kills}/${next}`}
    </span>
  );
}

export function HordeGame({ userId, getToken, nameOf, onBack, inCall = false }: HordeGameProps) {
  const {
    meta,
    online,
    ranking,
    rankingQuery,
    showRanking,
    daily,
    dailyTried,
    startDaily,
    loadReplay,
    canBuy,
    pickCharacter,
    endRun,
    buy,
  } = useHordeProfile(userId, getToken);
  const [setup, setSetup] = useState<RunSetup>();
  const [controls, setControls] = useState(loadControls);
  const [panel, setPanel] = useState<Panel>();
  // Each win unlocks a harder tier, up to MAX_TIER.
  const unlocked = Math.min(MAX_TIER, meta.wins);
  const [tier, setTier] = useState(0);
  const [watchError, setWatchError] = useState(false);
  const progress = progressOf(meta);
  const locked = lockedContent(progress);
  // A run left unfinished in this browser, read again whenever the menu shows.
  const saved = useMemo(() => (setup ? undefined : readRun(userId)), [setup, userId]);

  const resume = (run: RunState) => {
    unlockAudio();
    setSetup({
      seed: run.seed,
      character: run.character,
      upgrades: run.meta,
      tier: run.tier,
      locked: run.locked,
      mastery: run.mastery,
      before: meta,
      resume: run,
      attempt: Date.now(),
    });
  };

  // A normal run: the player's upgrades, unlocks, mastery and tier.
  const startRun = () => {
    // The click lets the browser play sound; the context is made here, before loading.
    unlockAudio();
    forgetRun(userId);
    setSetup({
      seed: newSeed(),
      character: meta.character,
      upgrades: meta.upgrades,
      tier: Math.min(tier, unlocked),
      locked,
      mastery: masteryLevel(meta.heroes[meta.character].kills),
      before: meta,
      tips: meta.runs === 0 && firstRunHere(),
      attempt: Date.now(),
    });
  };

  // Today's challenge: everyone's same run, with nothing of their own. Only the first try counts.
  const startDailyRun = () => {
    unlockAudio();
    forgetRun(userId);
    const counts = startDaily();
    setSetup({
      seed: daily.seed,
      character: daily.character,
      upgrades: NO_META,
      tier: 0,
      locked: [],
      mastery: 0,
      daily: counts ? daily.day : undefined,
      before: meta,
      attempt: Date.now(),
    });
  };

  // Watches a ranked run: plays its recording, with nothing reported or kept.
  const watchRun = async (row: RankingRow) => {
    if (!row.runId) return;
    const replay = await loadReplay(row.userId, row.runId);
    const log = replay ? decodeLog(replay.log) : undefined;
    if (!replay || !log || replay.engine !== ENGINE_VERSION) {
      setWatchError(true);
      return;
    }
    unlockAudio();
    setWatchError(false);
    setSetup({
      seed: replay.start.seed,
      character: replay.start.character,
      upgrades: replay.start.meta,
      tier: replay.start.tier,
      locked: replay.start.locked,
      mastery: replay.start.mastery,
      before: meta,
      attempt: Date.now(),
      replayStart: replay.start,
      watch: { log, endTick: replay.endTick, name: nameOf?.(row.userId) ?? row.userId },
    });
  };

  if (setup) {
    const myRank =
      rankingQuery.scope === 'all' && !rankingQuery.hero
        ? ranking?.findIndex((row) => row.userId === userId)
        : undefined;
    return (
      <HordeRun
        key={setup.attempt}
        setup={setup}
        rank={myRank !== undefined && myRank >= 0 ? myRank : undefined}
        controls={controls}
        onControls={setControls}
        onEnd={setup.watch ? () => undefined : endRun}
        onAgain={() => {
          unlockAudio();
          setSetup({
            ...setup,
            seed: setup.daily ? setup.seed : newSeed(),
            daily: undefined,
            before: meta,
            resume: undefined,
            tips: false,
            attempt: Date.now(),
          });
        }}
        onExit={() => setSetup(undefined)}
        onSave={(run) => storeRun(userId, run)}
        onForget={() => forgetRun(userId)}
        onRecover={() => {
          const kept = readRun(userId);
          if (kept) resume(kept);
          else setSetup(undefined);
        }}
        inCall={inCall}
      />
    );
  }

  if (panel) {
    return (
      <div className={css.Page}>
        <div className={css.Inner}>
          {panel === 'controls' ? (
            <ControlsPanel
              controls={controls}
              onChange={setControls}
              onClose={() => setPanel(undefined)}
              touch={!!TOUCH}
              inCall={inCall}
            />
          ) : (
            <StatsPanel
              // The hero picked, with the upgrades bought: how a run starts.
              stats={runStats(createRun(0, meta.character, meta.upgrades))}
              title={tr('games.horde.stats_of', 'Stats of {{hero}}', {
                hero: characterLabel(meta.character).name,
              })}
              onClose={() => setPanel(undefined)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={css.Page}>
      <div className={css.Inner}>
        <div className={css.Header}>
          <button
            type="button"
            className={css.IconButton}
            onClick={onBack}
            aria-label={tr('games.action.back', 'Back')}
          >
            <Icon size="200" src={Icons.ArrowLeft} />
          </button>
          <div className={css.Grow}>
            <h1 className={css.Title}>BrazilianBonk</h1>
            <p className={css.Subtitle}>
              {tr(
                'games.horde.subtitle',
                'Survive {{minutes}} minutes of horde and take down the boss. Weapons attack by themselves.',
                { minutes: RUN_SECONDS / 60 }
              )}
            </p>
          </div>
          <span className={css.GoldPill}>🪙 {meta.gold}</span>
        </div>

        <h2 className={css.SectionTitle}>{tr('games.horde.pick_hero', 'Hero')}</h2>
        <div className={css.Cards}>
          {CHARACTER_IDS.map((id) => {
            const label = characterLabel(id);
            return (
              <button
                key={id}
                type="button"
                className={css.Card}
                data-selected={meta.character === id}
                onClick={() => pickCharacter(id)}
              >
                <span
                  className={css.CardSprite}
                  style={{ backgroundImage: `url(${HERO_SPRITES[id]})` }}
                />
                <span className={css.CardName}>{label.name}</span>
                <span className={css.CardText}>{label.text}</span>
                <MasteryTag kills={meta.heroes[id].kills} />
              </button>
            );
          })}
        </div>

        {saved && (
          <button type="button" className={css.PlayButton} onClick={() => resume(saved)}>
            {tr('games.horde.continue', 'Continue run ({{hero}}, {{time}})', {
              hero: characterLabel(saved.character).name,
              time: formatTime(saved.time),
            })}
          </button>
        )}
        <button
          type="button"
          className={saved ? css.PlainButton : css.PlayButton}
          onClick={startRun}
        >
          {saved
            ? tr('games.horde.start_new', 'Start a new run (the one above is lost)')
            : tr('games.horde.start', 'Start run')}
        </button>
        <div className={css.DailyCard}>
          <span
            className={css.RankSprite}
            style={{ backgroundImage: `url(${HERO_SPRITES[daily.character]})` }}
          />
          <span className={css.DailyText}>
            <strong>{tr('games.horde.daily', 'Daily challenge')}</strong>
            <span className={css.CardText}>
              {tr(
                'games.horde.daily_text',
                'Everyone plays the same run today with {{hero}}, no upgrades. Only your first try counts.',
                { hero: characterLabel(daily.character).name }
              )}
            </span>
          </span>
          <button type="button" className={css.PlainButton} onClick={startDailyRun}>
            {dailyTried
              ? tr('games.horde.daily_practice', 'Practice')
              : tr('games.horde.daily_play', 'Play the challenge')}
          </button>
        </div>
        {unlocked > 0 && (
          <div className={css.PanelRow}>
            {Array.from({ length: unlocked + 1 }, (_, t) => (
              <button
                key={t}
                type="button"
                className={css.PlainButton}
                data-selected={Math.min(tier, unlocked) === t}
                onClick={() => setTier(t)}
              >
                {t === 0
                  ? tr('games.horde.tier_normal', 'Normal')
                  : tr('games.horde.tier', 'Tier {{tier}} (+{{difficulty}}% difficulty)', {
                      tier: t,
                      difficulty: Math.round(t * TIER_DIFFICULTY * 100),
                    })}
              </button>
            ))}
          </div>
        )}
        <HelpText controls={controls} />
        <div className={css.PanelRow}>
          <button type="button" className={css.PlainButton} onClick={() => setPanel('stats')}>
            {tr('games.horde.stats', 'Stats')}
          </button>
          <button type="button" className={css.PlainButton} onClick={() => setPanel('controls')}>
            {tr('games.horde.controls', 'Controls')}
          </button>
        </div>

        {meta.runs > 0 && (
          <div className={css.Records}>
            <span>{tr('games.horde.record.runs', 'Runs: {{count}}', { count: meta.runs })}</span>
            <span>{tr('games.horde.record.wins', 'Wins: {{count}}', { count: meta.wins })}</span>
            <span>
              {tr('games.horde.record.time', 'Best time: {{time}}', {
                time: formatTime(meta.bestTime),
              })}
            </span>
            <span>
              {tr('games.horde.record.kills', 'Most kills: {{count}}', { count: meta.bestKills })}
            </span>
          </div>
        )}

        <h2 className={css.SectionTitle}>
          {tr('games.horde.achievements', 'Achievements ({{done}}/{{all}})', {
            done: ACHIEVEMENTS.filter((a) => isDone(a, progress)).length,
            all: ACHIEVEMENTS.length,
          })}
        </h2>
        <div className={css.Achievements}>
          {ACHIEVEMENTS.map((a) => {
            const label = achievementLabel(a.id, a.goal);
            const value = Math.max(0, a.value(progress));
            const done = isDone(a, progress);
            return (
              <div key={a.id} className={css.Achievement} data-done={done}>
                <span className={css.StatLine}>
                  <span>{done ? '🏅' : '🔒'}</span>
                  <span className={css.Grow}>{label.name}</span>
                  <span className={css.StatNumber}>
                    {Math.min(value, a.goal)}/{a.goal}
                  </span>
                </span>
                <span className={css.StatHelp}>
                  {label.text}
                  {a.unlocks &&
                    ` · ${tr('games.horde.unlocks', 'Unlocks {{thing}}', {
                      thing: unlockName(a.unlocks),
                    })}`}
                </span>
                <span className={css.ProgressBar}>
                  <span style={{ width: `${Math.min(1, value / a.goal) * 100}%` }} />
                </span>
              </div>
            );
          })}
        </div>

        {online === true && (
          <>
            <h2 className={css.SectionTitle}>{tr('games.horde.ranking', 'Ranking')}</h2>
            <div className={css.PanelRow}>
              {(
                [
                  [{ scope: 'all' }, tr('games.horde.rank_all', 'All time')],
                  [{ scope: 'week' }, tr('games.horde.rank_week', 'This week')],
                  [
                    { scope: 'all', hero: meta.character },
                    tr('games.horde.rank_hero', 'With {{hero}}', {
                      hero: characterLabel(meta.character).name,
                    }),
                  ],
                  [{ scope: 'daily', day: daily.day }, tr('games.horde.rank_daily', 'Today')],
                ] as [RankingQuery, string][]
              ).map(([query, name]) => (
                <button
                  key={name}
                  type="button"
                  className={css.PlainButton}
                  data-selected={
                    rankingQuery.scope === query.scope && rankingQuery.hero === query.hero
                  }
                  onClick={() => showRanking(query)}
                >
                  {name}
                </button>
              ))}
            </div>
            {watchError && (
              <p className={css.Hint}>
                {tr(
                  'games.horde.watch_error',
                  "This run can't be watched (it was played on another version of the game)."
                )}
              </p>
            )}
            {ranking && ranking.length === 0 && (
              <p className={css.Hint}>{tr('games.horde.rank_empty', 'No runs here yet.')}</p>
            )}
            {ranking && ranking.length > 0 && (
              <ol className={css.Ranking}>
                {ranking.map((row, index) => (
                  <li key={row.userId} className={css.RankRow} data-me={row.userId === userId}>
                    <span className={css.RankPlace}>{index + 1}</span>
                    <span
                      className={css.RankSprite}
                      style={{ backgroundImage: `url(${HERO_SPRITES[row.character]})` }}
                    />
                    <span className={css.RankName}>
                      {nameOf?.(row.userId) ?? row.userId}
                      {row.build && (
                        <span className={css.RankBuild}>
                          {[...row.build.weapons, ...row.build.boletos].map((item) => {
                            const it = buildItemLabel(item);
                            return (
                              <span key={item} data-evolved={it.evolved}>
                                <PixelIcon art={it.art} emoji={it.icon} />
                                <sub>{it.level}</sub>
                              </span>
                            );
                          })}
                        </span>
                      )}
                    </span>
                    {!!row.tier && <span className={css.RankStat}>T{row.tier}</span>}
                    {row.verified && (
                      <span
                        className={css.RankStat}
                        title={tr('games.horde.rank_verified', 'Checked by replaying it')}
                      >
                        ✓
                      </span>
                    )}
                    {row.won && <span title={tr('games.horde.rank_won', 'Beat the boss')}>🏆</span>}
                    <span className={css.RankStat}>💀 {row.kills}</span>
                    <span className={css.RankStat}>{formatTime(row.seconds)}</span>
                    {row.hasReplay && (
                      <button
                        type="button"
                        className={css.SmallButton}
                        onClick={() => watchRun(row)}
                        title={tr('games.horde.watch', 'Watch this run')}
                      >
                        ▶
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </>
        )}

        <h2 className={css.SectionTitle}>{tr('games.horde.meta_title', 'Permanent upgrades')}</h2>
        {online === false && (
          <p className={css.Offline}>
            {tr(
              'games.horde.offline',
              'No connection to the server. You can still play: runs are kept here and counted when it comes back. Upgrades can only be bought online.'
            )}
          </p>
        )}
        <div className={css.Cards}>
          {META_IDS.map((id) => {
            const label = metaLabel(id);
            const level = meta.upgrades[id];
            const maxed = level >= META_UPGRADES[id].max;
            const cost = metaCost(id, level);
            return (
              <button
                key={id}
                type="button"
                className={css.Card}
                disabled={maxed || meta.gold < cost || !canBuy}
                onClick={() => buy(id)}
              >
                <span className={css.CardIcon}>
                  <PixelIcon art={label.art} emoji={label.icon} />
                </span>
                <span className={css.CardName}>
                  {label.name} {level}/{META_UPGRADES[id].max}
                </span>
                <span className={css.CardText}>{label.text}</span>
                <span className={css.CardTag}>
                  {maxed ? tr('games.horde.meta_max', 'Maxed') : `🪙 ${cost}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
