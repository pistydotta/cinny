import React from 'react';
import { BOLETOS } from './engine/stats';
import { EVOLUTIONS, WeaponSpec } from './engine/weapons';
import { CharacterId, OwnedWeapon, PassiveId } from './engine/types';
import { abilityLabel, evolutionLabel, passiveLabel, weaponLabel } from './labels';
import { PixelIcon } from './icons/PixelIcon';
import * as css from './horde.css';
import { tr } from '../../translation/tr';

type BuildPanelProps = {
  hero: CharacterId;
  weapons: { weapon: OwnedWeapon; spec: WeaponSpec }[];
  passives: { id: PassiveId; level: number }[];
  onClose: () => void;
};

const round = (value: number) => String(Math.round(value * 10) / 10);

// The run's build: each weapon with its numbers now and what it evolves with, the Boletos, and
// the hero's ability.
export function BuildPanel({ hero, weapons, passives, onClose }: BuildPanelProps) {
  const ability = abilityLabel(hero);
  return (
    <>
      <h2 className={css.PanelTitle}>{tr('games.horde.build', 'Build')}</h2>
      <div className={css.StatGroups}>
        <section className={css.StatGroup}>
          <h3 className={css.StatGroupTitle}>{tr('games.horde.build_weapons', 'Weapons')}</h3>
          {weapons.map(({ weapon, spec }) => {
            const label = weapon.evolved ? evolutionLabel(weapon.id) : weaponLabel(weapon.id);
            const needs = passiveLabel(EVOLUTIONS[weapon.id]).name;
            return (
              <div key={weapon.id} className={css.BuildRow}>
                <span className={css.StatLine}>
                  <PixelIcon art={label.art} emoji={label.icon} />
                  <span className={css.Grow}>{label.name}</span>
                  <span className={css.StatNumber}>
                    {weapon.evolved
                      ? '★'
                      : tr('games.horde.choice.level', 'Level {{level}}', { level: weapon.level })}
                  </span>
                </span>
                <span className={css.StatHelp}>
                  {tr(
                    'games.horde.build_numbers',
                    'Damage {{damage}} × {{count}}, size {{area}}, every {{cooldown}} s',
                    {
                      damage: round(spec.damage),
                      count: spec.count,
                      area: round(spec.area),
                      cooldown: spec.cooldown > 0 ? round(spec.cooldown) : '—',
                    }
                  )}
                </span>
                {!weapon.evolved && (
                  <span className={css.StatHelp}>
                    {tr('games.horde.build_evolves', 'Evolves at level 6 with: {{boleto}}', {
                      boleto: needs,
                    })}
                  </span>
                )}
              </div>
            );
          })}
        </section>
        <section className={css.StatGroup}>
          <h3 className={css.StatGroupTitle}>{tr('games.horde.build_boletos', 'Boletos')}</h3>
          {passives.length === 0 && (
            <span className={css.StatHelp}>{tr('games.horde.build_none', 'None yet.')}</span>
          )}
          {passives.map((p) => {
            const label = passiveLabel(p.id);
            return (
              <div key={p.id} className={css.BuildRow}>
                <span className={css.StatLine}>
                  <PixelIcon art={label.art} emoji={label.icon} />
                  <span className={css.Grow}>{label.name}</span>
                  <span className={css.StatNumber}>
                    {p.level}/{BOLETOS[p.id].max}
                  </span>
                </span>
              </div>
            );
          })}
          <h3 className={css.StatGroupTitle}>{tr('games.horde.build_ability', 'Ability')}</h3>
          <div className={css.BuildRow}>
            <span className={css.StatLine}>
              <PixelIcon art={ability.art} emoji={ability.icon} />
              <span className={css.Grow}>{ability.name}</span>
            </span>
            <span className={css.StatHelp}>{ability.text}</span>
          </div>
        </section>
      </div>
      <div className={css.PanelRow}>
        <button type="button" className={css.PlayButton} onClick={onClose}>
          {tr('games.horde.done', 'Done')}
        </button>
      </div>
    </>
  );
}
