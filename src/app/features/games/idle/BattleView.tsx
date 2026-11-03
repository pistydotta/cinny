import React, { useEffect, useRef } from 'react';
import { getClass } from './engine/classes';
import { liveStats } from './engine/combat';
import { rarityRank } from './engine/items';
import { Fighter, GameState, Side, SpecId } from './engine/types';
import { KILLS_PER_STAGE, isBossStage, loopOf, zoneOf } from './engine/zones';
import { formatBig } from './format';
import { AttackLook, BattleFx } from './fx/battleFx';
import { FxEngine } from './fx/fxEngine';
import { RARITY_COLOR, fighterName, itemName, rarityName, zoneName } from './labels';
import { LogEntry, IdleRunner } from './runner';
import { logText } from './logText';
import { LootFeed } from './LootFeed';
import * as css from './idle.css';
import { tr } from '../../translation/tr';

const PETS: Partial<Record<SpecId, string>> = {
  beastmaster: '🐺',
  druid: '🌳',
  necromancer: '💀',
};

const attackLook = (s: GameState): AttackLook => {
  const spec = s.hero.specId;
  switch (s.hero.classId) {
    case 'archer':
      return { ranged: true, color: spec === 'sniper' ? '#e8ff9e' : '#d6f5b0' };
    case 'mage':
      return { ranged: true, color: spec === 'cryomancer' ? '#9fe6ff' : '#ff8a3d' };
    case 'occultist':
      return { ranged: true, color: spec === 'necromancer' ? '#cfd8dc' : '#b388ff' };
    case 'cleric':
      return { ranged: false, color: spec === 'druid' ? '#8be28f' : '#ffe38a' };
    case 'rogue':
      return { ranged: false, color: spec === 'venomblade' ? '#7fe05a' : '#c79bff' };
    default:
      return { ranged: false, color: spec === 'berserker' ? '#ff5a4f' : '#ffd59e' };
  }
};

function HpBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={css.Bar} style={{ height: 10 }}>
      <div className={css.BarFill} style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

type FighterViewProps = {
  fighter?: Fighter;
  side: Side;
  boss?: boolean;
  respawnMs?: number;
  pet?: string;
  iconRef: React.Ref<HTMLSpanElement>;
};

function FighterView({ fighter, side, boss, respawnMs, pet, iconRef }: FighterViewProps) {
  if (!fighter) {
    return (
      <div className={css.FighterCard}>
        <span className={css.FighterIcon} data-down="true" ref={iconRef}>
          {side === 'hero' && respawnMs ? '🪦' : '…'}
        </span>
        <span className={css.Muted}>
          {respawnMs
            ? tr('games.idle.respawn', 'Back up in {{sec}}s', { sec: Math.ceil(respawnMs / 1000) })
            : tr('games.idle.searching', 'Looking for a fight…')}
        </span>
      </div>
    );
  }

  const stats = liveStats(fighter);
  const skill = fighter.skills[0];
  const skillReady = skill
    ? 1 - skill.ms / (skill.def.cooldownMs * (1 - fighter.stats.cooldownReduction))
    : 0;
  const cursed = fighter.buffs.some((b) => Object.values(b.mods).some((v) => (v ?? 0) < 0));

  return (
    <div className={css.FighterCard}>
      {boss && <span className={css.BossTag}>{tr('games.idle.boss', 'Boss')}</span>}
      <span className={css.FighterBob} style={{ position: 'relative' }}>
        <span
          className={css.FighterIcon}
          data-down={fighter.hp <= 0}
          data-boss={!!boss}
          ref={iconRef}
        >
          {fighter.icon}
        </span>
        {pet && fighter.hp > 0 && <span className={css.PetIcon}>{pet}</span>}
      </span>
      <span className={css.FighterName}>
        {fighterName(fighter.name)} ·{' '}
        {tr('games.idle.lv', 'Lv {{level}}', { level: fighter.level })}
      </span>
      <div className={css.HpWrap}>
        <HpBar
          value={fighter.hp}
          max={fighter.stats.maxHp}
          color={
            side === 'hero'
              ? 'linear-gradient(90deg, #2fbf4f, #7dff8f)'
              : 'linear-gradient(90deg, #d93b2f, #ff7a6b)'
          }
        />
        {fighter.shield > 0 && (
          <HpBar value={fighter.shield} max={fighter.stats.maxHp} color="#9ecbff" />
        )}
        <div className={css.HpText}>
          {formatBig(Math.ceil(fighter.hp))} / {formatBig(fighter.stats.maxHp)}
        </div>
        {skill && (
          <div className={css.Bar} title={tr('games.idle.skill_bar', 'Skill')}>
            <div
              className={css.BarFill}
              style={{
                width: `${Math.max(0, Math.min(1, skillReady)) * 100}%`,
                background: 'linear-gradient(90deg, #7b5cff, #d4b8ff)',
              }}
            />
          </div>
        )}
        <div className={css.HpText}>
          {tr('games.idle.dps_line', '{{dmg}} dmg · {{speed}}/s', {
            dmg: formatBig(stats.damage),
            speed: stats.attackSpeed.toFixed(2).replace('.', ','),
          })}
          {fighter.stunMs > 0 && ` · 💫 ${tr('games.idle.stunned', 'stunned')}`}
          {cursed && ` · 🕸️ ${tr('games.idle.cursed', 'weakened')}`}
          {fighter.dots.length > 0 && ' · ☣️'}
        </div>
      </div>
    </div>
  );
}

