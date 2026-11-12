import { playBot } from './bot';
import {
  CHARACTER_IDS,
  META_IDS,
  META_UPGRADES,
  RUN_SECONDS,
  TICK,
  WEAPON_IDS,
  metaCost,
} from './data';
import { playFighter } from './fighter';
import { runGold } from './meta';
import { NO_META, createRun, step } from './run';
import { CharacterId, MetaBonuses, RunState, WeaponId } from './types';

// Numbers for balance decisions, from bots playing many runs. Nothing here runs in the game;
// `balance.report.test.ts` prints a report with HORDE_SIM=1.

export type Bot = 'fighter' | 'flee';

export type RunRow = {
  hero: CharacterId;
  seed: number;
  time: number;
  won: boolean;
  level: number;
  kills: number;
  gold: number;
  damageBy: Partial<Record<WeaponId, number>>;
};

const LIMIT = RUN_SECONDS + 120;

const play = (run: RunState, bot: Bot): RunState =>
  bot === 'fighter' ? playFighter(run, LIMIT) : playBot(run, 1, LIMIT);

const rowOf = (run: RunState): RunRow => ({
  hero: run.character,
  seed: run.seed,
  time: run.time,
  won: run.phase === 'won',
  level: run.player.level,
  kills: run.kills,
  gold: runGold(run),
  damageBy: { ...run.damageBy },
});

export const playRuns = (
  hero: CharacterId,
  seeds: number[],
  meta: MetaBonuses = NO_META,
  bot: Bot = 'fighter'
): RunRow[] => seeds.map((seed) => rowOf(play(createRun(seed, hero, meta), bot)));

export type Summary = {
  runs: number;
  avgTime: number;
  winRate: number;
  avgLevel: number;
  avgKills: number;
  // How many runs ended in each minute (index 0 is the first minute); wins don't count.
  deathsByMinute: number[];
  // Each weapon's share of all damage dealt.
  damageShare: Partial<Record<WeaponId, number>>;
};

export const summarize = (rows: RunRow[]): Summary => {
  const avg = (f: (r: RunRow) => number) =>
    rows.length ? rows.reduce((sum, r) => sum + f(r), 0) / rows.length : 0;
  const deathsByMinute = Array.from({ length: Math.ceil(LIMIT / 60) }, () => 0);
  rows.forEach((r) => {
    if (!r.won && r.time < LIMIT - 1) deathsByMinute[Math.floor(r.time / 60)] += 1;
  });
  const totals: Partial<Record<WeaponId, number>> = {};
  let all = 0;
  rows.forEach((r) =>
    (Object.keys(r.damageBy) as WeaponId[]).forEach((id) => {
      totals[id] = (totals[id] ?? 0) + (r.damageBy[id] ?? 0);
      all += r.damageBy[id] ?? 0;
    })
  );
  const damageShare: Partial<Record<WeaponId, number>> = {};
  (Object.keys(totals) as WeaponId[]).forEach((id) => {
    damageShare[id] = all ? (totals[id] ?? 0) / all : 0;
  });
  return {
    runs: rows.length,
    avgTime: avg((r) => r.time),
    winRate: avg((r) => (r.won ? 1 : 0)),
    avgLevel: avg((r) => r.level),
    avgKills: avg((r) => r.kills),
    deathsByMinute,
    damageShare,
  };
};

