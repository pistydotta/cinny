import React from 'react';
import { MAX_PASSIVES, MAX_WEAPONS, RUN_SECONDS, WEAPON_MAX_LEVEL } from './engine/data';
import { CharacterId } from './engine/types';
import { PixelIcon } from './icons/PixelIcon';
import { pixelIconUrl } from './icons/pixelIconUrl';
import type { Hud, HordeRunner } from './runner';
import { Controls } from './controls';
import {
  abilityLabel,
  evolutionLabel,
  formatTime,
  keyLabel,
  passiveLabel,
  shrineLabel,
  weaponLabel,
} from './labels';
import { HERO_SPRITES } from './sprites';
import { shortNumber } from './numbers';
import { tr } from '../../translation/tr';
import * as css from './hud.css';

// The run's HUD over the 3D: the hero and its build top left, the clock in the middle, the
// ability bottom right. Drawn from `Hud`, which the runner hands over every frame.

const TOUCH = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

function Icon({ art }: { art: string }) {
  const url = pixelIconUrl(art);
  return url ? <img src={url} alt="" draggable={false} /> : null;
}

function Pips({ level, max }: { level: number; max: number }) {
  return (
    <span className={css.Pips}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={css.Pip} data-on={i < level} />
      ))}
    </span>
  );
}

// A buff with the seconds it has left, blinking in its last two.
function Buff({ art, seconds }: { art: string; seconds: number }) {
  return (
    <span className={css.Buff} data-ending={seconds < 2}>
      <Icon art={art} />
      {Math.ceil(seconds)}
    </span>
  );
}

type RunHudProps = {
  hud: Hud;
  hero: CharacterId;
  controls: Controls;
  runner: HordeRunner | undefined;
};

