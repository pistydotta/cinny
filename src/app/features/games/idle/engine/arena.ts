import { CLASSES, SPEC_LEVEL, getClass, looksOf, skillsOf } from './classes';
import { makeFighter, outcomeOf, stepBattle } from './combat';
import { generateItem, itemMods } from './items';
import { createRng, hashSeed, pick, rollInt } from './rng';
import { altarMore } from './prestige';
import { heroStats } from './progress';
import { computeStats, powerOf } from './stats';
import { ArenaRecord, ClassId, CombatEvent, GameState, SLOTS, SpecId, Stats } from './types';

// PvP, built to go online later. A fighter is a snapshot: a frozen copy of a hero's final
// stats. Today the rivals are made up here; later the server hands out other players'
// snapshots and replays the duel with the same seed to check the result, which works because
// the duel is deterministic.

export type HeroSnapshot = {
  /** Matrix user ID once online; a made-up key for local rivals. */
  id: string;
  name: string;
  classId: ClassId;
  specId?: SpecId;
  level: number;
  stats: Stats;
  rating: number;
  rebirths: number;
};

export const DUEL_LIMIT_MS = 60000;

export const toSnapshot = (s: GameState, id: string): HeroSnapshot => ({
  id,
  name: s.hero.name,
  classId: s.hero.classId,
  specId: s.hero.specId,
  level: s.hero.level,
  stats: heroStats(s),
  rating: s.arena.rating,
  rebirths: s.prestige.rebirths,
});

export type DuelResult = {
  winner: 'a' | 'b';
  durationMs: number;
  events: CombatEvent[];
  /** Life left at the end, 0..1, for the result screen. */
  hpLeft: { a: number; b: number };
};

/** Both sides at full life; on the time limit, whoever has more life left wins. */
export const duel = (a: HeroSnapshot, b: HeroSnapshot, seed: number): DuelResult => {
  const rng = createRng(seed);
  const ca = getClass(a.classId);
  const cb = getClass(b.classId);
  const battle = {
    hero: makeFighter(a.name, looksOf(ca, a.specId).icon, a.level, a.stats, skillsOf(ca, a.specId)),
    foe: makeFighter(b.name, looksOf(cb, b.specId).icon, b.level, b.stats, skillsOf(cb, b.specId)),
    elapsedMs: 0,
    boss: false,
    timeLimitMs: DUEL_LIMIT_MS,
  };
  const events: CombatEvent[] = [];
  while (!outcomeOf(battle)) events.push(...stepBattle(battle, rng));
  const hpLeft = {
    a: battle.hero.hp / battle.hero.stats.maxHp,
    b: battle.foe.hp / battle.foe.stats.maxHp,
  };
  const outcome = outcomeOf(battle);
  let winner: 'a' | 'b' = outcome === 'hero' ? 'a' : 'b';
  if (outcome === 'timeout') winner = hpLeft.a >= hpLeft.b ? 'a' : 'b';
  return { winner, durationMs: battle.elapsedMs, events, hpLeft };
};

export const ELO_K = 32;

export const ratingChange = (mine: number, theirs: number, won: boolean): number => {
  const expected = 1 / (1 + 10 ** ((theirs - mine) / 400));
  return Math.round(ELO_K * ((won ? 1 : 0) - expected));
};

export const applyDuel = (record: ArenaRecord, theirs: number, won: boolean): ArenaRecord => ({
  rating: Math.max(0, record.rating + ratingChange(record.rating, theirs, won)),
  wins: record.wins + (won ? 1 : 0),
  losses: record.losses + (won ? 0 : 1),
});

const RIVAL_NAMES = [
  'Kael',
  'Lyra',
  'Thorn',
  'Vex',
  'Mira',
  'Drogan',
  'Sable',
  'Orin',
  'Nyx',
  'Bram',
  'Isolde',
  'Zarek',
];

/**
 * Three made-up rivals near the hero's strength, the same for a whole `day` so refreshing the
 * screen doesn't reroll them. Their gear is rolled like real loot from the hero's best stage.
 */
export const rivalsFor = (s: GameState, userId: string, day: string): HeroSnapshot[] => {
  const rng = createRng(hashSeed(`${userId}|${day}|${s.arena.wins + s.arena.losses}`));
  const spreads = [-0.15, 0, 0.2];
  return spreads.map((spread, i) => {
    const cls = pick(rng, CLASSES);
    const level = Math.max(1, s.hero.level + rollInt(rng, -2, 2));
    const gearLevel = Math.max(1, Math.round(s.maxStage * (1 + spread)));
    const mods = SLOTS.map((slot, n) =>
      itemMods(
        generateItem(rng, cls, `r${i}-${n}`, {
          level: gearLevel,
          kind: slot,
          rarity: pick(rng, ['uncommon', 'rare', 'rare', 'epic'] as const),
        })
      )
    );
    const spec = level >= SPEC_LEVEL ? pick(rng, cls.specs) : undefined;
    // Talents, roughly: a point per level split between damage and life.
    const points = level - 1;
    mods.push({ damagePct: 0.02 * points, maxHpPct: 0.02 * points }, spec?.passive ?? {});
    return {
      id: `rival:${i}`,
      name: pick(rng, RIVAL_NAMES),
      classId: cls.id,
      specId: spec?.id,
      level,
      stats: computeStats({ cls, level, mods, more: altarMore(s.prestige) }),
      rating: Math.max(0, s.arena.rating + Math.round(spread * 400) + rollInt(rng, -25, 25)),
      rebirths: s.prestige.rebirths,
    };
  });
};

export const snapshotPower = (snap: HeroSnapshot): number => powerOf(snap.stats);

/** One arena fight: the duel's seed comes from the save's rng, so it can be replayed. */
export const fightRival = (
  s: GameState,
  myId: string,
  rival: HeroSnapshot
): { state: GameState; result: DuelResult } => {
  const rng = createRng(s.rngState);
  const seed = Math.floor(rng.next() * 4294967296);
  const result = duel(toSnapshot(s, myId), rival, seed);
  const state = structuredClone(s);
  state.rngState = rng.state();
  state.arena = applyDuel(s.arena, rival.rating, result.winner === 'a');
  return { state, result };
};