// Damage a second of one weapon at one level against training dummies: rings of enemies that
// never die nor move on their own, from right next to the hero to far away. The horde of a
// real run dies too fast to tell the weapons apart.
export const weaponPower = (weapon: WeaponId, level: number, seconds = 20): number => {
  const run = createRun(1, 'janja');
  run.spawnBudget = -1e9;
  run.nextEliteAt = 1e9;
  run.shrines = [];
  // No barrels or pots, and no set pieces of the horde.
  run.enemies = [];
  run.nextHordeEvent = 99;
  run.nextPotsAt = 1e9;
  run.weapons = [{ id: weapon, level, cooldown: 0.3, angle: 0 }];
  [2, 4, 6, 9, 12, 15].forEach((dist, ring) => {
    for (let k = 0; k < 8; k += 1) {
      const angle = (k / 8) * Math.PI * 2 + ring * 0.4;
      run.enemies.push({
        ...{ id: 10000 + ring * 8 + k, kind: 'husk', elite: false, hp: 1e12, maxHp: 1e12 },
        ...{ x: Math.cos(angle) * dist, z: Math.sin(angle) * dist },
        ...{ speed: 0, radius: 0.6, damage: 0, xp: 0, shootCd: 1e9, urnCd: 0 },
        ...{ pushX: 0, pushZ: 0, flash: 0 },
      });
    }
  });
  // The hero walks a circle among them, as a player keeps moving: a fire trail laid in one spot
  // would stack up as no real run does.
  for (let i = 0; i < seconds * 60; i += 1) {
    const { x, z } = run.player;
    const dist = Math.hypot(x, z);
    const out = (dist - 5) / 3;
    step(
      run,
      {
        moveX: -z / (dist || 1) - (x / (dist || 1)) * out + (dist ? 0 : 1),
        moveZ: x / (dist || 1) - (z / (dist || 1)) * out,
        jump: false,
        jumpHeld: false,
        dash: false,
      },
      TICK
    );
  }
  return (run.damageBy[weapon] ?? 0) / seconds;
};

// A new player's first runs: each run's gold buys the cheapest upgrades it can before the
// next. Answers the run (1-based) of the first win, if any, and each run's time.
export const campaign = (
  hero: CharacterId,
  firstSeed: number,
  runs: number,
  bot: Bot = 'fighter'
): { firstWin: number | undefined; times: number[] } => {
  const meta: MetaBonuses = { ...NO_META };
  let gold = 0;
  let firstWin: number | undefined;
  const times: number[] = [];
  for (let i = 0; i < runs && firstWin === undefined; i += 1) {
    const row = rowOf(play(createRun(firstSeed + i, hero, { ...meta }), bot));
    times.push(Math.round(row.time));
    if (row.won) firstWin = i + 1;
    gold += row.gold;
    for (;;) {
      const options = META_IDS.filter((id) => meta[id] < META_UPGRADES[id].max);
      const cheapest = options.sort((a, b) => metaCost(a, meta[a]) - metaCost(b, meta[b]))[0];
      if (!cheapest || metaCost(cheapest, meta[cheapest]) > gold) break;
      gold -= metaCost(cheapest, meta[cheapest]);
      meta[cheapest] += 1;
    }
  }
  return { firstWin, times };
};

// The plan's goals (phase 4.4), checked against a set of summaries.
export type Goals = {
  // A new account dies between minutes 3 and 6.
  newAccountTime: [number, number];
  // No hero wins less than half as often as the best one.
  heroWinRatio: number;
  // No weapon deals less than a third of the best one at the same level.
  weaponRatio: number;
};

export const GOALS: Goals = { newAccountTime: [180, 360], heroWinRatio: 0.5, weaponRatio: 1 / 3 };

const pct = (value: number) => `${Math.round(value * 100)}%`;

