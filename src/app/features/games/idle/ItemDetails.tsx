import React from 'react';
import { canEquip } from './engine/items';
import { maxPlusOf } from './engine/forge';
import { GameState, Item, StatKey } from './engine/types';
import { formatBig, formatDelta, formatMod } from './format';
import { compareMods, heroDelta } from './itemView';
import { RARITY_COLOR, itemName, rarityName, slotName, statName } from './labels';
import * as css from './idle.css';
import { tr } from '../../translation/tr';

const statDelta = (key: StatKey, diff: number): string => {
  if (key === 'attackSpeed') {
    return `${diff >= 0 ? '+' : '−'}${Math.abs(diff).toFixed(2).replace('.', ',')}/s`;
  }
  if (['critChance', 'dodge', 'lifesteal', 'skillPower'].includes(key))
    return formatDelta(key, diff);
  return `${diff >= 0 ? '+' : '−'}${formatBig(Math.abs(diff))}`;
};

function Diff({ value, text }: { value: number; text: string }) {
  if (Math.abs(value) < 1e-9) return <span className={css.Muted}>±0</span>;
  return <span className={value > 0 ? css.Up : css.Down}>{text}</span>;
}

type ItemDetailsProps = {
  item: Item;
  /** The game, to show what changes on the hero; with `compare`, the piece it would replace. */
  state?: GameState;
  compare?: Item;
  children?: React.ReactNode;
};

/** An item's card: every bonus with its number, and the change against what's equipped. */
export function ItemDetails({ item, state, compare, children }: ItemDetailsProps) {
  const color = RARITY_COLOR[item.rarity];
  const rows = compareMods(item, compare);
  const showDiff = !!state && canEquip(state.hero, item) && compare?.id !== item.id;
  const delta = showDiff && state ? heroDelta(state, item) : undefined;

  return (
    <div
      className={css.ItemBox}
      style={{
        borderColor: color,
        background: `linear-gradient(160deg, ${color}22, rgba(0,0,0,0.35) 55%)`,
      }}
    >
      <span className={css.ItemName} style={{ color }}>
        {item.icon} {itemName(item)} {item.locked && '🔒'}
      </span>
      <span className={css.Muted}>
        {rarityName(item.rarity)} · {slotName(item.kind)} ·{' '}
        {tr('games.idle.item_level', 'Level {{level}}', { level: item.level })} ·{' '}
        {tr('games.idle.forge_max', 'Forge up to +{{max}}', { max: maxPlusOf(item) })}
      </span>
      {state && !canEquip(state.hero, item) && (
        <span className={css.Warning}>
          {tr('games.idle.incompatible', 'Not usable by your class or specialization.')}
        </span>
      )}
      <div className={css.Compare}>
        {rows.map((r) => (
          <React.Fragment key={r.key}>
            <span>{statName(r.key)}</span>
            <span className={css.StatValue}>{r.value === 0 ? '—' : formatMod(r.key, r.value)}</span>
            {showDiff && compare ? (
              <Diff value={r.diff} text={formatDelta(r.key, r.diff)} />
            ) : (
              <span />
            )}
          </React.Fragment>
        ))}
      </div>
      {showDiff && !compare && (
        <span className={css.Muted}>
          {tr('games.idle.empty_slot', 'Nothing equipped in this slot: it’s all gain.')}
        </span>
      )}
      {showDiff && compare && (
        <span className={css.Muted}>
          {tr('games.idle.replaces', 'Replaces: {{item}}', { item: itemName(compare) })}
        </span>
      )}
      {delta && (
        <>
          <div className={css.BigDelta}>
            <span>{tr('games.idle.if_equipped', 'If you equip it')}</span>
            <span>
              <Diff
                value={delta.power}
                text={`${tr('games.idle.power_short', 'Power')} ${
                  delta.power >= 0 ? '+' : '−'
                }${formatBig(Math.abs(delta.power))} (${delta.power >= 0 ? '+' : '−'}${Math.abs(
                  Math.round(delta.powerPct * 1000) / 10
                )
                  .toString()
                  .replace('.', ',')}%)`}
              />
            </span>
          </div>
          {delta.stats.length > 0 && (
            <div className={css.Compare}>
              {delta.stats.map((d) => (
                <React.Fragment key={d.key}>
                  <span className={css.Muted}>{statName(d.key)}</span>
                  <span />
                  <Diff value={d.diff} text={statDelta(d.key, d.diff)} />
                </React.Fragment>
              ))}
            </div>
          )}
        </>
      )}
      <span className={css.Mini}>
        {tr('games.idle.sells_for', 'Sells for {{gold}} gold', { gold: formatBig(item.value) })}
      </span>
      {children}
    </div>
  );
}

type ItemCardProps = {
  item: Item;
  delta?: number;
  compatible?: boolean;
  expanded?: boolean;
  selected?: boolean;
  onClick: () => void;
};

export function ItemCard({ item, delta, compatible, expanded, selected, onClick }: ItemCardProps) {
  const color = RARITY_COLOR[item.rarity];
  let arrow: React.ReactNode = null;
  if (delta !== undefined && delta > 0)
    arrow = <span className={`${css.CardDelta} ${css.Up}`}>▲</span>;
  else if (delta !== undefined && delta < 0)
    arrow = <span className={`${css.CardDelta} ${css.Down}`}>▼</span>;
  return (
    <button
      type="button"
      className={expanded ? css.BackpackCard : css.ItemCard}
      aria-pressed={selected}
      title={`${itemName(item)} · ${rarityName(item.rarity)} · ${tr(
        'games.idle.item_level',
        'Level {{level}}',
        { level: item.level }
      )}`}
      style={{
        borderColor: color,
        background: `radial-gradient(circle at 50% 35%, ${color}44, rgba(10,14,22,0.92) 70%)`,
      }}
      onClick={onClick}
    >
      {item.plus > 0 && <span className={css.CardPlus}>+{item.plus}</span>}
      {item.locked && <span className={css.CardLock}>🔒</span>}
      {!item.locked && item.isNew && <span className={css.CardNew} />}
      <span>{item.icon}</span>
      {expanded && (
        <>
          <span className={css.CardCaption}>{itemName(item)}</span>
          <span className={css.CardCaption}>
            {rarityName(item.rarity)} ·{' '}
            {tr('games.idle.item_level', 'Level {{level}}', { level: item.level })}
          </span>
          <span className={css.CardCaption}>
            {compatible === false && tr('games.idle.category.incompatible', 'Other classes')}
            {compatible !== false &&
              (delta && delta > 0
                ? tr('games.idle.recommended', 'Recommended')
                : slotName(item.kind))}
          </span>
        </>
      )}
      {arrow}
    </button>
  );
}
