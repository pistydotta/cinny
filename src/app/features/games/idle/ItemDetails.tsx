import React from 'react';
import { Item, ModKey } from './engine/types';
import { formatBig, formatMod } from './format';
import { elementName, itemName, RARITY_COLOR, rarityName, slotName, statName } from './labels';
import * as css from './idle.css';
import { tr } from '../../translation/tr';

type ItemDetailsProps = {
  item: Item;
  /** The piece it would replace, to show what changes. */
  compare?: Item;
  /** Charms: how many neighbors of the same element. */
  links?: number;
  children?: React.ReactNode;
};

export function ItemDetails({ item, compare, links, children }: ItemDetailsProps) {
  const color = RARITY_COLOR[item.rarity];
  const keys = Array.from(
    new Set([...Object.keys(item.mods), ...Object.keys(compare?.mods ?? {})])
  ) as ModKey[];

  return (
    <div className={css.ItemBox} style={{ borderColor: color }}>
      <span className={css.ItemName} style={{ color }}>
        {item.icon} {itemName(item.baseId)}
      </span>
      <span className={css.Muted}>
        {rarityName(item.rarity)} · {slotName(item.kind)} ·{' '}
        {tr('games.idle.item_level', 'Level {{level}}', { level: item.level })}
        {item.element && ` · ${elementName(item.element)}`}
      </span>
      {keys.map((key) => {
        const mine = item.mods[key] ?? 0;
        const theirs = compare ? compare.mods[key] ?? 0 : mine;
        let diff: string | undefined;
        if (mine > theirs) diff = 'up';
        if (mine < theirs) diff = 'down';
        return (
          <span key={key} className={css.ModLine} data-diff={diff}>
            <span>{statName(key)}</span>
            <span>{mine === 0 ? '—' : formatMod(key, mine)}</span>
          </span>
        );
      })}
      {item.kind === 'charm' && (
        <span className={css.Muted}>
          {tr(
            'games.idle.charm_hint',
            'Works while in the backpack. +25% for each touching {{element}} charm.',
            { element: item.element ? elementName(item.element) : '' }
          )}
          {links ? ` ${tr('games.idle.charm_links', 'Now: +{{pct}}%', { pct: links * 25 })}` : ''}
        </span>
      )}
      <span className={css.Muted}>
        {tr('games.idle.sells_for', 'Sells for {{gold}} gold', { gold: formatBig(item.value) })}
      </span>
      {children}
    </div>
  );
}
