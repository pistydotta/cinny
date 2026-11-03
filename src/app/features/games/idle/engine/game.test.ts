import { describe, expect, it } from 'vitest';
import {
  bulkClear,
  buyAltar,
  buyUpgrade,
  chooseSpec,
  equip,
  equipBest,
  forge,
  learnTalent,
  rebirth,
  salvage,
  sell,
  setAutoSalvage,
  toggleLock,
  unequip,
} from './actions';
import { applyDuel, duel, ratingChange, rivalsFor, toSnapshot } from './arena';
import { SPEC_LEVEL, getClass } from './classes';
import { generateItem } from './items';
import { OFFLINE_CAP_MS, catchUp } from './offline';
import { ashesFor, rebirthStage } from './prestige';
import {
  BASE_CAPACITY,
  CAPACITY_PER_SATCHEL,
  advance,
  availableTalentPoints,
  capacityOf,
  heroStats,
  newGame,
  stash,
  xpToNext,
} from './progress';
import { createRng } from './rng';
import { deserialize, isOldSave, serialize } from './save';
import { GameState } from './types';

const fresh = (): GameState => newGame('Hero', 'archer', 1234, 0);

const withLoot = (s: GameState, n: number, level = 5): GameState => {
  const next = structuredClone(s);
  const rng = createRng(9);
  for (let i = 0; i < n; i += 1) {
    next.inventory.push({
      ...generateItem(rng, getClass('archer'), `t${i}`, { level, kind: 'ring' }),
      id: `t${i}`,
    });
  }
  return next;
};

const must = (r: { ok: true; state: GameState } | { ok: false; error: string }): GameState => {
  if (!r.ok) throw new Error(r.error);
  return r.state;
};

describe('progress', () => {
  it('starts with a weapon and kills the first enemies', () => {
    const s = fresh();
    expect(s.equipment.weapon?.kind).toBe('weapon');
    const events = advance(s, 60000);
    expect(s.lifetime.kills).toBeGreaterThan(5);
    expect(s.gold).toBeGreaterThan(0);
    expect(events.some((e) => e.t === 'kill')).toBe(true);
  });

  it('moves up stages and levels, a talent point per level', () => {
    const s = fresh();
    advance(s, 5 * 60000);
    expect(s.maxStage).toBeGreaterThan(1);
    expect(s.hero.level).toBeGreaterThan(1);
    expect(availableTalentPoints(s)).toBe(s.hero.level - 1);
  });

  it('is the same game for the same seed', () => {
    const a = fresh();
    const b = fresh();
    advance(a, 120000);
    advance(b, 120000);
    expect(serialize(a)).toBe(serialize(b));
  });

  it('needs more xp each level', () => {
    expect(xpToNext(10)).toBeGreaterThan(xpToNext(9));
  });

  it('keeps a loot history and salvages what there is no room for', () => {
    const s = fresh();
    s.upgrades.satchel = 0;
    const rng = createRng(4);
    for (let i = 0; i < BASE_CAPACITY + 3; i += 1) {
      stash(
        s,
        generateItem(rng, getClass('archer'), `x${i}`, {
          level: 1,
          rarity: 'common',
          kind: 'feet',
        }),
        []
      );
    }
    expect(s.inventory.length).toBeLessThanOrEqual(BASE_CAPACITY);
    expect(s.materials.stones).toBeGreaterThan(0);
    expect(s.loot.length).toBeGreaterThan(0);
    expect(s.loot.some((l) => l.fate === 'salvaged')).toBe(true);
  });

  it('auto-salvages low drops unless they are upgrades', () => {
    const s = must(setAutoSalvage(fresh(), 'rare'));
    const rng = createRng(4);
    // The hero has no boots, so the first pair is an upgrade and stays.
    stash(
      s,
      generateItem(rng, getClass('archer'), 'b1', { level: 1, rarity: 'common', kind: 'feet' }),
      []
    );
    expect(s.inventory.map((i) => i.id)).toEqual(['b1']);
    s.equipment.feet = generateItem(rng, getClass('archer'), 'b0', {
      level: 50,
      rarity: 'epic',
      kind: 'feet',
    });
    stash(
      s,
      generateItem(rng, getClass('archer'), 'b2', { level: 1, rarity: 'common', kind: 'feet' }),
      []
    );
    expect(s.inventory.map((i) => i.id)).toEqual(['b1']);
    expect(s.loot[s.loot.length - 1].fate).toBe('salvaged');
  });
});

