import React, { useState } from 'react';
import { canRebirth } from './engine/actions';
import { ALTAR, altarCost, ashesFor, rebirthStage, startStage } from './engine/prestige';
import { GameState } from './engine/types';
import { altarDesc, altarName } from './labels';
import * as css from './idle.css';
import { tr } from '../../translation/tr';

type RebirthViewProps = {
  state: GameState;
  error?: string;
  onRebirth: () => void;
  onBuy: (id: string) => void;
};

export function RebirthView({ state, error, onRebirth, onBuy }: RebirthViewProps) {
  const [confirm, setConfirm] = useState(false);
  const p = state.prestige;
  const need = rebirthStage(p.rebirths);
  const ready = canRebirth(state);
  const ashes = ashesFor(state.maxStage);

  return (
    <div className={css.Columns}>
      <div className={css.Panel}>
        <div className={css.RebirthHero}>
          <h2 className={css.PanelTitle} style={{ fontSize: 18 }}>
            🔥 {tr('games.idle.rebirth', 'Rebirth')}
          </h2>
          <div className={css.Row}>
            <span className={css.Pill}>
              {tr('games.idle.rebirths', '{{count}} rebirths', { count: p.rebirths })}
            </span>
            <span className={css.Pill} style={{ color: '#ffb06b' }}>
              ✴️ {tr('games.idle.ashes', '{{count}} ashes', { count: p.ashes })}
            </span>
          </div>
          <span className={css.Muted}>
            {tr(
              'games.idle.rebirth_hint',
              'Burn this run to be reborn stronger. You go back to level 1 and stage {{start}}; talents, gold and training reset. You keep your gear, the forge, materials, your specialization and everything from the altar. Each rebirth asks for a deeper stage.',
              { start: startStage(p, state.lifetime.bestStage) }
            )}
          </span>
          <div className={css.Row} style={{ justifyContent: 'space-between' }}>
            <span>{tr('games.idle.rebirth_need', 'Needs stage {{stage}}', { stage: need })}</span>
            <span className={css.StatValue} style={{ color: ready ? '#8be28f' : '#ff8a80' }}>
              {tr('games.idle.rebirth_now', 'This run: {{stage}}', { stage: state.maxStage })}
            </span>
          </div>
          <div className={css.Bar}>
            <div
              className={css.BarFill}
              style={{
                width: `${Math.min(100, (state.maxStage / need) * 100)}%`,
                background: 'linear-gradient(90deg, #ff5a1f, #ffd36b)',
              }}
            />
          </div>
          <span className={css.Strong}>
            {ready
              ? tr('games.idle.rebirth_gain', 'Rebirth now for {{ashes}} ashes', { ashes })
              : tr('games.idle.rebirth_preview', 'At stage {{stage}} it pays {{ashes}} ashes', {
                  stage: need,
                  ashes: ashesFor(need),
                })}
          </span>
          {confirm ? (
            <div className={css.Row}>
              <button
                type="button"
                className={css.DangerButton}
                onClick={() => {
                  onRebirth();
                  setConfirm(false);
                }}
              >
                {tr('games.idle.rebirth_yes', 'Yes, be reborn')}
              </button>
              <button type="button" className={css.GhostButton} onClick={() => setConfirm(false)}>
                {tr('games.idle.rebirth_no', 'Not yet')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={css.Button}
              disabled={!ready}
              onClick={() => setConfirm(true)}
            >
              🔥 {tr('games.idle.rebirth_go', 'Be reborn')}
            </button>
          )}
          <span className={css.Mini}>
            {tr(
              'games.idle.rebirth_more',
              'The deeper the run, the more ashes: going past the minimum pays.'
            )}
          </span>
        </div>
        {error && <p className={css.ErrorText}>{error}</p>}
      </div>

      <div className={css.Panel}>
        <h2 className={css.PanelTitle}>⛩️ {tr('games.idle.altar_title', 'Altar of Ashes')}</h2>
        <span className={css.Muted}>
          {tr('games.idle.altar_hint', 'Bonuses that last forever, through every rebirth.')}
        </span>
        <div className={css.List}>
          {ALTAR.map((a) => {
            const level = p.altar[a.id] ?? 0;
            const maxed = a.max !== undefined && level >= a.max;
            const cost = altarCost(a, level);
            return (
              <div key={a.id} className={css.ListItem}>
                <span className={css.ListIcon}>{a.icon}</span>
                <div className={css.Grow}>
                  <div className={css.Strong}>
                    {altarName(a.id)}{' '}
                    <span className={css.Muted}>
                      {tr('games.idle.lv', 'Lv {{level}}', { level })}
                      {a.max !== undefined && `/${a.max}`}
                    </span>
                  </div>
                  <div className={css.Muted}>{altarDesc(a.id)}</div>
                </div>
                <button
                  type="button"
                  className={css.Button}
                  disabled={maxed || p.ashes < cost}
                  onClick={() => onBuy(a.id)}
                >
                  {maxed ? tr('games.idle.maxed', 'Max') : `✴️ ${cost}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
