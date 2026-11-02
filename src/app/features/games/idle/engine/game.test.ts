import { describe, expect, it } from 'vitest';
import { allocate, buyUpgrade, equip, sell, sellUpTo, unequip } from './actions';
import { applyDuel, duel, ratingChange, rivalsFor, toSnapshot } from './arena';
import { BASE_ROWS } from './backpack';
import { getClass } from './classes';
import { generateItem } from './items';
import { OFFLINE_CAP_MS, catchUp } from './offline';
import { advance, heroStats, newGame, xpToNext } from './progress';
import { createRng } from './rng';
import { deserialize, serialize } from './save';
import { GameState } from './types';

const fresh = (): GameState => newGame('Hero', 'ranger', 1234, 0);

const withLoot = (s: GameState, n: number): GameState => {
  const next = structuredClone(s);
  const rng = createRng(9);
  for (let i = 0; i < n; i += 1) {
    const loot = generateItem(rng, getClass('ranger'), `t${i}`, { level: 5, kind: 'ring' });
    next.backpack.items.push({ item: loot, x: i, y: 0, rotated: false });
  }
  return next;
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

  it('moves up stages and levels', () => {
    const s = fresh();
    advance(s, 5 * 60000);
    expect(s.maxStage).toBeGreaterThan(1);
    expect(s.hero.level).toBeGreaterThan(1);
    expect(s.hero.freePoints).toBe(s.hero.level - 1);
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
});

describe('actions', () => {
  it('equips and swaps the old piece into the bag', () => {
    const s = withLoot(fresh(), 2);
    const one = equip(s, 't0');
    expect(one.ok).toBe(true);
    if (!one.ok) return;
    expect(one.state.equipment.ring?.id).toBe('t0');
    const two = equip(one.state, 't1');
    if (!two.ok) throw new Error(two.error);
    expect(two.state.equipment.ring?.id).toBe('t1');
    expect(two.state.backpack.items.some((p) => p.item.id === 't0')).toBe(true);
    // The input is left alone.
    expect(s.equipment.ring).toBeUndefined();
  });

  it('unequips into the bag', () => {
    const r = unequip(fresh(), 'weapon');
    if (!r.ok) throw new Error(r.error);
    expect(r.state.equipment.weapon).toBeUndefined();
    expect(r.state.backpack.items).toHaveLength(1);
  });

  it('sells for gold', () => {
    const s = withLoot(fresh(), 3);
    const r = sell(s, 't0');
    if (!r.ok) throw new Error(r.error);
    expect(r.state.gold).toBeGreaterThan(0);
    const all = sellUpTo(s, 'legendary');
    if (!all.ok) throw new Error(all.error);
    expect(all.state.backpack.items).toHaveLength(0);
  });

  it('spends points and gold', () => {
    const s = fresh();
    expect(allocate(s, 'agi').ok).toBe(false);
    expect(buyUpgrade(s, 'might')).toEqual({ ok: false, error: 'not_enough_gold' });
    const rich = { ...structuredClone(s), gold: 1e6 };
    const r = buyUpgrade(rich, 'satchel');
    if (!r.ok) throw new Error(r.error);
    expect(r.state.backpack.rows).toBe(BASE_ROWS + 1);
    const might = buyUpgrade(rich, 'might');
    if (!might.ok) throw new Error(might.error);
    expect(heroStats(might.state).damage).toBeGreaterThan(heroStats(rich).damage);
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

  it('rejects junk', () => {
    expect(deserialize('nope')).toBeUndefined();
    expect(deserialize('{"version":99}')).toBeUndefined();
    expect(deserialize(null)).toBeUndefined();
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
