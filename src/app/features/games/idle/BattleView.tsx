import React, { useEffect, useRef } from 'react';
import { liveStats } from './engine/combat';
import { Fighter, GameEvent, GameState, Side } from './engine/types';
import { KILLS_PER_STAGE, isBossStage, loopOf, zoneOf } from './engine/zones';
import { formatBig } from './format';
import { fighterName, zoneName } from './labels';
import { LogEntry } from './runner';
import { logText } from './logText';
import * as css from './idle.css';
import { tr } from '../../translation/tr';

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
  recent: GameEvent[];
  boss?: boolean;
  respawnMs?: number;
};

function FighterView({ fighter, side, recent, boss, respawnMs }: FighterViewProps) {
  const other: Side = side === 'hero' ? 'foe' : 'hero';
  const hits = recent.filter((e) => (e.t === 'hit' || e.t === 'skill') && e.from === other);
  const lastHit = hits[hits.length - 1];
  const taken = hits.reduce((sum, e) => sum + (e.t === 'hit' || e.t === 'skill' ? e.amount : 0), 0);

  if (!fighter) {
    return (
      <div className={css.FighterCard}>
        <span className={css.FighterIcon} data-down="true">
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
  const skillReady = fighter.skill
    ? 1 - fighter.skillMs / (fighter.skill.cooldownMs * (1 - fighter.stats.cooldownReduction))
    : 0;

  return (
    <div className={css.FighterCard}>
      {boss && <span className={css.BossTag}>{tr('games.idle.boss', 'Boss')}</span>}
      <span className={css.FighterIcon} data-hit={!!lastHit} data-down={fighter.hp <= 0}>
        {fighter.icon}
      </span>
      <span className={css.FighterName}>
        {fighterName(fighter.name)} ·{' '}
        {tr('games.idle.lv', 'Lv {{level}}', { level: fighter.level })}
      </span>
      <div className={css.HpWrap}>
        <HpBar
          value={fighter.hp}
          max={fighter.stats.maxHp}
          color={side === 'hero' ? '#4cd964' : '#ff5a4f'}
        />
        {fighter.shield > 0 && (
          <HpBar value={fighter.shield} max={fighter.stats.maxHp} color="#9ecbff" />
        )}
        <div className={css.HpText}>
          {formatBig(Math.ceil(fighter.hp))} / {formatBig(fighter.stats.maxHp)}
          {taken > 0 && <span style={{ color: '#ff8a80' }}> −{formatBig(taken)}</span>}
        </div>
        {fighter.skill && (
          <div className={css.Bar} title={tr('games.idle.skill_bar', 'Skill')}>
            <div
              className={css.BarFill}
              style={{
                width: `${Math.max(0, Math.min(1, skillReady)) * 100}%`,
                background: '#b48cff',
              }}
            />
          </div>
        )}
        <div className={css.HpText}>
          {tr('games.idle.dps_line', '{{dmg}} dmg · {{speed}}/s', {
            dmg: formatBig(stats.damage),
            speed: stats.attackSpeed.toFixed(2).replace('.', ','),
          })}
          {fighter.stunMs > 0 && ` · ${tr('games.idle.stunned', 'stunned')}`}
        </div>
      </div>
    </div>
  );
}

type BattleViewProps = {
  state: GameState;
  log: LogEntry[];
  recent: GameEvent[];
  onAutoAdvance: (on: boolean) => void;
  onGoToStage: (stage: number) => void;
};

export function BattleView({ state, log, recent, onAutoAdvance, onGoToStage }: BattleViewProps) {
  const zone = zoneOf(state.stage);
  const loop = loopOf(state.stage);
  const boss = isBossStage(state.stage);
  const logRef = useRef<HTMLDivElement>(null);
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

  return (
    <div className={css.Columns}>
      <div
        className={css.Arena}
        style={{ background: `linear-gradient(180deg, ${zone.sky[0]}, ${zone.sky[1]})` }}
      >
        <div className={css.StageLine}>
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

        {!boss && (
          <div className={css.Bar}>
            <div
              className={css.BarFill}
              style={{ width: `${(state.kills / KILLS_PER_STAGE) * 100}%`, background: '#f5c84b' }}
            />
          </div>
        )}
        {state.battle?.timeLimitMs !== undefined && (
          <div className={css.Muted}>
            {tr('games.idle.boss_timer', 'Time left: {{sec}}s', {
              sec: Math.max(
                0,
                Math.ceil((state.battle.timeLimitMs - state.battle.elapsedMs) / 1000)
              ),
            })}
          </div>
        )}

        <div className={css.Versus}>
          <FighterView
            fighter={battle?.hero}
            side="hero"
            recent={recent}
            respawnMs={state.respawnMs}
          />
          <span className={css.VsMark}>VS</span>
          <FighterView fighter={battle?.foe} side="foe" recent={recent} boss={battle?.boss} />
        </div>
        {!state.autoAdvance && (
          <p className={css.Muted} style={{ margin: 0 }}>
            {tr(
              'games.idle.farming_hint',
              'Farming this stage. Turn on Advancing when you feel strong enough.'
            )}
          </p>
        )}
      </div>

      <div className={css.Panel}>
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
