import React, { useEffect, useMemo, useState } from 'react';
import { salvageValue } from './engine/forge';
import { capacityOf, totalMods } from './engine/progress';
import { GameState, Rarity } from './engine/types';
import { formatBig } from './format';
import { ItemCard, ItemDetails } from './ItemDetails';
import { CATEGORIES, Category, SORTS, SortBy, inCategory, sortRows, withDeltas } from './itemView';
import { rarityName } from './labels';
import { LootFeed } from './LootFeed';
import * as css from './idle.css';
import { tr } from '../../translation/tr';

const CATEGORY_EN: Record<Category, string> = {
  all: 'All',
  upgrades: '▲ Upgrades',
  new: 'New',
  weapons: 'Weapons',
  armor: 'Armor',
  jewelry: 'Jewelry',
};
const SORT_EN: Record<SortBy, string> = {
  power: 'Best for you',
  rarity: 'Rarity',
  level: 'Level',
  recent: 'Newest',
};
const BULK: Rarity[] = ['common', 'uncommon', 'rare'];

type InventoryViewProps = {
  state: GameState;
  error?: string;
  onEquip: (id: string) => void;
  onEquipBest: () => void;
  onSell: (id: string) => void;
  onSalvage: (id: string) => void;
  onLock: (id: string) => void;
  onBulk: (rarity: Rarity, how: 'sell' | 'salvage') => void;
  onAutoSalvage: (rarity: Rarity | null) => void;
  onForge: (id: string) => void;
  onSeen: () => void;
};

