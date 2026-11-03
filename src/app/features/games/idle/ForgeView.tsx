import React, { useState } from 'react';
import {
  BREAK_FROM,
  FORGE_CHANCE,
  ForgeOutcome,
  PITY,
  canAfford,
  forgeChance,
  forgeCost,
  maxPlusOf,
} from './engine/forge';
import { PLUS_BONUS, rarityRank } from './engine/items';
import { totalMods } from './engine/progress';
import { GameState, Item, SLOTS } from './engine/types';
import { formatBig } from './format';
import { ItemCard, ItemDetails } from './ItemDetails';
import { RARITY_COLOR, itemName } from './labels';
import * as css from './idle.css';
import { tr } from '../../translation/tr';

const chanceColor = (c: number): string => {
  if (c >= 0.75) return '#8be28f';
  if (c >= 0.3) return '#ffd36b';
  return '#ff8a80';
};

const pct = (n: number) => `${(Math.round(n * 1000) / 10).toString().replace('.', ',')}%`;

type ForgeViewProps = {
  state: GameState;
  error?: string;
  selected?: string;
  onSelect: (id: string | undefined) => void;
  onForge: (id: string) => { outcome: ForgeOutcome; plus: number } | undefined;
};

export function ForgeView({ state, error, selected, onSelect, onForge }: ForgeViewProps) {
  const [last, setLast] = useState<{
    id: string;
    outcome: ForgeOutcome;
    plus: number;
    n: number;
  }>();
  const equipped = SLOTS.map((s) => state.equipment[s]).filter((i): i is Item => !!i);
  const bag = [...state.inventory]
    .filter((i) => rarityRank(i.rarity) >= 1 || i.plus > 0)
    .sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || b.plus - a.plus);
  const item = [...equipped, ...state.inventory].find((i) => i.id === selected);
  const bonus = totalMods(state).forgeChance ?? 0;

  const forge = () => {
    if (!item) return;
    const r = onForge(item.id);
    if (r) setLast({ id: item.id, ...r, n: (last?.n ?? 0) + 1 });
  };

  let body: React.ReactNode;
  if (!item) {
    body =
      last?.outcome === 'broken' && last.id === selected ? (
        <div className={css.ForgeAnvil}>
          <span className={css.ForgeIcon} data-result="broken">
            💥
          </span>
          <span className={css.Warning}>
            {tr('games.idle.forge_broken', 'The forge failed and the item broke.')}
          </span>
        </div>
      ) : (
        <span className={css.Muted}>
          {tr('games.idle.forge_pick', 'Pick an item on the left. Equipped gear comes first.')}
        </span>
      );
  } else {
    const max = maxPlusOf(item);
    const maxed = item.plus >= max;
    const cost = forgeCost(item);
    const chance = forgeChance(item, bonus);
    const target = item.plus + 1;
    const affordable = canAfford(state.materials, state.gold, cost);
    const color = RARITY_COLOR[item.rarity];
    const result = last && last.id === item.id ? last : undefined;
    body = (
      <>
        <div className={css.ForgeAnvil}>
          <span key={result?.n} className={css.ForgeIcon} data-result={result?.outcome}>
            {item.icon}
          </span>
          <span className={css.ItemName} style={{ color }}>
            {itemName(item)}
          </span>
          {result && (
            <span
              className={css.Strong}
              style={{ color: result.outcome === 'success' ? '#8be28f' : '#ff8a80' }}
            >
              {result.outcome === 'success' &&
                tr('games.idle.forge_success', 'Success! Now +{{plus}}.', { plus: result.plus })}
              {result.outcome === 'downgrade' &&
                tr(
                  'games.idle.forge_down',
                  'It failed and dropped to +{{plus}}. The next try is likelier.',
                  {
                    plus: result.plus,
                  }
                )}
            </span>
          )}
          {!maxed && (
            <span className={css.Muted}>
              +{item.plus} → +{target} ·{' '}
              {tr('games.idle.forge_bonus', 'stats +{{from}} → +{{to}}', {
                from: pct(PLUS_BONUS[item.plus]),
                to: pct(PLUS_BONUS[target]),
              })}
            </span>
          )}
        </div>
        {maxed ? (
          <span className={css.Strong} style={{ color: '#ffd36b' }}>
            {tr('games.idle.forge_maxed', 'This item is at its limit (+{{max}} for its rarity).', {
              max,
            })}
          </span>
        ) : (
          <>
            <div className={css.Row} style={{ justifyContent: 'space-between' }}>
              <span className={css.Strong}>{tr('games.idle.forge_chance', 'Chance')}</span>
              <span
                className={css.Strong}
                style={{
                  color: chanceColor(chance),
                }}
              >
                {pct(chance)}
              </span>
            </div>
            <div className={css.ChanceBar}>
              <div
                className={css.BarFill}
                style={{
                  width: `${chance * 100}%`,
                  background:
                    target >= BREAK_FROM ? '#ff5a4f' : 'linear-gradient(90deg, #ff8a3d, #ffd36b)',
                }}
              />
            </div>
            {item.fails > 0 && target < BREAK_FROM && (
              <span className={css.Mini}>
                {tr('games.idle.forge_pity', '{{fails}} failures in a row: +{{pct}} chance', {
                  fails: item.fails,
                  pct: pct(item.fails * PITY),
                })}
              </span>
            )}
            {target >= BREAK_FROM ? (
              <span className={css.Warning}>
                💥{' '}
                {tr(
                  'games.idle.forge_break',
                  'Danger: if this try fails, the item BREAKS and is gone for good.'
                )}
              </span>
            ) : (
              target > 2 && (
                <span className={css.Mini}>
                  {tr('games.idle.forge_fail_note', 'If it fails, the item drops to +{{plus}}.', {
                    plus: Math.max(0, item.plus - 1),
                  })}
                </span>
              )
            )}
            <div className={css.Row}>
              <span
                className={css.Pill}
                style={{ color: state.materials.stones < cost.stones ? '#ff8a80' : undefined }}
              >
                🔶 {formatBig(cost.stones)} / {formatBig(state.materials.stones)}
              </span>
              {cost.cores > 0 && (
                <span
                  className={css.Pill}
                  style={{ color: state.materials.cores < cost.cores ? '#ff8a80' : undefined }}
                >
                  🔥 {cost.cores} / {state.materials.cores}
                </span>
              )}
              <span
                className={css.Pill}
                style={{ color: state.gold < cost.gold ? '#ff8a80' : undefined }}
              >
                🪙 {formatBig(cost.gold)}
              </span>
            </div>
            <button
              type="button"
              className={target >= BREAK_FROM ? css.DangerButton : css.Button}
              disabled={!affordable}
              onClick={forge}
            >
              ⚒️ {tr('games.idle.forge_go', 'Forge to +{{plus}}', { plus: target })}
            </button>
          </>
        )}
        <ItemDetails item={item} />
      </>
    );
  }

  return (
    <div className={css.Columns}>
      <div className={css.Panel}>
        <h2 className={css.PanelTitle}>⚒️ {tr('games.idle.forge', 'Forge')}</h2>
        <span className={css.Muted}>
          {tr(
            'games.idle.forge_hint',
            'Ember stones and gold make an item stronger, up to +12. Up to +3 is safe and cheap. From +4 a failure drops one level, and each failure makes the next try likelier. +11 and +12 are for the bold: tiny odds, and a failure breaks the item.'
          )}
        </span>
        <div className={css.Row}>
          <span className={css.Pill}>🔶 {formatBig(state.materials.stones)}</span>
          <span className={css.Pill}>🔥 {state.materials.cores}</span>
        </div>
        <span className={css.Mini}>
          {tr(
            'games.idle.materials_hint',
            '🔶 Ember stones: from salvaging items and from bosses. 🔥 Fire cores (from +8): from bosses and epic or better items.'
          )}
        </span>
        <h3 className={css.PanelTitle}>{tr('games.idle.equipment', 'Equipment')}</h3>
        <div className={css.ItemGrid}>
          {equipped.map((i) => (
            <ItemCard
              key={i.id}
              item={i}
              selected={selected === i.id}
              onClick={() => onSelect(i.id)}
            />
          ))}
        </div>
        <h3 className={css.PanelTitle}>{tr('games.idle.backpack', 'Backpack')}</h3>
        {bag.length === 0 ? (
          <span className={css.Muted}>
            {tr('games.idle.forge_bag_empty', 'No uncommon or better items in the backpack.')}
          </span>
        ) : (
          <div className={css.ItemGrid}>
            {bag.map((i) => (
              <ItemCard
                key={i.id}
                item={i}
                selected={selected === i.id}
                onClick={() => onSelect(i.id)}
              />
            ))}
          </div>
        )}
        <details>
          <summary className={css.Muted} style={{ cursor: 'pointer' }}>
            {tr('games.idle.forge_table', 'Chances by level')}
          </summary>
          <div className={css.Compare} style={{ marginTop: 6 }}>
            {FORGE_CHANCE.slice(1).map((c, i) => (
              <React.Fragment key={`c${i + 1}`}>
                <span>+{i + 1}</span>
                <span className={css.StatValue}>{pct(c)}</span>
                <span className={css.Mini}>
                  {i + 1 >= BREAK_FROM
                    ? tr('games.idle.forge_breaks', 'breaks on failure')
                    : `+${pct(PLUS_BONUS[i + 1])}`}
                </span>
              </React.Fragment>
            ))}
          </div>
        </details>
      </div>
      <div className={css.Panel}>
        {body}
        {error && <p className={css.ErrorText}>{error}</p>}
      </div>
    </div>
  );
}
