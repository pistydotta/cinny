import React, { useState } from 'react';
import { canPlace, charmLinks, footprint } from './engine/backpack';
import { GameState, Rarity, Slot } from './engine/types';
import { RARITY_COLOR } from './labels';
import { ItemDetails } from './ItemDetails';
import * as css from './idle.css';
import { tr } from '../../translation/tr';

type BackpackViewProps = {
  state: GameState;
  error?: string;
  onEquip: (id: string) => void;
  onSell: (id: string) => void;
  onSellUpTo: (rarity: Rarity) => void;
  onMove: (id: string, x: number, y: number, rotated: boolean) => void;
  onRotate: (id: string) => void;
};

export function BackpackView({
  state,
  error,
  onEquip,
  onSell,
  onSellUpTo,
  onMove,
  onRotate,
}: BackpackViewProps) {
  const [selected, setSelected] = useState<string>();
  const bp = state.backpack;
  const links = charmLinks(bp);
  const placed = bp.items.find((p) => p.item.id === selected);
  const used = bp.items.reduce((sum, p) => sum + p.item.w * p.item.h, 0);
  const equipped =
    placed && placed.item.kind !== 'charm' ? state.equipment[placed.item.kind as Slot] : undefined;

  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < bp.rows; y += 1) {
    for (let x = 0; x < bp.cols; x += 1) cells.push({ x, y });
  }

  const fits = (x: number, y: number) =>
    !!placed && canPlace(bp, placed.item, x, y, placed.rotated, placed.item.id);

  const dropAt = (x: number, y: number) => {
    if (!placed) return;
    // A tap on the item's own corner (its cells are under it while selected) puts it down.
    if (x === placed.x && y === placed.y) {
      setSelected(undefined);
      return;
    }
    if (fits(x, y)) onMove(placed.item.id, x, y, placed.rotated);
  };

  return (
    <div className={css.Columns}>
      <div className={css.Panel}>
        <div className={css.Row} style={{ justifyContent: 'space-between' }}>
          <h2 className={css.PanelTitle}>{tr('games.idle.backpack', 'Backpack')}</h2>
          <span className={css.Muted}>
            {tr('games.idle.cells', '{{used}}/{{total}} cells', {
              used,
              total: bp.cols * bp.rows,
            })}
          </span>
        </div>
        <div
          className={css.Bag}
          style={{
            gridTemplateColumns: `repeat(${bp.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${bp.rows}, auto)`,
          }}
        >
          {cells.map(({ x, y }) => (
            <button
              key={`c${x}-${y}`}
              type="button"
              className={css.Cell}
              style={{ gridColumn: x + 1, gridRow: y + 1 }}
              data-target={fits(x, y)}
              aria-label={tr('games.idle.cell', 'Cell {{x}}, {{y}}', { x: x + 1, y: y + 1 })}
              onClick={() => dropAt(x, y)}
              onDragOver={(e) => {
                if (fits(x, y)) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (placed && fits(x, y)) onMove(placed.item.id, x, y, placed.rotated);
              }}
            />
          ))}
          {bp.items.map((p) => {
            const { w, h } = footprint(p);
            const n = links.get(p.item.id) ?? 0;
            return (
              <button
                key={p.item.id}
                type="button"
                draggable
                className={css.BagItem}
                aria-pressed={selected === p.item.id}
                style={{
                  gridColumn: `${p.x + 1} / span ${w}`,
                  gridRow: `${p.y + 1} / span ${h}`,
                  borderColor: RARITY_COLOR[p.item.rarity],
                  // Selected items let clicks through to the cells below, to move them.
                  pointerEvents: selected === p.item.id ? 'none' : undefined,
                }}
                onClick={() => setSelected(selected === p.item.id ? undefined : p.item.id)}
                onDragStart={() => setSelected(p.item.id)}
              >
                <span style={{ transform: p.rotated ? 'rotate(90deg)' : undefined }}>
                  {p.item.icon}
                </span>
                {n > 0 && <span className={css.Linked}>+{n * 25}%</span>}
              </button>
            );
          })}
        </div>
        <span className={css.Muted}>
          {tr(
            'games.idle.backpack_hint',
            'Tap an item, then tap where it should go. Charms only work in the backpack and grow when charms of the same element touch.'
          )}
        </span>
        <div className={css.Row}>
          <button type="button" className={css.GhostButton} onClick={() => onSellUpTo('common')}>
            {tr('games.idle.sell_commons', 'Sell commons')}
          </button>
          <button type="button" className={css.GhostButton} onClick={() => onSellUpTo('uncommon')}>
            {tr('games.idle.sell_uncommons', 'Sell commons and uncommons')}
          </button>
        </div>
      </div>

      <div className={css.Panel}>
        <h2 className={css.PanelTitle}>{tr('games.idle.selected', 'Selected item')}</h2>
        {placed ? (
          <>
            <ItemDetails item={placed.item} compare={equipped} links={links.get(placed.item.id)}>
              <div className={css.Row}>
                {placed.item.kind !== 'charm' && (
                  <button
                    type="button"
                    className={css.Button}
                    onClick={() => {
                      onEquip(placed.item.id);
                      setSelected(undefined);
                    }}
                  >
                    {tr('games.idle.equip', 'Equip')}
                  </button>
                )}
                {placed.item.w !== placed.item.h && (
                  <button
                    type="button"
                    className={css.GhostButton}
                    onClick={() => onRotate(placed.item.id)}
                  >
                    {tr('games.idle.rotate', 'Rotate')}
                  </button>
                )}
                <button
                  type="button"
                  className={css.DangerButton}
                  onClick={() => {
                    onSell(placed.item.id);
                    setSelected(undefined);
                  }}
                >
                  {tr('games.idle.sell', 'Sell')}
                </button>
              </div>
            </ItemDetails>
            {equipped && (
              <>
                <span className={css.Muted}>{tr('games.idle.equipped_now', 'Equipped now')}</span>
                <ItemDetails item={equipped} />
              </>
            )}
          </>
        ) : (
          <span className={css.Muted}>
            {tr('games.idle.nothing_selected', 'Pick an item in the backpack.')}
          </span>
        )}
        {error && <p className={css.ErrorText}>{error}</p>}
      </div>
    </div>
  );
}