export function RunHud({ hud, hero, controls, runner }: RunHudProps) {
  const ability = abilityLabel(hero);
  const emptyWeapons = Math.max(0, MAX_WEAPONS - hud.weapons.length);
  const emptyBoletos = Math.max(0, MAX_PASSIVES - hud.passives.length);
  return (
    <div className={css.Layer}>
      <div className={css.Xp}>
        <div className={css.XpFill} style={{ width: `${Math.min(1, hud.xp) * 100}%` }} />
        <div className={css.XpTicks} />
      </div>

      <div className={css.Hero}>
        <div className={css.HeroRow}>
          <div className={css.Portrait} style={{ backgroundImage: `url(${HERO_SPRITES[hero]})` }}>
            <span className={css.LevelBadge}>
              {tr('games.horde.hud.level', 'Lv {{level}}', { level: hud.level })}
            </span>
          </div>
          <div className={css.Bars}>
            <div className={css.BarLine}>
              <Icon art="hud:heart" />
              <div className={css.Hp}>
                <div
                  className={css.HpFill}
                  style={{ width: `${Math.max(0, hud.hp / hud.maxHp) * 100}%` }}
                />
                <span className={css.HpText}>
                  {Math.ceil(hud.hp)} / {hud.maxHp}
                  {hud.overHp >= 1 && <span className={css.Over}>+{Math.floor(hud.overHp)}</span>}
                </span>
              </div>
            </div>
            {hud.maxShield > 0 && (
              <div className={css.Shield}>
                <div
                  className={css.ShieldFill}
                  style={{ width: `${(hud.shield / hud.maxShield) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div className={css.Build}>
          <div className={css.SlotRow}>
            {hud.weapons.map((w) => {
              const label = w.evolved ? evolutionLabel(w.id) : weaponLabel(w.id);
              return (
                <span
                  key={w.id}
                  className={css.Weapon}
                  title={label.name}
                  data-max={w.level >= WEAPON_MAX_LEVEL}
                  data-evolved={w.evolved}
                >
                  <PixelIcon art={label.art} emoji={label.icon} />
                  {!w.evolved && <Pips level={w.level} max={WEAPON_MAX_LEVEL} />}
                </span>
              );
            })}
            {Array.from({ length: emptyWeapons }, (_, i) => (
              <span key={i} className={css.EmptySlot} />
            ))}
          </div>
          <div className={css.SlotRow}>
            {hud.passives.map((p) => (
              <span key={p.id} className={css.Boleto} title={passiveLabel(p.id).name}>
                <PixelIcon art={passiveLabel(p.id).art} emoji={passiveLabel(p.id).icon} />
                <Pips level={p.level} max={p.max} />
              </span>
            ))}
            {Array.from({ length: emptyBoletos }, (_, i) => (
              <span key={i} className={css.EmptySlot} data-kind="boleto" />
            ))}
          </div>
        </div>
      </div>

      <div className={css.Center}>
        <span className={css.Clock} data-late={RUN_SECONDS - hud.time < 60}>
          {formatTime(hud.time)}
        </span>
        <span className={css.Counters}>
          <span className={css.Counter}>
            <Icon art="hud:skull" />
            {shortNumber(hud.kills)}
          </span>
          <span className={`${css.Counter} ${css.Gold}`}>
            <Icon art="hud:coin" />
            {shortNumber(hud.gold)}
          </span>
        </span>
        {hud.boss !== undefined && (
          <div className={css.Boss}>
            <div className={css.BossFill} style={{ width: `${hud.boss * 100}%` }} />
            {hud.bossHp && (
              <span className={css.BossText}>
                <Icon art="hud:skull" />
                {tr('games.horde.boss_name', 'BOSS')} {shortNumber(hud.bossHp.hp)} /{' '}
                {shortNumber(hud.bossHp.max)}
              </span>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        className={css.Pause}
        onClick={() => runner?.setPaused(true)}
        aria-label={tr('games.horde.pause', 'Pause')}
      />

      <div className={css.Bottom}>
        {hud.challenge && (
          <span className={css.Tag}>
            {tr('games.horde.challenge_hud', '⚔️ {{kills}} more in {{seconds}} s', {
              kills: hud.challenge.kills,
              seconds: Math.ceil(hud.challenge.seconds),
            })}
          </span>
        )}
        {hud.curse > 0 && (
          <span className={css.Tag} data-curse>
            {tr('games.horde.curse_hud', '☠️ Curse: {{seconds}} s', {
              seconds: Math.ceil(hud.curse),
            })}
          </span>
        )}
        {hud.shrine && <span className={css.Tag}>{shrineLabel(hud.shrine)}</span>}
        {(hud.buffs.rage > 0 || hud.buffs.freeze > 0 || hud.buffs.star > 0) && (
          <div className={css.Buffs}>
            {hud.buffs.rage > 0 && <Buff art="stat:damage" seconds={hud.buffs.rage} />}
            {hud.buffs.freeze > 0 && <Buff art="hud:snow" seconds={hud.buffs.freeze} />}
            {hud.buffs.star > 0 && <Buff art="hud:star" seconds={hud.buffs.star} />}
          </div>
        )}
        <span className={css.Speed} data-fast={hud.speed > 9}>
          {tr('games.horde.hud.speed', '{{speed}} m/s', { speed: hud.speed.toFixed(1) })}
        </span>
      </div>

      {!TOUCH && !hud.aiming && hud.phase === 'playing' && !hud.paused && (
        <div className={css.Hint}>
          {tr('games.horde.aim_hint', 'Click to turn the camera with the mouse')}
        </div>
      )}

      {!TOUCH && (
        <div className={css.Skills}>
          <div
            className={css.Skill}
            data-small
            data-ready={hud.dash >= 1}
            title={tr('games.horde.dash', 'Dash')}
          >
            <span
              className={css.SkillWait}
              style={{ height: `${(1 - Math.min(1, hud.dash)) * 100}%` }}
            />
            <span className={css.SkillName}>{keyLabel(controls.keys.dash[0])}</span>
          </div>
          <div
            className={css.Skill}
            data-ready={hud.ability >= 1}
            title={`${ability.name}: ${ability.text}`}
          >
            <span
              className={css.SkillWait}
              style={{ height: `${(1 - Math.min(1, hud.ability)) * 100}%` }}
            />
            <PixelIcon art={ability.art} emoji={ability.icon} />
            <span className={css.SkillKey}>{keyLabel(controls.keys.ability[0])}</span>
          </div>
        </div>
      )}

      {TOUCH && (
        <>
          <button
            type="button"
            className={css.AbilityButton}
            data-ready={hud.ability >= 1}
            onPointerDown={() => runner?.pressAbility()}
            aria-label={ability.name}
          >
            <PixelIcon art={ability.art} emoji={ability.icon} />
          </button>
          <button
            type="button"
            className={css.JumpButton}
            onPointerDown={() => runner?.holdJump(true)}
            onPointerUp={() => runner?.holdJump(false)}
            onPointerCancel={() => runner?.holdJump(false)}
            onPointerLeave={() => runner?.holdJump(false)}
          >
            {tr('games.horde.jump', 'Jump')}
          </button>
          <button
            type="button"
            className={css.DashButton}
            data-ready={hud.dash >= 1}
            onPointerDown={() => runner?.pressDash()}
          >
            {tr('games.horde.dash', 'Dash')}
          </button>
        </>
      )}
    </div>
  );
}