type BattleViewProps = {
  state: GameState;
  log: LogEntry[];
  runner: IdleRunner;
  onAutoAdvance: (on: boolean) => void;
  onGoToStage: (stage: number) => void;
};

export function BattleView({ state, log, runner, onAutoAdvance, onGoToStage }: BattleViewProps) {
  const zone = zoneOf(state.stage);
  const loop = loopOf(state.stage);
  const boss = isBossStage(state.stage);
  const logRef = useRef<HTMLDivElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLSpanElement>(null);
  const foeRef = useRef<HTMLSpanElement>(null);
  const fxRef = useRef<FxEngine>();
  const stateRef = useRef(state);
  stateRef.current = state;

  // Between two fights there's a tick with no battle: keep showing the last one, foe down,
  // instead of flashing an empty arena.
  const lastBattle = useRef(state.battle);
  if (state.battle) lastBattle.current = state.battle;
  if (state.respawnMs > 0) lastBattle.current = null;
  const battle = state.battle ?? lastBattle.current;
  const lastId = log[log.length - 1]?.id;

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  // The effects run outside React: events go straight from the runner to the canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    const arena = arenaRef.current;
    if (!canvas || !arena) return undefined;
    let fx: FxEngine;
    try {
      fx = new FxEngine(canvas);
    } catch {
      return undefined;
    }
    fxRef.current = fx;
    fx.shakeTarget = stageRef.current;
    const center = (el: HTMLElement | null, fallback: number) => {
      const box = arena.getBoundingClientRect();
      if (!el) return { x: box.width * fallback, y: box.height * 0.55 };
      const r = el.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
    };
    const battleFx = new BattleFx(
      fx,
      () => ({
        hero: center(heroRef.current, 0.25),
        foe: center(foeRef.current, 0.75),
        heroEl: heroRef.current,
        foeEl: foeRef.current,
      }),
      () => attackLook(stateRef.current),
      {
        dodge: tr('games.idle.fx.dodge', 'Dodged'),
        level: (n) => tr('games.idle.fx.level', 'Level {{level}}!', { level: n }),
        stage: (n) => tr('games.idle.stage', 'Stage {{stage}}', { stage: n }),
      }
    );
    const resize = () => {
      const r = arena.getBoundingClientRect();
      fx.resize(r.width, r.height);
    };
    resize();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : undefined;
    observer?.observe(arena);
    fx.start();
    const off = runner.onEvents((events, span) => battleFx.play(events, span));
    return () => {
      off();
      observer?.disconnect();
      fx.stop();
      fxRef.current = undefined;
    };
  }, [runner]);

  useEffect(() => {
    fxRef.current?.setAmbient(zone.ambient);
  }, [zone.ambient]);

  const great = [...state.loot]
    .reverse()
    .find((l) => l.fate === 'kept' && (l.better || rarityRank(l.item.rarity) >= 3));
  const showDrop = great && state.lifetime.playMs - great.at < 8000 ? great : undefined;
  const pet = battle?.hero.stats.petPower ? PETS[state.hero.specId as SpecId] ?? '🦅' : undefined;
  const cls = getClass(state.hero.classId);

  return (
    <div className={css.BattleColumns}>
      <div
        className={css.Arena}
        ref={arenaRef}
        style={{
          background: `radial-gradient(ellipse at 50% 120%, ${zone.sky[0]} 0%, ${zone.sky[1]} 70%)`,
        }}
      >
        <canvas className={css.FxCanvas} ref={canvasRef} aria-hidden />
        <div className={`${css.StageLine} ${css.ArenaTop}`}>
          <div>
            <div className={css.StageName}>
              {zone.icon} {zoneName(zone.id)}
              {loop > 0 && ` +${loop}`}
            </div>
            <div className={css.Muted}>
              {tr('games.idle.stage', 'Stage {{stage}}', { stage: state.stage })}
              {' · '}
              {boss
                ? tr('games.idle.boss_stage', 'Boss stage')
                : tr('games.idle.kills', '{{kills}}/{{total}} defeated', {
                    kills: state.kills,
                    total: KILLS_PER_STAGE,
                  })}
            </div>
          </div>
          <div className={css.Row}>
            {state.stage < state.maxStage && (
              <button
                type="button"
                className={css.GhostButton}
                onClick={() => onGoToStage(state.maxStage)}
              >
                {tr('games.idle.go_max', 'Go to stage {{stage}}', { stage: state.maxStage })}
              </button>
            )}
            <button
              type="button"
              className={state.autoAdvance ? css.Button : css.GhostButton}
              aria-pressed={state.autoAdvance}
              onClick={() => onAutoAdvance(!state.autoAdvance)}
            >
              {state.autoAdvance
                ? tr('games.idle.advancing', 'Advancing ▶')
                : tr('games.idle.farming', 'Farming ⟳')}
            </button>
          </div>
        </div>

        <div className={css.ArenaTop}>
          {!boss && (
            <div className={css.Bar}>
              <div
                className={css.BarFill}
                style={{
                  width: `${(state.kills / KILLS_PER_STAGE) * 100}%`,
                  background: '#f5c84b',
                }}
              />
            </div>
          )}
          {state.battle?.timeLimitMs !== undefined && (
            <div className={css.Muted} style={{ marginTop: 4 }}>
              ⏱️{' '}
              {tr('games.idle.boss_timer', 'Time left: {{sec}}s', {
                sec: Math.max(
                  0,
                  Math.ceil((state.battle.timeLimitMs - state.battle.elapsedMs) / 1000)
                ),
              })}
            </div>
          )}
        </div>

        <div className={css.Stage} ref={stageRef}>
          <div className={css.Ground} />
          <div className={css.Versus}>
            <FighterView
              fighter={battle?.hero}
              side="hero"
              respawnMs={state.respawnMs}
              pet={pet}
              iconRef={heroRef}
            />
            <span className={css.VsMark}>VS</span>
            <FighterView fighter={battle?.foe} side="foe" boss={battle?.boss} iconRef={foeRef} />
          </div>
        </div>

        {showDrop && (
          <div
            className={css.DropBanner}
            style={{ borderColor: RARITY_COLOR[showDrop.item.rarity] }}
          >
            <span style={{ fontSize: 28 }}>{showDrop.item.icon}</span>
            <span className={css.Grow}>
              <span className={css.Strong} style={{ color: RARITY_COLOR[showDrop.item.rarity] }}>
                {itemName(showDrop.item)}
              </span>
              <span className={css.Mini} style={{ display: 'block' }}>
                {rarityName(showDrop.item.rarity)}
                {showDrop.better &&
                  ` · ▲ ${tr('games.idle.drop_better', 'Better than what you wear!')}`}
              </span>
            </span>
          </div>
        )}
        {!state.autoAdvance && (
          <p className={`${css.Muted} ${css.ArenaTop}`} style={{ margin: 0 }}>
            {tr(
              'games.idle.farming_hint',
              'Farming this stage. Turn on Advancing when you feel strong enough.'
            )}
          </p>
        )}
        <span className={`${css.Mini} ${css.ArenaTop}`} style={{ color: cls.color }}>
          {tr(
            'games.idle.combat_hint',
            'Talents, the forge and gear make your hero stronger. Stuck on a boss? Farm a little and come back.'
          )}
        </span>
      </div>

      <div className={css.Panel}>
        <h2 className={css.PanelTitle}>✨ {tr('games.idle.feed_title', 'Recent finds')}</h2>
        <LootFeed loot={state.loot} now={state.lifetime.playMs} limit={8} />
        <div className={css.Divider} />
        <h2 className={css.PanelTitle}>{tr('games.idle.log_title', 'Battle log')}</h2>
        <div className={css.Log} ref={logRef}>
          {log.length === 0 && (
            <span className={css.Muted}>
              {tr('games.idle.log_empty', 'The fight is starting…')}
            </span>
          )}
          {log.map((entry) => {
            const line = logText(entry.event);
            if (!line) return null;
            return (
              <span key={entry.id} className={css.LogLine} data-tone={line.tone}>
                {line.text}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
