import { GameEvent, Rarity, Side } from '../engine/types';
import { FxEngine, Vec } from './fxEngine';

// Turns game events into effects. The engine knows nothing about the game; this file is the
// only place that decides what a Meteor or a critical hit looks like.

type SkillLook =
  | { kind: 'slash'; color: string; color2: string }
  | { kind: 'arrows'; color: string; count: number }
  | { kind: 'orb'; color: string; color2: string; size: number; big?: boolean }
  | { kind: 'meteor'; color: string; color2: string }
  | { kind: 'nova'; color: string; color2: string }
  | { kind: 'heal'; color: string; strike?: string }
  | { kind: 'shield'; color: string }
  | { kind: 'buff'; color: string }
  | { kind: 'poison'; color: string; color2: string }
  | { kind: 'drain'; color: string }
  | { kind: 'bolt'; color: string; count: number }
  | { kind: 'curse'; color: string; color2: string }
  | { kind: 'pack'; color: string };

const SKILLS: Record<string, SkillLook> = {
  cleave: { kind: 'slash', color: '#ffd59e', color2: '#ff8a3d' },
  shield_wall: { kind: 'shield', color: '#9ecbff' },
  blood_rage: { kind: 'buff', color: '#ff3b3b' },
  volley: { kind: 'arrows', color: '#d6f5b0', count: 4 },
  deadeye: { kind: 'orb', color: '#e8ff9e', color2: '#ffffff', size: 10, big: true },
  pack_hunt: { kind: 'pack', color: '#c9a35b' },
  shadowstep: { kind: 'slash', color: '#c79bff', color2: '#5b2a9e' },
  eviscerate: { kind: 'slash', color: '#ff4d6d', color2: '#8e1b3a' },
  toxic_blades: { kind: 'poison', color: '#7fe05a', color2: '#2f7a1a' },
  fireball: { kind: 'orb', color: '#ff8a3d', color2: '#ffd36b', size: 12 },
  meteor: { kind: 'meteor', color: '#ff6a2b', color2: '#ffd36b' },
  frost_nova: { kind: 'nova', color: '#9fe6ff', color2: '#ffffff' },
  holy_light: { kind: 'heal', color: '#ffe38a', strike: '#fff3c4' },
  judgment: { kind: 'bolt', color: '#ffe38a', count: 1 },
  wild_growth: { kind: 'heal', color: '#8be28f' },
  soul_drain: { kind: 'drain', color: '#b388ff' },
  bone_spear: { kind: 'orb', color: '#e0e6ea', color2: '#9aa7b0', size: 9 },
  doom: { kind: 'curse', color: '#b388ff', color2: '#4a148c' },
  root_slam: { kind: 'slash', color: '#8bc34a', color2: '#5d4037' },
  eruption: { kind: 'meteor', color: '#ff5a1f', color2: '#ffb347' },
  venom: { kind: 'poison', color: '#9be15a', color2: '#33691e' },
  frost_breath: { kind: 'nova', color: '#9fe6ff', color2: '#e1f5fe' },
  hellfire: { kind: 'drain', color: '#ff5a1f' },
  tidal_crush: { kind: 'nova', color: '#4fc3f7', color2: '#b3e5fc' },
  thunderclap: { kind: 'bolt', color: '#c7d7ff', count: 3 },
  unmaking: { kind: 'curse', color: '#ea80fc', color2: '#311b92' },
};

/** What a class's basic attack looks like. */
export type AttackLook = { ranged: boolean; color: string };

export type FxPositions = {
  hero: Vec;
  foe: Vec;
  /** The fighter elements, to make them lunge and flinch. */
  heroEl?: HTMLElement | null;
  foeEl?: HTMLElement | null;
};

const RARITY_FX: Record<Rarity, string> = {
  common: '#b8c0cc',
  uncommon: '#5fd068',
  rare: '#4ea8ff',
  epic: '#c27aff',
  legendary: '#ffa53b',
  mythic: '#ff4d6d',
};

const fmt = (n: number): string => {
  if (n < 10000) return String(Math.max(0, Math.round(n)));
  const units = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
  const tier = Math.min(units.length - 1, Math.floor(Math.log10(n) / 3));
  const v = n / 1000 ** tier;
  return `${v.toFixed(v < 100 ? 1 : 0).replace('.', ',')}${units[tier]}`;
};

const lunge = (el: HTMLElement | null | undefined, dir: number, far = 18) => {
  if (!el || typeof el.animate !== 'function') return;
  el.animate(
    [
      { transform: 'translateX(0) scale(1)' },
      { transform: `translateX(${dir * far}px) scale(1.08)` },
      { transform: 'translateX(0) scale(1)' },
    ],
    { duration: 220, easing: 'ease-out' }
  );
};

