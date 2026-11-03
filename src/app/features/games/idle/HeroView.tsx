import React, { useState } from 'react';
import { SPEC_LEVEL, getClass, getSpec, looksOf, skillsOf } from './engine/classes';
import { economy, heroStats, totalMods } from './engine/progress';
import { attributesAt, powerOf } from './engine/stats';
import { ATTRIBUTES, GameState, SLOTS, Slot, SpecId, StatKey } from './engine/types';
import { formatBig, formatMod } from './format';
import { ItemCard, ItemDetails } from './ItemDetails';
import {
  attrName,
  classDesc,
  className,
  effectText,
  modsText,
  roleName,
  skillName,
  slotName,
  specDesc,
  specName,
  statHint,
  statName,
} from './labels';
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
  'thorns',
  'execute',
  'rage',
  'petPower',
];

const statValue = (key: StatKey, value: number): string => {
  switch (key) {
    case 'critChance':
    case 'dodge':
    case 'lifesteal':
    case 'cooldownReduction':
    case 'thorns':
    case 'execute':
    case 'rage':
    case 'petPower':
      return formatMod(key, value).slice(1);
    case 'critDamage':
    case 'skillPower':
      return `${Math.round(value * 100)}%`;
    case 'attackSpeed':
      return `${value.toFixed(2).replace('.', ',')}/s`;
    case 'regen':
      return value < 100 ? value.toFixed(1).replace('.', ',') : formatBig(value);
    default:
      return formatBig(value);
  }
};

type HeroViewProps = {
  state: GameState;
  error?: string;
  onUnequip: (slot: Slot) => void;
  onSpec: (id: SpecId) => void;
  onForge: (id: string) => void;
};

