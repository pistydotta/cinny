import { describe, it } from 'vitest';
import { fullReport } from './balance';

// The balance report: slow (minutes), so it only runs when asked.
//   HORDE_SIM=1 npx vitest run src/app/features/games/horde/engine/balance.report
// HORDE_SEEDS (runs per hero, default 8) and HORDE_CAMPAIGN (runs per campaign, default 20)
// change its size.
const env = (typeof process !== 'undefined' ? process.env : {}) as Record<string, string>;

describe.skipIf(!env.HORDE_SIM)('horde balance report', () => {
  it('prints the report', () => {
    const seeds = Array.from({ length: Number(env.HORDE_SEEDS ?? 8) }, (_, i) => i + 1);
    // eslint-disable-next-line no-console
    console.log(fullReport(seeds, Number(env.HORDE_CAMPAIGN ?? 20)));
  }, 3_600_000);
});
