/* eslint-disable no-param-reassign */
// The combat loop mutates the Battle it is given: it runs ten times a second and owns that
// object, so copying it each step would only make garbage. Callers that need the old value
// (tests, replays) keep their own copy.
import { Rng, chance, rollRange } from './rng';
import { sumMods } from './stats';
import { Battle, CombatEvent, Fighter, Side, SkillDef, Stats } from './types';

export const STEP_MS = 100;

export const makeFighter = (
  name: string,
  icon: string,
  level: number,
  stats: Stats,
  skill?: SkillDef
): Fighter => ({
  name,
  icon,
  level,
  stats,
  skill,
  hp: stats.maxHp,
  shield: 0,
  shieldMs: 0,
  attackMs: 1000 / stats.attackSpeed / 2,
  skillMs: skill ? skill.cooldownMs / 2 : 0,
  stunMs: 0,
  buffs: [],
  dots: [],
});

/** Stats with the fighter's active buffs on top. */
export const liveStats = (f: Fighter): Stats => {
  if (f.buffs.length === 0) return f.stats;
  const m = sumMods(f.buffs.map((b) => b.mods));
  return {
    ...f.stats,
    damage: f.stats.damage * (1 + (m.damagePct ?? 0)),
    attackSpeed: f.stats.attackSpeed * (1 + (m.attackSpeedPct ?? 0)),
    critChance: Math.min(1, f.stats.critChance + (m.critChance ?? 0)),
    dodge: Math.min(0.75, f.stats.dodge + (m.dodge ?? 0)),
    lifesteal: f.stats.lifesteal + (m.lifesteal ?? 0),
    armor: f.stats.armor + (m.armor ?? 0),
  };
};

/** Armor works against the attacker's level, so it never makes anyone untouchable. */
export const mitigate = (amount: number, armor: number, attackerLevel: number): number =>
  amount * (1 - armor / (armor + 100 + attackerLevel * 15));

const takeDamage = (target: Fighter, amount: number) => {
  const absorbed = Math.min(target.shield, amount);
  target.shield -= absorbed;
  target.hp = Math.max(0, target.hp - (amount - absorbed));
};

const heal = (f: Fighter, amount: number): number => {
  const before = f.hp;
  f.hp = Math.min(f.stats.maxHp, f.hp + amount);
  return f.hp - before;
};

const rollHit = (s: Stats, multiplier: number, rng: Rng): { amount: number; crit: boolean } => {
  const crit = chance(rng, s.critChance);
  const amount = s.damage * multiplier * rollRange(rng, 0.85, 1.15) * (crit ? s.critDamage : 1);
  return { amount, crit };
};

const castSkill = (
  self: Fighter,
  other: Fighter,
  side: Side,
  skill: SkillDef,
  rng: Rng,
  events: CombatEvent[]
) => {
  const s = liveStats(self);
  let total = 0;
  const strike = (multiplier: number): number => {
    const hit = rollHit(s, multiplier * s.skillPower, rng);
    const dealt = mitigate(hit.amount, liveStats(other).armor, self.level);
    takeDamage(other, dealt);
    heal(self, dealt * s.lifesteal);
    total += dealt;
    return dealt;
  };

  skill.effects.forEach((effect) => {
    switch (effect.kind) {
      case 'strike':
        for (let i = 0; i < (effect.hits ?? 1); i += 1) strike(effect.multiplier);
        break;
      case 'drain':
        heal(self, strike(effect.multiplier) * effect.healPct);
        break;
      case 'heal': {
        const healed = heal(self, self.stats.maxHp * effect.pctMaxHp * s.skillPower);
        if (healed > 0) events.push({ t: 'heal', from: side, amount: Math.round(healed) });
        break;
      }
      case 'shield':
        self.shield = Math.max(self.shield, self.stats.maxHp * effect.pctMaxHp * s.skillPower);
        self.shieldMs = effect.durationMs;
        break;
      case 'dot':
        other.dots.push({
          dps: (s.damage * effect.multiplier * s.skillPower) / (effect.durationMs / 1000),
          ms: effect.durationMs,
        });
        break;
      case 'buff':
        self.buffs.push({ mods: effect.mods, ms: effect.durationMs });
        break;
      case 'stun':
        other.stunMs = Math.max(other.stunMs, effect.durationMs);
        break;
      default:
        break;
    }
  });
  events.push({ t: 'skill', from: side, skillId: skill.id, amount: Math.round(total) });
};

const attack = (self: Fighter, other: Fighter, side: Side, rng: Rng, events: CombatEvent[]) => {
  const s = liveStats(self);
  if (chance(rng, liveStats(other).dodge)) {
    events.push({ t: 'dodge', from: side });
    return;
  }
  const hit = rollHit(s, 1, rng);
  const dealt = mitigate(hit.amount, liveStats(other).armor, self.level);
  takeDamage(other, dealt);
  heal(self, dealt * s.lifesteal);
  events.push({ t: 'hit', from: side, amount: Math.round(dealt), crit: hit.crit });
};

const tickStatus = (f: Fighter, dt: number) => {
  const sec = dt / 1000;
  f.dots.forEach((d) => takeDamage(f, d.dps * Math.min(sec, d.ms / 1000)));
  if (f.hp > 0) heal(f, f.stats.regen * sec);
  f.dots = f.dots.filter((d) => {
    d.ms -= dt;
    return d.ms > 0;
  });
  f.buffs = f.buffs.filter((b) => {
    b.ms -= dt;
    return b.ms > 0;
  });
  if (f.shieldMs > 0) {
    f.shieldMs -= dt;
    if (f.shieldMs <= 0) f.shield = 0;
  }
};

const act = (
  self: Fighter,
  other: Fighter,
  side: Side,
  dt: number,
  rng: Rng,
  events: CombatEvent[]
) => {
  self.skillMs = Math.max(0, self.skillMs - dt);
  self.attackMs = Math.max(0, self.attackMs - dt);
  if (self.stunMs > 0) {
    self.stunMs = Math.max(0, self.stunMs - dt);
    return;
  }
  if (self.skill && self.skillMs <= 0) {
    castSkill(self, other, side, self.skill, rng, events);
    self.skillMs = self.skill.cooldownMs * (1 - self.stats.cooldownReduction);
    if (other.hp <= 0) return;
  }
  if (self.attackMs <= 0) {
    attack(self, other, side, rng, events);
    self.attackMs = 1000 / liveStats(self).attackSpeed;
  }
};

export type Outcome = 'hero' | 'foe' | 'timeout' | null;

export const outcomeOf = (b: Battle): Outcome => {
  if (b.foe.hp <= 0) return 'hero';
  if (b.hero.hp <= 0) return 'foe';
  if (b.timeLimitMs !== undefined && b.elapsedMs >= b.timeLimitMs) return 'timeout';
  return null;
};

/** Runs one fixed step. Both sides act in the same step, the hero first. */
export const stepBattle = (b: Battle, rng: Rng): CombatEvent[] => {
  const events: CombatEvent[] = [];
  if (outcomeOf(b)) return events;
  tickStatus(b.hero, STEP_MS);
  tickStatus(b.foe, STEP_MS);
  if (b.hero.hp > 0 && b.foe.hp > 0) act(b.hero, b.foe, 'hero', STEP_MS, rng, events);
  if (b.hero.hp > 0 && b.foe.hp > 0) act(b.foe, b.hero, 'foe', STEP_MS, rng, events);
  b.elapsedMs += STEP_MS;
  return events;
};