describe('actions', () => {
  it('equips and swaps the old piece into the inventory', () => {
    const s = withLoot(fresh(), 2);
    const one = must(equip(s, 't0'));
    expect(one.equipment.ring?.id).toBe('t0');
    const two = must(equip(one, 't1'));
    expect(two.equipment.ring?.id).toBe('t1');
    expect(two.inventory.some((i) => i.id === 't0')).toBe(true);
    // The input is left alone.
    expect(s.equipment.ring).toBeUndefined();
  });

  it('equips the best of each slot', () => {
    const s = withLoot(fresh(), 3);
    const next = must(equipBest(s));
    expect(next.equipment.ring).toBeDefined();
    expect(equipBest(next).ok).toBe(false);
  });

  it('unequips into the inventory', () => {
    const r = must(unequip(fresh(), 'weapon'));
    expect(r.equipment.weapon).toBeUndefined();
    expect(r.inventory).toHaveLength(1);
  });

  it('sells and salvages, but not locked items', () => {
    const s = withLoot(fresh(), 3);
    expect(must(sell(s, 't0')).gold).toBeGreaterThan(0);
    expect(must(salvage(s, 't0')).materials.stones).toBeGreaterThan(0);
    const locked = must(toggleLock(s, 't0'));
    // Bulk clean-up keeps upgrades, so give the hero a ring none of these beat.
    locked.equipment.ring = generateItem(createRng(1), getClass('archer'), 'best', {
      level: 90,
      rarity: 'mythic',
      kind: 'ring',
    });
    expect(sell(locked, 't0')).toEqual({ ok: false, error: 'locked' });
    const cleared = must(bulkClear(locked, 'mythic', 'salvage'));
    expect(cleared.inventory.map((i) => i.id)).toContain('t0');
  });

  it('forges with stones and gold, from the inventory or equipped', () => {
    const s = withLoot(fresh(), 1);
    expect(forge(s, 't0')).toEqual({ ok: false, error: 'not_enough_gold' });
    const rich = { ...structuredClone(s), gold: 1e9, materials: { stones: 1e6, cores: 1e6 } };
    const r = forge(rich, 't0');
    if (!r.ok) throw new Error(r.error);
    expect(r.outcome).toBe('success');
    expect(r.state.inventory[0].plus).toBe(1);
    expect(r.state.materials.stones).toBeLessThan(1e6);
    const w = forge(rich, 'i1');
    if (!w.ok) throw new Error(w.error);
    expect(w.state.equipment.weapon?.plus).toBe(1);
  });

  it('learns talents with points and in order', () => {
    const s = fresh();
    expect(learnTalent(s, 'sharpness')).toEqual({ ok: false, error: 'no_points' });
    const leveled = { ...structuredClone(s), hero: { ...s.hero, level: 30 } };
    const one = must(learnTalent(leveled, 'sharpness'));
    expect(heroStats(one).damage).toBeGreaterThan(heroStats(leveled).damage);
    expect(learnTalent(one, 'frenzy')).toEqual({ ok: false, error: 'too_early' });
  });

  it('specializes once, at the right level', () => {
    const s = fresh();
    expect(chooseSpec(s, 'sniper')).toEqual({ ok: false, error: 'too_early' });
    const leveled = { ...structuredClone(s), hero: { ...s.hero, level: SPEC_LEVEL } };
    expect(chooseSpec(leveled, 'pyromancer')).toEqual({ ok: false, error: 'not_found' });
    const spec = must(chooseSpec(leveled, 'sniper'));
    expect(spec.hero.specId).toBe('sniper');
    expect(chooseSpec(spec, 'beastmaster').ok).toBe(false);
  });

  it('grows the inventory with the satchel', () => {
    const rich = { ...structuredClone(fresh()), gold: 1e9 };
    const next = must(buyUpgrade(rich, 'satchel'));
    expect(capacityOf(next)).toBe(BASE_CAPACITY + CAPACITY_PER_SATCHEL);
  });
});