export function InventoryView({
  state,
  error,
  onEquip,
  onEquipBest,
  onSell,
  onSalvage,
  onLock,
  onBulk,
  onAutoSalvage,
  onForge,
  onSeen,
}: InventoryViewProps) {
  const [category, setCategory] = useState<Category>('all');
  const [sortBy, setSortBy] = useState<SortBy>('power');
  const [selected, setSelected] = useState<string>();
  const [bulk, setBulk] = useState<Rarity>('common');

  // Leaving the screen marks what was found as seen.
  useEffect(() => () => onSeen(), [onSeen]);

  const count = state.inventory.length;
  // Deltas only change with the gear, not with every tick of the fight.
  const rows = useMemo(
    () => withDeltas(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.inventory, state.equipment, state.hero.level, state.hero.talents, state.upgrades]
  );
  const shown = sortRows(
    rows.filter((r) => inCategory(r, category)),
    sortBy
  );
  const picked = state.inventory.find((i) => i.id === selected);
  const salvageBonus = totalMods(state).salvageYield ?? 0;
  const upgrades = rows.filter((r) => r.delta > 0).length;

  return (
    <div className={css.Columns}>
      <div className={css.Panel}>
        <div className={css.Row} style={{ justifyContent: 'space-between' }}>
          <h2 className={css.PanelTitle}>🎒 {tr('games.idle.backpack', 'Backpack')}</h2>
          <span
            className={css.Pill}
            style={{ color: count >= capacityOf(state) ? '#ff8a80' : undefined }}
          >
            {count}/{capacityOf(state)}
          </span>
        </div>
        <div className={css.Chips}>
          {CATEGORIES.map((c) => {
            const n = rows.filter((r) => inCategory(r, c)).length;
            return (
              <button
                key={c}
                type="button"
                className={css.Chip}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {tr(`games.idle.category.${c}`, CATEGORY_EN[c])}
                {c !== 'all' && n > 0 && <span className={css.Mini}>{n}</span>}
              </button>
            );
          })}
        </div>
        <div className={css.Row}>
          <span className={css.Muted}>{tr('games.idle.sort', 'Sort')}</span>
          <select
            className={css.Select}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            aria-label={tr('games.idle.sort', 'Sort')}
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {tr(`games.idle.sort_by.${s}`, SORT_EN[s])}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={css.Button}
            disabled={upgrades === 0}
            onClick={onEquipBest}
            style={{ height: 30 }}
          >
            {tr('games.idle.equip_best', 'Equip the best ({{count}})', { count: upgrades })}
          </button>
        </div>
        {shown.length === 0 ? (
          <span className={css.Muted}>
            {count === 0
              ? tr('games.idle.backpack_empty', 'Empty. What enemies drop lands here.')
              : tr('games.idle.category_empty', 'Nothing here in this category.')}
          </span>
        ) : (
          <div className={css.ItemGrid}>
            {shown.map((r) => (
              <ItemCard
                key={r.item.id}
                item={r.item}
                delta={r.delta}
                selected={selected === r.item.id}
                onClick={() => setSelected(selected === r.item.id ? undefined : r.item.id)}
              />
            ))}
          </div>
        )}
        <span className={css.Mini}>
          {tr(
            'games.idle.backpack_hint',
            '▲ makes the hero stronger, ▼ weaker. Locked items are never sold or salvaged in bulk. When the backpack is full, new drops become ember stones.'
          )}
        </span>
        <div className={css.Divider} />
        <div className={css.Row}>
          <span className={css.Muted}>{tr('games.idle.bulk', 'Clean up up to')}</span>
          <select
            className={css.Select}
            value={bulk}
            onChange={(e) => setBulk(e.target.value as Rarity)}
            aria-label={tr('games.idle.bulk', 'Clean up up to')}
          >
            {BULK.map((r) => (
              <option key={r} value={r}>
                {rarityName(r)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={css.GhostButton}
            style={{ height: 30 }}
            onClick={() => onBulk(bulk, 'salvage')}
          >
            🔶 {tr('games.idle.salvage_all', 'Salvage')}
          </button>
          <button
            type="button"
            className={css.GhostButton}
            style={{ height: 30 }}
            onClick={() => onBulk(bulk, 'sell')}
          >
            🪙 {tr('games.idle.sell_all', 'Sell')}
          </button>
        </div>
        <div className={css.Row}>
          <span className={css.Muted}>
            {tr('games.idle.auto_salvage', 'Salvage drops on arrival')}
          </span>
          <select
            className={css.Select}
            value={state.settings.autoSalvage ?? ''}
            onChange={(e) => onAutoSalvage(e.target.value ? (e.target.value as Rarity) : null)}
            aria-label={tr('games.idle.auto_salvage', 'Salvage drops on arrival')}
          >
            <option value="">{tr('games.idle.auto_off', 'Off')}</option>
            {BULK.map((r) => (
              <option key={r} value={r}>
                {tr('games.idle.auto_up_to', 'Up to {{rarity}}', { rarity: rarityName(r) })}
              </option>
            ))}
          </select>
        </div>
        <span className={css.Mini}>
          {tr(
            'games.idle.bulk_hint',
            'Bulk and automatic salvage skip upgrades, forged and locked items.'
          )}
        </span>
      </div>

      <div className={css.Panel}>
        <h2 className={css.PanelTitle}>{tr('games.idle.selected', 'Selected item')}</h2>
        {picked ? (
          <ItemDetails item={picked} state={state} compare={state.equipment[picked.kind]}>
            <div className={css.Row}>
              <button
                type="button"
                className={css.Button}
                onClick={() => {
                  onEquip(picked.id);
                  setSelected(undefined);
                }}
              >
                {tr('games.idle.equip', 'Equip')}
              </button>
              <button type="button" className={css.GhostButton} onClick={() => onForge(picked.id)}>
                ⚒️ {tr('games.idle.to_forge', 'Forge')}
              </button>
              <button type="button" className={css.GhostButton} onClick={() => onLock(picked.id)}>
                {picked.locked
                  ? `🔓 ${tr('games.idle.unlock', 'Unlock')}`
                  : `🔒 ${tr('games.idle.lock', 'Lock')}`}
              </button>
            </div>
            {!picked.locked && (
              <div className={css.Row}>
                <button
                  type="button"
                  className={css.GhostButton}
                  onClick={() => {
                    onSalvage(picked.id);
                    setSelected(undefined);
                  }}
                >
                  🔶{' '}
                  {tr('games.idle.salvage_for', 'Salvage: {{stones}} stones', {
                    stones: salvageValue(picked, salvageBonus).stones,
                  })}
                  {salvageValue(picked, salvageBonus).cores > 0 &&
                    ` + ${salvageValue(picked, salvageBonus).cores} 🔥`}
                </button>
                <button
                  type="button"
                  className={css.DangerButton}
                  onClick={() => {
                    onSell(picked.id);
                    setSelected(undefined);
                  }}
                >
                  🪙{' '}
                  {tr('games.idle.sell_for', 'Sell: {{gold}}', { gold: formatBig(picked.value) })}
                </button>
              </div>
            )}
          </ItemDetails>
        ) : (
          <span className={css.Muted}>
            {tr('games.idle.nothing_selected', 'Pick an item to compare it with what you wear.')}
          </span>
        )}
        {error && <p className={css.ErrorText}>{error}</p>}
        <div className={css.Divider} />
        <h2 className={css.PanelTitle}>✨ {tr('games.idle.feed_title', 'Recent finds')}</h2>
        <LootFeed loot={state.loot} now={state.lifetime.playMs} />
      </div>
    </div>
  );
}