export function HeroView({ state, error, onUnequip, onSpec, onForge }: HeroViewProps) {
  const [picked, setPicked] = useState<Slot>();
  const [specPick, setSpecPick] = useState<SpecId>();
  const cls = getClass(state.hero.classId);
  const spec = getSpec(state.hero.specId);
  const look = looksOf(cls, state.hero.specId);
  const stats = heroStats(state);
  const attrs = attributesAt(cls, state.hero.level, totalMods(state));
  const eco = economy(state);
  const pickedItem = picked ? state.equipment[picked] : undefined;
  const canSpec = !spec && state.hero.level >= SPEC_LEVEL;

  return (
    <div className={css.Columns}>
      <div className={css.Panel}>
        <h2 className={css.PanelTitle}>
          <span style={{ fontSize: 26 }}>{look.icon}</span>
          <span style={{ color: look.color }}>{spec ? specName(spec.id) : className(cls.id)}</span>
          <span className={css.Muted}>
            · {spec ? `${className(cls.id)} · ` : ''}
            {roleName(spec?.role ?? cls.role)}
          </span>
        </h2>
        <span className={css.Muted}>{spec ? specDesc(spec.id) : classDesc(cls.id)}</span>
        {skillsOf(cls, state.hero.specId).map((sk) => (
          <span key={sk.id} style={{ fontSize: 13 }}>
            <b>{skillName(sk.id)}</b>
            {' — '}
            {sk.effects.map(effectText).join(' · ')}
            <span className={css.Mini}>
              {' · '}
              {tr('games.idle.cooldown', '{{sec}}s cooldown', { sec: sk.cooldownMs / 1000 })}
            </span>
          </span>
        ))}
        {spec && (
          <span className={css.Mini}>
            {tr('games.idle.spec_passive', 'Passive: {{mods}}', { mods: modsText(spec.passive) })}
          </span>
        )}

        {!spec && (
          <div
            className={css.ItemBox}
            style={{ borderColor: canSpec ? '#ffd36b' : 'rgba(255,255,255,0.1)' }}
          >
            <span className={css.Strong}>
              {canSpec
                ? `✨ ${tr('games.idle.spec_ready', 'Choose your specialization')}`
                : tr('games.idle.spec_at', 'Specialization at level {{level}}', {
                    level: SPEC_LEVEL,
                  })}
            </span>
            <span className={css.Muted}>
              {tr(
                'games.idle.spec_hint',
                'Each class grows in one of two ways, with a second skill and a new passive. The choice is for good and survives rebirths.'
              )}
            </span>
            <div className={css.SpecGrid}>
              {cls.specs.map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  className={css.ClassCard}
                  aria-pressed={specPick === sp.id}
                  style={{ borderColor: specPick === sp.id ? sp.color : undefined }}
                  disabled={!canSpec}
                  onClick={() => setSpecPick(sp.id)}
                >
                  <span className={css.ClassIcon}>{sp.icon}</span>
                  <span className={css.Strong} style={{ color: sp.color }}>
                    {specName(sp.id)}
                  </span>
                  <span className={css.Mini}>{specDesc(sp.id)}</span>
                  <span style={{ fontSize: 12 }}>
                    <b>{skillName(sp.skill.id)}</b>: {sp.skill.effects.map(effectText).join(' · ')}
                  </span>
                  <span className={css.Mini}>{modsText(sp.passive)}</span>
                </button>
              ))}
            </div>
            {canSpec && specPick && (
              <button type="button" className={css.Button} onClick={() => onSpec(specPick)}>
                {tr('games.idle.spec_confirm', 'Become {{spec}}', { spec: specName(specPick) })}
              </button>
            )}
          </div>
        )}

        <h3 className={css.PanelTitle}>{tr('games.idle.attributes', 'Attributes')}</h3>
        <div className={css.StatGrid}>
          {ATTRIBUTES.map((a) => (
            <div key={a} className={css.StatRow}>
              <span>
                {attrName(a)}
                {a === cls.mainStat && ' ★'}
              </span>
              <span className={css.StatValue}>{attrs[a]}</span>
            </div>
          ))}
        </div>
        <span className={css.Mini}>
          {tr(
            'games.idle.attr_hint',
            'Attributes grow with each level and with gear. ★ main attribute: raises damage. Vitality: life. Agility: speed, crit and dodge. Strength: armor. Intellect: skills.'
          )}
        </span>

        <h3 className={css.PanelTitle}>
          {tr('games.idle.stats', 'Stats')}
          <span className={css.Pill}>
            {tr('games.idle.power', 'Power {{power}}', { power: formatBig(powerOf(stats)) })}
          </span>
        </h3>
        <div className={css.StatGrid}>
          {SHOWN.filter(
            (key) => !['thorns', 'execute', 'rage', 'petPower'].includes(key) || stats[key] > 0
          ).map((key) => (
            <div key={key} className={css.StatRow} title={statHint(key)}>
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
          <div className={css.StatRow}>
            <span>{statName('dropRate')}</span>
            <span className={css.StatValue}>{Math.round(eco.drop * 100)}%</span>
          </div>
        </div>
      </div>

      <div className={css.Panel}>
        <h2 className={css.PanelTitle}>{tr('games.idle.equipment', 'Equipment')}</h2>
        <div className={css.SlotGrid}>
          {SLOTS.map((slot) => {
            const item = state.equipment[slot];
            return item ? (
              <div
                key={slot}
                style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}
              >
                <ItemCard
                  item={item}
                  selected={picked === slot}
                  onClick={() => setPicked(picked === slot ? undefined : slot)}
                />
                <span className={css.Mini}>{slotName(slot)}</span>
              </div>
            ) : (
              <button
                key={slot}
                type="button"
                className={css.SlotBox}
                data-filled={false}
                onClick={() => setPicked(undefined)}
              >
                <span className={css.SlotIcon}>·</span>
                <span>{slotName(slot)}</span>
              </button>
            );
          })}
        </div>
        {pickedItem && picked ? (
          <ItemDetails item={pickedItem}>
            <div className={css.Row}>
              <button type="button" className={css.Button} onClick={() => onForge(pickedItem.id)}>
                ⚒️ {tr('games.idle.to_forge', 'Forge')}
              </button>
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
              'Tap a piece to see it. New gear goes to the backpack.'
            )}
          </span>
        )}
        {error && <p className={css.ErrorText}>{error}</p>}
      </div>
    </div>
  );
}