const flinch = (el: HTMLElement | null | undefined, dir: number, crit: boolean) => {
  if (!el || typeof el.animate !== 'function') return;
  el.animate(
    [
      { transform: 'translateX(0)', filter: 'none' },
      {
        transform: `translateX(${dir * (crit ? 12 : 6)}px)`,
        filter: 'brightness(2.2) saturate(0.4)',
      },
      { transform: 'translateX(0)', filter: 'none' },
    ],
    { duration: crit ? 300 : 200, easing: 'ease-out' }
  );
};

export type FxLabels = {
  dodge: string;
  level: (n: number) => string;
  stage: (n: number) => string;
};

export class BattleFx {
  private fx: FxEngine;

  private pos: () => FxPositions;

  private heroAttack: () => AttackLook;

  private labels: FxLabels;

  constructor(
    fx: FxEngine,
    pos: () => FxPositions,
    heroAttack: () => AttackLook,
    labels: FxLabels
  ) {
    this.fx = fx;
    this.pos = pos;
    this.heroAttack = heroAttack;
    this.labels = labels;
  }

  private sides(from: Side) {
    const p = this.pos();
    return from === 'hero'
      ? { me: p.hero, them: p.foe, meEl: p.heroEl, themEl: p.foeEl, dir: 1 }
      : { me: p.foe, them: p.hero, meEl: p.foeEl, themEl: p.heroEl, dir: -1 };
  }

  private impact(at: Vec, amount: number, crit: boolean, hero: boolean, color: string) {
    const { fx } = this;
    fx.burst(at, {
      count: crit ? 26 : 12,
      color: crit ? ['#fff4c2', '#ffb347', color] : ['#ffffff', color],
      speed: crit ? [120, 340] : [80, 220],
      size: crit ? [4, 10] : [3, 7],
      life: [0.25, 0.55],
      shape: 'spark',
    });
    fx.burst(at, {
      count: crit ? 6 : 2,
      color,
      size: [10, 18],
      speed: [10, 40],
      life: [0.15, 0.3],
    });
    if (crit) {
      fx.ring(at, '#ffd36b', 46, 0.35, 4);
      fx.shake(5);
    }
    let color2 = hero ? '#ffffff' : '#ff8a80';
    if (crit) color2 = '#ffcf4d';
    fx.text({ x: at.x, y: at.y - 30 }, crit ? `${fmt(amount)}!` : fmt(amount), {
      color: color2,
      size: crit ? 26 : 17,
      big: crit,
    });
  }

  /** Spreads one tick's events over its length, so hits don't all land in the same frame. */
  play(events: GameEvent[], spanMs: number) {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const visible = events.filter((e) => e.t !== 'fight');
    visible.forEach((e, i) => {
      const delay = visible.length > 1 ? (i / visible.length) * spanMs : 0;
      this.fx.later(delay, () => this.one(e));
    });
  }