export const formatReport = (opts: {
  heroes: Record<string, Summary>;
  veterans: Record<string, Summary>;
  weapons: Record<string, number[]>;
  levels: number[];
  campaigns: Record<string, { firstWin: number | undefined; times: number[] }[]>;
}): string => {
  const lines: string[] = ['BrazilianBonk balance report', ''];
  lines.push('Hero        time  win   level  kills  deaths by minute');
  Object.entries(opts.heroes).forEach(([hero, s]) => {
    lines.push(
      `${hero.padEnd(10)} ${String(Math.round(s.avgTime)).padStart(5)}  ${pct(s.winRate).padStart(
        4
      )}` +
        `  ${s.avgLevel.toFixed(1).padStart(5)}  ${String(Math.round(s.avgKills)).padStart(5)}` +
        `  ${s.deathsByMinute.join(' ')}`
    );
    const shares = Object.entries(s.damageShare)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .map(([id, v]) => `${id} ${pct(v ?? 0)}`)
      .join(', ');
    lines.push(`           damage: ${shares}`);
  });
  lines.push('', 'Veteran account (every upgrade at 3)');
  Object.entries(opts.veterans).forEach(([hero, s]) => {
    lines.push(
      `${hero.padEnd(10)} ${String(Math.round(s.avgTime)).padStart(5)}  ${pct(s.winRate).padStart(
        4
      )}` +
        `  ${s.avgLevel.toFixed(1).padStart(5)}  ${String(Math.round(s.avgKills)).padStart(5)}` +
        `  ${s.deathsByMinute.join(' ')}`
    );
  });
  lines.push('', `Weapon damage a second against dummies, at levels ${opts.levels.join(' / ')}`);
  Object.entries(opts.weapons).forEach(([id, dps]) =>
    lines.push(`${id.padEnd(10)} ${dps.map((v) => v.toFixed(0).padStart(6)).join(' ')}`)
  );
  lines.push('', 'New player campaign (cheapest upgrades after every run)');
  Object.entries(opts.campaigns).forEach(([hero, list]) =>
    list.forEach((c) =>
      lines.push(
        `${hero.padEnd(10)} first win: ${c.firstWin ?? 'none'}   times: ${c.times.join(' ')}`
      )
    )
  );

  // The goals.
  lines.push('', 'Goals');
  const summaries = Object.values(opts.heroes);
  const veterans = Object.values(opts.veterans);
  const avgTime = summaries.reduce((sum, s) => sum + s.avgTime, 0) / (summaries.length || 1);
  const [lo, hi] = GOALS.newAccountTime;
  lines.push(
    `${avgTime >= lo && avgTime <= hi ? 'ok ' : 'NO '} new account dies in minutes 3-6 ` +
      `(average ${(avgTime / 60).toFixed(1)})`
  );
  const best = Math.max(...veterans.map((s) => s.winRate));
  const worst = Math.min(...veterans.map((s) => s.winRate));
  lines.push(
    `${best > 0 && worst >= best * GOALS.heroWinRatio ? 'ok ' : 'NO '} with veteran upgrades, ` +
      `every hero wins at least half as often as the best (best ${pct(best)}, worst ${pct(worst)})`
  );
  opts.levels.forEach((level, i) => {
    const values = Object.entries(opts.weapons).map(([id, dps]) => [id, dps[i]] as const);
    const top = Math.max(...values.map(([, v]) => v));
    const weak = values.filter(([, v]) => v < top * GOALS.weaponRatio).map(([id]) => id);
    const which = weak.length ? ` (${weak.join(', ')})` : '';
    lines.push(
      `${
        weak.length === 0 ? 'ok ' : 'NO '
      } level ${level}: no weapon under a third of the best${which}`
    );
  });
  const wins = Object.values(opts.campaigns).flatMap((list) => list.map((c) => c.firstWin));
  const inRange = wins.every((w) => w !== undefined && w >= 8 && w <= 15);
  lines.push(
    `${inRange ? 'ok ' : 'NO '} first win between runs 8 and 15 ` +
      `(${wins.map((w) => w ?? '-').join(', ')})`
  );
  return lines.join('\n');
};

// Every permanent upgrade at level 3 (the rerolls at 2): an account a few weeks in.
export const VETERAN: MetaBonuses = Object.fromEntries(
  META_IDS.map((id) => [id, Math.min(3, META_UPGRADES[id].max - (id === 'reroll' ? 1 : 0))])
) as MetaBonuses;

export const fullReport = (seeds: number[], campaignRuns: number): string => {
  const heroes: Record<string, Summary> = {};
  const veterans: Record<string, Summary> = {};
  CHARACTER_IDS.forEach((hero) => {
    heroes[hero] = summarize(playRuns(hero, seeds));
    veterans[hero] = summarize(playRuns(hero, seeds, VETERAN));
  });
  const levels = [1, 3, 6];
  const weapons: Record<string, number[]> = {};
  WEAPON_IDS.forEach((id) => {
    weapons[id] = levels.map((level) => weaponPower(id, level));
  });
  const campaigns: Record<string, { firstWin: number | undefined; times: number[] }[]> = {};
  CHARACTER_IDS.forEach((hero) => {
    campaigns[hero] = [1000, 2000].map((first) => campaign(hero, first, campaignRuns));
  });
  return formatReport({ heroes, veterans, weapons, levels, campaigns });
};
