import React from 'react';
import { UPGRADES, upgradeCost } from './engine/progress';
import { GameState } from './engine/types';
import { formatBig } from './format';
import { upgradeDesc, upgradeName } from './labels';
import * as css from './idle.css';
import { tr } from '../../translation/tr';

type UpgradesViewProps = {
  state: GameState;
  onBuy: (id: string) => void;
};

export function UpgradesView({ state, onBuy }: UpgradesViewProps) {
  return (
    <div className={css.Panel}>
      <h2 className={css.PanelTitle}>{tr('games.idle.upgrades', 'Training')}</h2>
      <span className={css.Muted}>
        {tr(
          'games.idle.upgrades_hint',
          'Spend gold on permanent bonuses. Each level costs more than the last.'
        )}
      </span>
      <div className={css.List}>
        {UPGRADES.map((u) => {
          const level = state.upgrades[u.id] ?? 0;
          const maxed = u.max !== undefined && level >= u.max;
          const cost = upgradeCost(u, level);
          return (
            <div key={u.id} className={css.ListItem}>
              <span className={css.ListIcon}>{u.icon}</span>
              <div className={css.Grow}>
                <div className={css.Strong}>
                  {upgradeName(u.id)}{' '}
                  <span className={css.Muted}>
                    {tr('games.idle.lv', 'Lv {{level}}', { level })}
                    {u.max !== undefined && `/${u.max}`}
                  </span>
                </div>
                <div className={css.Muted}>{upgradeDesc(u.id)}</div>
              </div>
              <button
                type="button"
                className={css.Button}
                disabled={maxed || state.gold < cost}
                onClick={() => onBuy(u.id)}
              >
                {maxed ? tr('games.idle.maxed', 'Max') : `🪙 ${formatBig(cost)}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
