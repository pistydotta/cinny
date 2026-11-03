import React from 'react';
import { rarityRank } from './engine/items';
import { LootEntry } from './engine/types';
import { formatDuration } from './format';
import { RARITY_COLOR, itemName, rarityName } from './labels';
import * as css from './idle.css';
import { tr } from '../../translation/tr';

type LootFeedProps = {
  loot: LootEntry[];
  now: number;
  limit?: number;
};

/** The newest drops, the ones worth a look standing out. */
export function LootFeed({ loot, now, limit = 30 }: LootFeedProps) {
  const rows = loot.slice(-limit).reverse();
  if (rows.length === 0) {
    return (
      <span className={css.Muted}>
        {tr(
          'games.idle.feed_empty',
          'Nothing found yet. Enemies drop gear now and then, bosses always.'
        )}
      </span>
    );
  }
  return (
    <div className={css.Feed}>
      {rows.map((entry) => {
        const { item } = entry;
        const color = RARITY_COLOR[item.rarity];
        const great = entry.better || rarityRank(item.rarity) >= 3;
        return (
          <div
            key={`${item.id}-${entry.at}`}
            className={css.FeedRow}
            style={{ borderLeftColor: color }}
            data-great={great}
            data-gone={entry.fate !== 'kept'}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span className={css.Grow} style={{ color, fontWeight: 700 }}>
              {itemName(item)}
              <span className={css.Mini}>
                {' · '}
                {rarityName(item.rarity)} ·{' '}
                {tr('games.idle.lv', 'Lv {{level}}', { level: item.level })}
              </span>
            </span>
            {entry.better && entry.fate === 'kept' && (
              <span className={css.Badge} style={{ background: '#2e7d32', color: '#e8f5e9' }}>
                ▲ {tr('games.idle.feed_better', 'Better')}
              </span>
            )}
            {entry.fate !== 'kept' && (
              <span className={css.Badge} style={{ background: 'rgba(255,255,255,0.1)' }}>
                🔶 {tr('games.idle.feed_salvaged', 'Salvaged')}
              </span>
            )}
            <span className={css.Mini}>{formatDuration(Math.max(1000, now - entry.at))}</span>
          </div>
        );
      })}
    </div>
  );
}
