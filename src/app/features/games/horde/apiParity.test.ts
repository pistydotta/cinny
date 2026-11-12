import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { META_UPGRADES } from './engine/data';
import { dailyChallenge } from './engine/daily';

// The server sells the upgrades and checks daily runs with its own copy of these numbers
// (api/src/horde.js). The public mirror has only web/, so there this test has nothing to read.
const apiFile = new URL('../../../../../../api/src/horde.js', import.meta.url);
const bundleFile = new URL('../../../../../../api/src/hordeEngine.gen.js', import.meta.url);
const api = existsSync(apiFile) ? readFileSync(apiFile, 'utf8') : undefined;

describe.skipIf(!api)('horde: game and server agree', () => {
  it('on every upgrade and its price', () => {
    const block = /export const UPGRADES = (\{[\s\S]*?\n\});/.exec(api ?? '')?.[1];
    // eslint-disable-next-line no-new-func
    const upgrades = new Function(`return ${block};`)();
    expect(upgrades).toEqual(META_UPGRADES);
  });

  it('on the daily challenge of any day', () => {
    const source = /(const fnv = [\s\S]*?\n};\n)export const dailyChallenge = ([\s\S]*?\n};)/.exec(
      api ?? ''
    );
    const characters = /export const CHARACTERS = (\[[^\]]*\]);/.exec(api ?? '')?.[1];
    // eslint-disable-next-line no-new-func
    const serverDaily = new Function(
      `const CHARACTERS = ${characters};\n${source?.[1]}\nreturn ${source?.[2]}`
    )();
    ['2026-11-12', '2027-01-01', '2026-02-28'].forEach((day) => {
      const { seed, character } = dailyChallenge(day);
      expect(serverDaily(day)).toEqual({ seed, character });
    });
  });

  it('has the engine bundled for the API up to date (run scripts/build-horde-engine.mjs)', async () => {
    const { bundleHordeEngine } = await import('../../../../../scripts/build-horde-engine.mjs');
    const fresh = await bundleHordeEngine();
    expect(readFileSync(bundleFile, 'utf8') === fresh).toBe(true);
  }, 30000);
});