describe('rebirth', () => {
  it('needs the stage, pays ashes and keeps gear', () => {
    const s = withLoot(fresh(), 2);
    expect(rebirth(s).ok).toBe(false);
    const deep: GameState = {
      ...structuredClone(s),
      maxStage: 80,
      stage: 80,
      gold: 5000,
      hero: { ...s.hero, level: 70, specId: 'sniper', talents: { sharpness: 5 } },
      upgrades: { might: 10, satchel: 2 },
    };
    const next = must(rebirth(deep));
    expect(next.prestige.rebirths).toBe(1);
    expect(next.prestige.ashes).toBe(ashesFor(80));
    expect(next.hero).toMatchObject({ level: 1, specId: 'sniper', talents: {} });
    expect(next.gold).toBe(0);
    expect(next.stage).toBe(1);
    expect(next.upgrades).toEqual({ satchel: 2 });
    expect(next.inventory).toHaveLength(2);
    expect(next.equipment.weapon).toBeDefined();
    // The next one asks for more.
    expect(rebirth({ ...next, maxStage: 80 }).ok).toBe(rebirthStage(1) <= 80);
  });

  it('spends ashes at the altar', () => {
    const s = {
      ...structuredClone(fresh()),
      prestige: { rebirths: 1, ashes: 10, ashesEarned: 10, altar: {} },
    };
    const next = must(buyAltar(s, 'ember_might'));
    expect(next.prestige.ashes).toBeLessThan(10);
    expect(heroStats(next).damage).toBeGreaterThan(heroStats(s).damage);
    expect(buyAltar(fresh(), 'ember_might').ok).toBe(false);
  });
});

describe('offline', () => {
  it('plays short gaps and estimates long ones, capped', () => {
    const s = fresh();
    advance(s, 60000);
    const short = catchUp(s, 30000);
    expect(short.kills).toBeGreaterThan(0);
    const long = catchUp(s, 100 * OFFLINE_CAP_MS);
    expect(long.elapsedMs).toBe(OFFLINE_CAP_MS);
    expect(long.gold).toBeGreaterThan(0);
    expect(long.xp).toBeGreaterThan(0);
  });
});

describe('save', () => {
  it('round-trips without the fight in progress', () => {
    const s = fresh();
    advance(s, 3000);
    const back = deserialize(serialize(s));
    expect(back?.hero).toEqual(s.hero);
    expect(back?.battle).toBeNull();
  });

  it('rejects junk and the old version', () => {
    expect(deserialize('nope')).toBeUndefined();
    expect(deserialize('{"version":99}')).toBeUndefined();
    expect(deserialize(null)).toBeUndefined();
    expect(deserialize('{"version":1,"hero":{}}')).toBeUndefined();
    expect(isOldSave('{"version":1}')).toBe(true);
    expect(isOldSave(serialize(fresh()))).toBe(false);
  });
});

describe('arena', () => {
  it('replays a duel the same way from its seed', () => {
    const s = fresh();
    advance(s, 120000);
    const me = toSnapshot(s, '@me:x');
    const [rival] = rivalsFor(s, '@me:x', '2026-11-01');
    const a = duel(me, rival, 77);
    const b = duel(me, rival, 77);
    expect(a.winner).toBe(b.winner);
    expect(a.durationMs).toBe(b.durationMs);
  });

  it('keeps the same rivals for a day', () => {
    const s = fresh();
    expect(rivalsFor(s, 'u', 'd')).toEqual(rivalsFor(s, 'u', 'd'));
    expect(rivalsFor(s, 'u', 'd')).toHaveLength(3);
  });

  it('rates like elo', () => {
    expect(ratingChange(1000, 1000, true)).toBe(16);
    expect(ratingChange(1000, 1400, true)).toBeGreaterThan(16);
    expect(applyDuel({ rating: 1000, wins: 0, losses: 0 }, 1000, false)).toEqual({
      rating: 984,
      wins: 0,
      losses: 1,
    });
  });
});
