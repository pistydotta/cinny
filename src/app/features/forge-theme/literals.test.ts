import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// A ratchet on the literals left in our style files: colours, font sizes, shadows and z-indexes
// written by hand instead of taken from palette.ts, forgeColor or tokens.ts. A count may only
// go down. If yours went down, lower its ceiling here; if a change needs a new literal, use a
// token instead. games/ joins once the games share the stage kit; until then each game keeps its
// own palette (see docs/ui-review-2026-11.md).
const CEILING = {
  hex: 54,
  fontSize: 58,
  boxShadow: 25,
  zIndex: 4,
  pill: 0,
};

const PATTERNS: Record<keyof typeof CEILING, RegExp> = {
  hex: /#[0-9A-Fa-f]{3,8}\b/g,
  fontSize: /fontSize:\s*('[\d.]+px'|[\d.]+\b|toRem\([\d.]+\))/g,
  // A shadow with a length in it; 'none' and token references don't count.
  boxShadow: /boxShadow:\s*['`][^'`]*\d+(px)?\s/g,
  // 0–3 order things inside a component; anything higher is a layer and needs a token.
  zIndex: /zIndex:\s*([4-9]|[1-9]\d+)\b/g,
  // A hand-written pill (999px): chips and buttons are square; real pills use forgeRadius.pill.
  pill: /borderRadius:\s*(toRem\(|')?9{3,}/g,
};

const FEATURES = join(__dirname, '..');
const SKIP = ['games'];

const styleFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return SKIP.includes(relative(FEATURES, path)) ? [] : styleFiles(path);
    }
    return name.endsWith('.css.ts') ? [path] : [];
  });

const count = (pattern: RegExp) =>
  styleFiles(FEATURES).reduce(
    (sum, file) => sum + (readFileSync(file, 'utf8').match(pattern)?.length ?? 0),
    0
  );

describe('style literals outside the token files', () => {
  (Object.keys(CEILING) as (keyof typeof CEILING)[]).forEach((kind) => {
    it(`has no more ${kind} literals than before`, () => {
      expect(count(PATTERNS[kind])).toBeLessThanOrEqual(CEILING[kind]);
    });
  });
});
