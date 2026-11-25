import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const bundleFile = new URL('../../../../../../../api/src/football/engine.gen.js', import.meta.url);

describe('football engine for the API', () => {
  it('is bundled up to date (run scripts/build-football-engine.mjs)', async () => {
    const { bundleFootballEngine } = await import(
      '../../../../../../scripts/build-football-engine.mjs'
    );
    expect(readFileSync(bundleFile, 'utf8') === (await bundleFootballEngine())).toBe(true);
  });
});
