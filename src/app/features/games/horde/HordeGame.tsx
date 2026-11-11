import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon, Icons } from 'folds';
import { CHARACTER_IDS, META_IDS, META_UPGRADES, RUN_SECONDS, metaCost } from './engine/data';
import { MetaSave, buyMeta, finishRun, runGold } from './engine/meta';
import { createRun } from './engine/run';
import { CharacterId, RunState } from './engine/types';
import { Hud, HordeRunner, loadMeta, saveMeta } from './runner';
import {
  characterLabel,
  choiceLabel,
  formatTime,
  metaLabel,
  passiveLabel,
  weaponLabel,
} from './labels';
import { HERO_SPRITES } from './sprites';
import * as css from './horde.css';
import { tr } from '../../translation/tr';

type Result = { won: boolean; time: number; kills: number; level: number; gold: number };

type HordeRunProps = {
  seed: number;
  meta: MetaSave;
  onEnd: (run: RunState) => void;
  onAgain: () => void;
  onExit: () => void;
};

const TOUCH = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

function HordeRun({ seed, meta, onEnd, onAgain, onExit }: HordeRunProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const runnerRef = useRef<HordeRunner>();
  const [hud, setHud] = useState<Hud>();
  const [result, setResult] = useState<Result>();
  const [failed, setFailed] = useState(false);
  // The run starts with the save as it was when Play was pressed; later saves don't restart it.
  const start = useRef({ seed, meta, onEnd });

  useEffect(() => {
    let cancelled = false;
    const { seed: runSeed, meta: runMeta, onEnd: end } = start.current;
    // three.js is big, so it only loads when a run starts.
    import('./render/scene')
      .then(({ HordeScene }) => {
        const canvas = canvasRef.current;
        const overlay = overlayRef.current;
        if (cancelled || !canvas || !overlay) return;
        const run = createRun(runSeed, runMeta.character, runMeta.upgrades);
        runnerRef.current = new HordeRunner(
          run,
          new HordeScene(canvas, run),
          overlay,
          setHud,
          (ended) => {
            setResult({
              won: ended.phase === 'won',
              time: ended.time,
              kills: ended.kills,
              level: ended.player.level,
              gold: runGold(ended),
            });
            end(ended);
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
                  {weaponLabel(w.id).icon}
                  <span className={css.SlotLevel}>{w.level}</span>
                </span>
              ))}
              {hud.passives.map((p) => (
                <span key={p.id} className={css.Slot} title={passiveLabel(p.id).name}>
                  {passiveLabel(p.id).icon}
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
            <span>
              {Math.ceil(hud.hp)} / {hud.maxHp}
            </span>
            <div className={css.HpBar}>
              <div className={css.HpFill} style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }} />
            </div>
          </div>

          {TOUCH && (
            <button
              type="button"
              className={css.DashButton}
              data-ready={hud.dash >= 1}
              onPointerDown={() => runner?.pressDash()}
            >
              {tr('games.horde.dash', 'Dash')}
            </button>
          )}
        </>
      )}

      {hud?.phase === 'choosing' && hud.choices && (
        <div className={css.Curtain}>
          <div className={css.Panel}>
            <h2 className={css.PanelTitle}>{tr('games.horde.choose', 'Choose an upgrade')}</h2>
            <div className={css.Cards}>
              {hud.choices.map((choice, index) => {
                const label = choiceLabel(choice);
                return (
                  <button
                    // The same offer can come again after a reroll, in another place.
                    // eslint-disable-next-line react/no-array-index-key
                    key={index}
                    type="button"
                    className={css.Card}
                    onClick={() => runner?.choose(index)}
                  >
                    <span className={css.CardIcon}>{label.icon}</span>
                    <span className={css.CardName}>{label.name}</span>
                    {label.tag && <span className={css.CardTag}>{label.tag}</span>}
                    <span className={css.CardText}>{label.text}</span>
                    {!TOUCH && <span className={css.KeyHint}>{index + 1}</span>}
                  </button>
                );
              })}
            </div>
            {hud.rerolls > 0 && (
              <div className={css.PanelRow}>
                <button type="button" className={css.PlainButton} onClick={() => runner?.reroll()}>
                  {tr('games.horde.reroll', '🎲 Reroll ({{count}})', { count: hud.rerolls })}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {hud?.paused && hud.phase === 'playing' && (
        <div className={css.Curtain}>
          <div className={css.Panel}>
            <h2 className={css.PanelTitle}>{tr('games.horde.paused', 'Paused')}</h2>
            <p className={css.Hint}>
              {TOUCH
                ? tr(
                    'games.horde.help_touch',
                    'Drag anywhere to move. Weapons attack by themselves.'
                  )
                : tr(
                    'games.horde.help_keys',
                    'WASD or arrows to move, Space to dash, Esc to pause. Weapons attack by themselves.'
                  )}
            </p>
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
              <button type="button" className={css.PlainButton} onClick={onExit}>
                {tr('games.horde.give_up', 'Give up the run')}
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
                ? tr('games.horde.won', 'The ember lives on!')
                : tr('games.horde.dead', 'The ember went out')}
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
            <div className={css.PanelRow}>
              <button type="button" className={css.PlayButton} onClick={onAgain}>
                {tr('games.horde.again', 'Play again')}
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
  onBack: () => void;
};

const newSeed = (): number => Math.floor(Math.random() * 4294967296);

export function HordeGame({ userId, onBack }: HordeGameProps) {
  const [meta, setMeta] = useState(() => loadMeta(userId));
  const [seed, setSeed] = useState<number>();

  const update = useCallback(
    (next: MetaSave) => {
      setMeta(next);
      saveMeta(userId, next);
    },
    [userId]
  );

  const metaRef = useRef(meta);
  metaRef.current = meta;
  const handleEnd = useCallback(
    (run: RunState) => update(finishRun(metaRef.current, run)),
    [update]
  );

  if (seed !== undefined) {
    return (
      <HordeRun
        key={seed}
        seed={seed}
        meta={meta}
        onEnd={handleEnd}
        onAgain={() => setSeed(newSeed())}
        onExit={() => setSeed(undefined)}
      />
    );
  }

  const pickCharacter = (character: CharacterId) => update({ ...meta, character });

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
            <h1 className={css.Title}>{tr('games.horde.title', 'Last Ember')}</h1>
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
              </button>
            );
          })}
        </div>

        <button type="button" className={css.PlayButton} onClick={() => setSeed(newSeed())}>
          {tr('games.horde.start', 'Start run')}
        </button>
        <p className={css.Hint}>
          {TOUCH
            ? tr('games.horde.help_touch', 'Drag anywhere to move. Weapons attack by themselves.')
            : tr(
                'games.horde.help_keys',
                'WASD or arrows to move, Space to dash, Esc to pause. Weapons attack by themselves.'
              )}
        </p>

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

        <h2 className={css.SectionTitle}>{tr('games.horde.meta_title', 'Permanent upgrades')}</h2>
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
                disabled={maxed || meta.gold < cost}
                onClick={() => {
                  const bought = buyMeta(meta, id);
                  if (bought) update(bought);
                }}
              >
                <span className={css.CardIcon}>{label.icon}</span>
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
