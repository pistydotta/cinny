import React, { useState } from 'react';
import { getClass } from './engine/classes';
import { heroMods, heroStats, economy } from './engine/progress';
import { attributesAt, powerOf, sumMods } from './engine/stats';
import { ATTRIBUTES, Attribute, GameState, SLOTS, Slot, StatKey } from './engine/types';
import { formatBig, formatMod } from './format';
import {
  RARITY_COLOR,
  attrName,
  classDesc,
  className,
  effectText,
  roleName,
  skillName,
  slotName,
  statName,
} from './labels';
import { ItemDetails } from './ItemDetails';
import * as css from './idle.css';
import { tr } from '../../translation/tr';

const SHOWN: StatKey[] = [
  'maxHp',
  'damage',
  'attackSpeed',
  'critChance',
  'critDamage',
  'armor',
  'dodge',
  'lifesteal',
  'regen',
  'skillPower',
  'cooldownReduction',
];

const statValue = (key: StatKey, value: number): string => {
  switch (key) {
    case 'critChance':
    case 'dodge':
    case 'lifesteal':
    case 'cooldownReduction':
      return formatMod(key, value).slice(1);
    case 'critDamage':
    case 'skillPower':
      return `${Math.round(value * 100)}%`;
    case 'attackSpeed':
      return `${value.toFixed(2).replace('.', ',')}/s`;
    case 'regen':
      return value.toFixed(1).replace('.', ',');
    default:
      return formatBig(value);
  }
};

type HeroViewProps = {
  state: GameState;
  error?: string;
  onAllocate: (attr: Attribute) => void;
  onUnequip: (slot: Slot) => void;
};

export function HeroView({ state, error, onAllocate, onUnequip }: HeroViewProps) {
  const [picked, setPicked] = useState<Slot>();
  const cls = getClass(state.hero.classId);
  const stats = heroStats(state);
  const attrs = attributesAt(cls, state.hero.level, state.hero.allocated, sumMods(heroMods(state)));
  const eco = economy(state);
  const pickedItem = picked ? state.equipment[picked] : undefined;

  return (
    <div className={css.Columns}>
      <div className={css.Panel}>
        <h2 className={css.PanelTitle}>
          <span style={{ fontSize: 22 }}>{cls.icon}</span>
          <span style={{ color: cls.color }}>{className(cls.id)}</span>
          <span className={css.Muted}>· {roleName(cls.role)}</span>
        </h2>
        <span className={css.Muted}>{classDesc(cls.id)}</span>
        <span style={{ fontSize: 13 }}>
          <b>{skillName(cls.skill.id)}</b>
          {' — '}
          {cls.skill.effects.map(effectText).join(' · ')}
        </span>

        <div className={css.Row} style={{ justifyContent: 'space-between' }}>
          <h3 className={css.PanelTitle}>{tr('games.idle.attributes', 'Attributes')}</h3>
          {state.hero.freePoints > 0 && (
            <span className={css.Pill}>
              {tr('games.idle.points', '{{count}} points to spend', {
                count: state.hero.freePoints,
              })}
            </span>
          )}
        </div>
        <div className={css.StatGrid}>
          {ATTRIBUTES.map((a) => (
            <div key={a} className={css.StatRow} style={{ alignItems: 'center' }}>
              <span>
                {attrName(a)}
                {a === cls.mainStat && ' ★'}
              </span>
              <span className={css.Row}>
                <span className={css.StatValue}>{attrs[a]}</span>
                {state.hero.freePoints > 0 && (
                  <button
                    type="button"
                    className={css.SmallButton}
                    onClick={() => onAllocate(a)}
                    aria-label={tr('games.idle.add_point', 'Add a point to {{attr}}', {
                      attr: attrName(a),
                    })}
                  >
                    +
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
        <span className={css.Muted}>
          {tr(
            'games.idle.attr_hint',
            '★ main attribute: raises damage. Vitality: life. Agility: speed, crit and dodge. Strength: armor. Intellect: skills.'
          )}
        </span>

        <h3 className={css.PanelTitle}>
          {tr('games.idle.stats', 'Stats')}
          <span className={css.Pill}>
            {tr('games.idle.power', 'Power {{power}}', { power: formatBig(powerOf(stats)) })}
          </span>
        </h3>
        <div className={css.StatGrid}>
          {SHOWN.map((key) => (
            <div key={key} className={css.StatRow}>
              <span>{statName(key)}</span>
              <span className={css.StatValue}>{statValue(key, stats[key])}</span>
            </div>
          ))}
          <div className={css.StatRow}>
            <span>{statName('goldFind')}</span>
            <span className={css.StatValue}>{Math.round(eco.gold * 100)}%</span>
          </div>
          <div className={css.StatRow}>
            <span>{statName('xpGain')}</span>
            <span className={css.StatValue}>{Math.round(eco.xp * 100)}%</span>
          </div>
        </div>
      </div>

      <div className={css.Panel}>
        <h2 className={css.PanelTitle}>{tr('games.idle.equipment', 'Equipment')}</h2>
        <div className={css.SlotGrid}>
          {SLOTS.map((slot) => {
            const item = state.equipment[slot];
            return (
              <button
                key={slot}
                type="button"
                className={css.SlotBox}
                data-filled={!!item}
                aria-pressed={picked === slot}
                style={{ borderColor: item ? RARITY_COLOR[item.rarity] : undefined }}
                onClick={() => setPicked(picked === slot ? undefined : slot)}
              >
                <span className={css.SlotIcon}>{item ? item.icon : '·'}</span>
                <span>{slotName(slot)}</span>
              </button>
            );
          })}
        </div>
        {pickedItem && picked ? (
          <ItemDetails item={pickedItem}>
            <div className={css.Row}>
              <button
                type="button"
                className={css.GhostButton}
                onClick={() => {
                  onUnequip(picked);
                  setPicked(undefined);
                }}
              >
                {tr('games.idle.unequip', 'Put in backpack')}
              </button>
            </div>
          </ItemDetails>
        ) : (
          <span className={css.Muted}>
            {tr(
              'games.idle.equipment_hint',
              'Tap a slot to see the piece. New gear drops into the backpack.'
            )}
          </span>
        )}
        {error && <p className={css.ErrorText}>{error}</p>}
      </div>
    </div>
  );
}
