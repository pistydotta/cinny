/* eslint-disable no-param-reassign */
// The combat loop mutates the Battle it is given: it runs ten times a second and owns that
// object, so copying it each step would only make garbage. Callers that need the old value
// (tests, replays) keep their own copy.
import { Rng, chance, rollRange } from './rng';
import { sumMods } from './stats';
import { Battle, CombatEvent, Fighter, Side, SkillDef, Stats } from './types';

export const STEP_MS = 100;
export const PET_MS = 1000;
export const EXECUTE_BELOW = 0.3;

export const makeFighter = (
  name: string,
  icon: string,
  level: number,
  stats: Stats,
  skills: SkillDef[] = []
): Fighter => ({
  name,
  icon,
  level,
  stats,
  // Staggered, so two skills don't always go off together.
  skills: skills.map((def, i) => ({ def, ms: def.cooldownMs * (0.4 + i * 0.3) })),
  hp: stats.maxHp,
  shield: 0,
  shieldMs: 0,
  attackMs: 1000 / stats.attackSpeed / 2,
  petMs: PET_MS,
  stunMs: 0,
  buffs: [],
  dots: [],
});

/** Stats with the fighter's buffs and curses on top. */
export const liveStats = (f: Fighter): Stats => {
  if (f.buffs.length === 0) return f.stats;
  const m = sumMods(f.buffs.map((b) => b.mods));
  return {
    ...f.stats,
    damage: f.stats.damage * Math.max(0.1, 1 + (m.damagePct ?? 0)),
    attackSpeed: f.stats.attackSpeed * Math.max(0.2, 1 + (m.attackSpeedPct ?? 0)),
    critChance: Math.min(1, f.stats.critChance + (m.critChance ?? 0)),
    dodge: Math.min(0.75, f.stats.dodge + (m.dodge ?? 0)),
    lifesteal: f.stats.lifesteal + (m.lifesteal ?? 0),
    armor: Math.max(0, f.stats.armor + (m.armor ?? 0)),
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

/** Rage and execute: more damage the lower your life, and against a foe almost down. */
const situational = (self: Fighter, other: Fighter): number => {
  const s = self.stats;
  let mult = 1;
  if (s.rage > 0) mult *= 1 + s.rage * (1 - self.hp / s.maxHp);
  if (s.execute > 0 && other.hp / other.stats.maxHp < EXECUTE_BELOW) mult *= 1 + s.execute;
  return mult;
};

const rollHit = (
  s: Stats,
  multiplier: number,
  rng: Rng,
  forceCrit = false
): { amount: number; crit: boolean } => {
  const crit = forceCrit || chance(rng, s.critChance);
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
  const strike = (multiplier: number, forceCrit?: boolean): number => {
    const hit = rollHit(s, multiplier * s.skillPower * situational(self, other), rng, forceCrit);
    const dealt = mitigate(hit.amount, liveStats(other).armor, self.level);
    takeDamage(other, dealt);
    heal(self, dealt * s.lifesteal);
    total += dealt;
    return dealt;
  };

  skill.effects.forEach((effect) => {
    switch (effect.kind) {
      case 'strike':
        for (let i = 0; i < (effect.hits ?? 1); i += 1)
          strike(effect.multiplier, effect.alwaysCrit);
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
      case 'curse':
        other.buffs.push({ mods: effect.mods, ms: effect.durationMs });
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
  const hit = rollHit(s, situational(self, other), rng);
  const dealt = mitigate(hit.amount, liveStats(other).armor, self.level);
  takeDamage(other, dealt);
  heal(self, dealt * s.lifesteal);
  events.push({ t: 'hit', from: side, amount: Math.round(dealt), crit: hit.crit });
  if (other.stats.thorns > 0 && other.hp > 0) {
    const back = dealt * other.stats.thorns;
    takeDamage(self, back);
    events.push({ t: 'thorns', from: side === 'hero' ? 'foe' : 'hero', amount: Math.round(back) });
  }
};

const petAttack = (self: Fighter, other: Fighter, side: Side, rng: Rng, events: CombatEvent[]) => {
  const s = liveStats(self);
  const amount = s.damage * s.petPower * rollRange(rng, 0.9, 1.1);
  const dealt = mitigate(amount, liveStats(other).armor, self.level);
  takeDamage(other, dealt);
  events.push({ t: 'pet', from: side, amount: Math.round(dealt) });
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
  self.skills.forEach((sk) => {
    sk.ms = Math.max(0, sk.ms - dt);
  });
  self.attackMs = Math.max(0, self.attackMs - dt);
  // The companion keeps fighting while its owner is stunned.
  if (self.stats.petPower > 0) {
    self.petMs -= dt;
    if (self.petMs <= 0) {
      petAttack(self, other, side, rng, events);
      self.petMs += PET_MS;
      if (other.hp <= 0) return;
    }
  }
  if (self.stunMs > 0) {
    self.stunMs = Math.max(0, self.stunMs - dt);
    return;
  }
  const ready = self.skills.find((sk) => sk.ms <= 0);
  if (ready) {
    castSkill(self, other, side, ready.def, rng, events);
    ready.ms = ready.def.cooldownMs * (1 - self.stats.cooldownReduction);
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