  private one(e: GameEvent) {
    const { fx } = this;
    switch (e.t) {
      case 'hit': {
        const s = this.sides(e.from);
        const look: AttackLook =
          e.from === 'hero' ? this.heroAttack() : { ranged: false, color: '#ff6b5a' };
        lunge(s.meEl, s.dir, look.ranged ? 6 : 22);
        const land = () => {
          flinch(s.themEl, s.dir, e.crit);
          this.impact(s.them, e.amount, e.crit, e.from === 'hero', look.color);
        };
        if (look.ranged) {
          fx.projectile(
            { x: s.me.x + s.dir * 24, y: s.me.y - 6 },
            s.them,
            look.color,
            170,
            7,
            land,
            18
          );
        } else {
          fx.later(90, land);
        }
        break;
      }
      case 'dodge': {
        const s = this.sides(e.from);
        fx.text({ x: s.them.x, y: s.them.y - 34 }, this.labels.dodge, {
          color: '#cfd8dc',
          size: 14,
        });
        fx.burst(s.them, {
          count: 6,
          color: '#cfd8dc',
          speed: [40, 90],
          size: [3, 6],
          life: [0.2, 0.4],
          additive: false,
          angle: s.dir > 0 ? 0 : Math.PI,
          spread: 0.6,
        });
        break;
      }
      case 'heal': {
        const s = this.sides(e.from);
        fx.text({ x: s.me.x, y: s.me.y - 40 }, `+${fmt(e.amount)}`, { color: '#8be28f', size: 18 });
        break;
      }
      case 'pet': {
        const s = this.sides(e.from);
        fx.burst(s.them, {
          count: 8,
          color: ['#e0c38c', '#ffffff'],
          speed: [60, 160],
          size: [2, 5],
          shape: 'spark',
          life: [0.2, 0.4],
        });
        fx.text({ x: s.them.x + 20, y: s.them.y - 10 }, fmt(e.amount), {
          color: '#e0c38c',
          size: 13,
          rise: 50,
        });
        break;
      }
      case 'thorns': {
        const s = this.sides(e.from);
        fx.burst(s.them, {
          count: 10,
          color: ['#9ccc65', '#cddc39'],
          speed: [80, 180],
          size: [2, 4],
          shape: 'spark',
          life: [0.2, 0.35],
        });
        fx.text({ x: s.them.x, y: s.them.y - 18 }, fmt(e.amount), {
          color: '#c5e1a5',
          size: 13,
          rise: 50,
        });
        break;
      }
      case 'skill':
        this.skill(e.from, e.skillId, e.amount);
        break;
      case 'kill': {
        const { foe } = this.pos();
        fx.burst(foe, {
          count: e.boss ? 70 : 34,
          color: ['#ffd36b', '#ff8a3d', '#ffffff'],
          speed: [80, 320],
          size: [3, 9],
          life: [0.4, 0.9],
          gravity: 260,
          shape: 'spark',
        });
        fx.burst(foe, {
          count: e.boss ? 16 : 6,
          color: '#ffb347',
          size: [14, 26],
          speed: [10, 60],
          life: [0.3, 0.6],
        });
        fx.ring(foe, '#ffd36b', e.boss ? 110 : 60, 0.5, 5);
        const coins = e.boss ? 10 : 4;
        for (let i = 0; i < coins; i += 1) {
          fx.emoji(
            foe,
            '🪙',
            16,
            { x: (Math.random() - 0.5) * 180, y: -180 - Math.random() * 140 },
            0.9,
            520
          );
        }
        fx.text({ x: foe.x, y: foe.y - 56 }, `+${fmt(e.gold)} 🪙`, {
          color: '#f5c84b',
          size: 16,
          life: 1.1,
          rise: 50,
        });
        if (e.boss) {
          fx.shake(10);
          fx.flash('#ffd36b', 0.25);
        }
        break;
      }
      case 'death': {
        const { hero } = this.pos();
        fx.burst(hero, {
          count: 30,
          color: ['#78909c', '#b0bec5', '#ff5a4f'],
          speed: [60, 220],
          gravity: 200,
          life: [0.5, 1],
          shape: 'shard',
          additive: false,
        });
        fx.flash('#ff0000', 0.18);
        fx.shake(6);
        break;
      }
      case 'level': {
        const { hero } = this.pos();
        fx.burst(hero, {
          count: 50,
          color: ['#ffd36b', '#fff4c2', '#b48cff'],
          speed: [120, 300],
          angle: -Math.PI / 2,
          spread: 0.7,
          gravity: 300,
          size: [3, 8],
          life: [0.7, 1.3],
        });
        fx.ring(hero, '#ffd36b', 70, 0.6, 4);
        fx.text({ x: hero.x, y: hero.y - 70 }, this.labels.level(e.level), {
          color: '#ffd36b',
          size: 22,
          big: true,
          life: 1.6,
          rise: 40,
        });
        break;
      }
      case 'stage': {
        fx.text({ x: fx.width / 2, y: 40 }, this.labels.stage(e.stage), {
          color: '#ffe7a0',
          size: 20,
          big: true,
          life: 1.4,
          rise: 10,
        });
        break;
      }
      case 'loot': {
        const { item, better } = e.entry;
        const rank = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].indexOf(
          item.rarity
        );
        if (rank < 2 && !better) break;
        const { foe } = this.pos();
        const color = RARITY_FX[item.rarity];
        const tall = rank >= 3;
        for (let i = 0; i < (tall ? 24 : 10); i += 1) {
          this.fx.later(i * 25, () =>
            fx.burst(
              { x: foe.x + (Math.random() - 0.5) * 16, y: foe.y + 30 },
              {
                count: 2,
                color: [color, '#ffffff'],
                speed: [180, 360],
                angle: -Math.PI / 2,
                spread: 0.08,
                size: [4, 9],
                life: [0.4, 0.8],
                drag: 1,
              }
            )
          );
        }
        fx.emoji({ x: foe.x, y: foe.y - 10 }, item.icon, tall ? 30 : 22, { x: 0, y: -70 }, 1.2);
        if (tall) {
          fx.ring({ x: foe.x, y: foe.y + 20 }, color, 80, 0.8, 5);
          fx.flash(color, 0.15);
        }
        break;
      }
      case 'materials': {
        const { foe } = this.pos();
        fx.emoji(foe, '🔶', 16, { x: -60, y: -160 }, 0.9, 300);
        if (e.cores > 0) fx.emoji(foe, '🔥', 18, { x: 60, y: -180 }, 1, 300);
        break;
      }
      default:
        break;
    }
  }

  private skill(from: Side, skillId: string, amount: number) {
    const { fx } = this;
    const s = this.sides(from);
    const look = SKILLS[skillId] ?? { kind: 'orb', color: '#ffffff', color2: '#cccccc', size: 8 };
    const label = () => {
      if (amount > 0)
        fx.text({ x: s.them.x, y: s.them.y - 50 }, fmt(amount), {
          color: '#ffb3ff',
          size: 22,
          big: true,
        });
    };
    lunge(s.meEl, s.dir, 28);
    // A short glow on the caster tells it's a skill, whatever it is.
    fx.burst(s.me, {
      count: 14,
      color: look.color,
      speed: [30, 90],
      size: [6, 12],
      life: [0.3, 0.6],
      angle: -Math.PI / 2,
      spread: 1.2,
    });
    switch (look.kind) {
      case 'slash': {
        fx.later(110, () => {
          for (let i = 0; i < 18; i += 1) {
            const t = i / 17;
            const a = -2.2 + t * 2.4;
            fx.burst(
              { x: s.them.x + Math.cos(a) * 34 * -s.dir, y: s.them.y + Math.sin(a) * 34 },
              {
                count: 1,
                color: [look.color, look.color2],
                speed: [10, 30],
                size: [7, 11],
                life: [0.2, 0.35],
              }
            );
          }
          fx.burst(s.them, {
            count: 20,
            color: [look.color, '#ffffff'],
            speed: [120, 300],
            shape: 'spark',
            life: [0.2, 0.4],
          });
          flinch(s.themEl, s.dir, true);
          fx.shake(4);
          label();
        });
        break;
      }
      case 'arrows':
        for (let i = 0; i < look.count; i += 1) {
          fx.later(i * 70, () =>
            fx.projectile(
              { x: s.me.x, y: s.me.y - 10 },
              {
                x: s.them.x + (Math.random() - 0.5) * 20,
                y: s.them.y + (Math.random() - 0.5) * 20,
              },
              look.color,
              180,
              6,
              () => {
                fx.burst(s.them, {
                  count: 8,
                  color: [look.color, '#ffffff'],
                  speed: [80, 200],
                  shape: 'spark',
                  life: [0.15, 0.3],
                });
                flinch(s.themEl, s.dir, false);
              },
              30
            )
          );
        }
        fx.later(look.count * 70 + 200, label);
        break;
      case 'orb':
        fx.projectile(
          { x: s.me.x + s.dir * 20, y: s.me.y - 10 },
          s.them,
          look.color,
          look.big ? 140 : 260,
          look.size,
          () => {
            fx.burst(s.them, {
              count: look.big ? 36 : 28,
              color: [look.color, look.color2, '#ffffff'],
              speed: [80, 280],
              size: [4, 10],
              life: [0.3, 0.7],
            });
            fx.ring(s.them, look.color, look.big ? 70 : 50, 0.4, 4);
            flinch(s.themEl, s.dir, true);
            fx.shake(look.big ? 8 : 5);
            if (look.big) fx.flash('#ffffff', 0.18);
            label();
          },
          look.big ? 0 : 24
        );
        break;
      case 'meteor': {
        const sky = { x: s.them.x - s.dir * 80, y: -30 };
        fx.projectile(sky, s.them, look.color, 420, 18, () => {
          fx.burst(s.them, {
            count: 60,
            color: [look.color, look.color2, '#ffffff'],
            speed: [120, 420],
            size: [4, 12],
            life: [0.4, 0.9],
            gravity: 240,
          });
          fx.burst(s.them, {
            count: 10,
            color: look.color,
            speed: [10, 60],
            size: [20, 34],
            life: [0.3, 0.6],
          });
          fx.ring(s.them, look.color2, 110, 0.55, 6);
          flinch(s.themEl, s.dir, true);
          fx.shake(12);
          fx.flash(look.color, 0.3);
          label();
        });
        break;
      }
      case 'nova':
        fx.later(80, () => {
          fx.ring(s.them, look.color, 90, 0.5, 6);
          fx.ring(s.them, look.color2, 60, 0.4, 3);
          fx.burst(s.them, {
            count: 30,
            color: [look.color, look.color2],
            speed: [120, 260],
            size: [3, 7],
            shape: 'shard',
            life: [0.4, 0.8],
            additive: true,
          });
          fx.flash(look.color, 0.18);
          flinch(s.themEl, s.dir, true);
          label();
        });
        break;
      case 'heal':
        for (let i = 0; i < 16; i += 1) {
          fx.later(i * 30, () =>
            fx.burst(
              { x: s.me.x + (Math.random() - 0.5) * 50, y: s.me.y + 30 },
              {
                count: 1,
                color: [look.color, '#ffffff'],
                speed: [60, 140],
                angle: -Math.PI / 2,
                spread: 0.2,
                size: [5, 10],
                life: [0.6, 1],
              }
            )
          );
        }
        fx.ring(s.me, look.color, 60, 0.6, 3);
        if (look.strike) {
          fx.later(250, () => {
            fx.bolt({ x: s.them.x, y: -10 }, s.them, look.strike as string, 0.3);
            fx.burst(s.them, {
              count: 16,
              color: [look.strike as string, '#ffffff'],
              speed: [80, 220],
              shape: 'spark',
            });
            label();
          });
        }
        break;
      case 'shield':
        fx.ring(s.me, look.color, 54, 0.9, 6);
        fx.ring(s.me, '#ffffff', 40, 0.6, 2);
        fx.burst(s.me, {
          count: 24,
          color: [look.color, '#ffffff'],
          speed: [20, 60],
          size: [4, 8],
          life: [0.5, 0.9],
        });
        fx.later(150, () => {
          fx.burst(s.them, { count: 12, color: look.color, speed: [100, 220], shape: 'spark' });
          label();
        });
        break;
      case 'buff':
        fx.ring(s.me, look.color, 64, 0.6, 5);
        fx.burst(s.me, {
          count: 40,
          color: [look.color, '#ff8a80'],
          speed: [60, 200],
          angle: -Math.PI / 2,
          spread: 1,
          size: [4, 9],
          life: [0.5, 1],
        });
        fx.flash(look.color, 0.12);
        break;
      case 'poison':
        fx.later(120, () => {
          fx.burst(s.them, {
            count: 26,
            color: [look.color, look.color2],
            speed: [30, 120],
            size: [4, 10],
            life: [0.6, 1.2],
            gravity: -40,
            additive: false,
          });
          fx.burst(s.them, { count: 14, color: look.color, speed: [100, 220], shape: 'spark' });
          flinch(s.themEl, s.dir, false);
          label();
        });
        break;
      case 'drain': {
        fx.later(60, () => {
          for (let i = 0; i < 12; i += 1) {
            fx.later(i * 30, () =>
              fx.projectile(
                {
                  x: s.them.x + (Math.random() - 0.5) * 30,
                  y: s.them.y + (Math.random() - 0.5) * 30,
                },
                s.me,
                look.color,
                260,
                6,
                undefined,
                30 * (Math.random() - 0.5)
              )
            );
          }
          flinch(s.themEl, s.dir, true);
          label();
        });
        break;
      }
      case 'bolt':
        for (let i = 0; i < look.count; i += 1) {
          fx.later(i * 90, () => {
            fx.bolt({ x: s.them.x + (Math.random() - 0.5) * 60, y: -10 }, s.them, look.color, 0.25);
            fx.burst(s.them, {
              count: 14,
              color: [look.color, '#ffffff'],
              speed: [100, 260],
              shape: 'spark',
            });
            fx.flash(look.color, 0.12);
            flinch(s.themEl, s.dir, true);
          });
        }
        fx.later(look.count * 90, label);
        break;
      case 'curse':
        fx.later(100, () => {
          fx.ring(s.them, look.color, 50, 0.8, 4);
          fx.burst(s.them, {
            count: 30,
            color: [look.color, look.color2],
            speed: [20, 80],
            size: [6, 12],
            life: [0.6, 1.2],
            gravity: -30,
          });
          label();
        });
        break;
      case 'pack':
        for (let i = 0; i < 5; i += 1) {
          fx.later(i * 80, () => {
            fx.emoji({ x: s.me.x, y: s.me.y + 20 }, '🐺', 22, { x: s.dir * 420, y: -40 }, 0.45);
            fx.later(180, () => {
              fx.burst(s.them, {
                count: 10,
                color: [look.color, '#ffffff'],
                speed: [80, 200],
                shape: 'spark',
              });
              flinch(s.themEl, s.dir, false);
            });
          });
        }
        fx.later(600, label);
        break;
      default:
        break;
    }
  }
}
