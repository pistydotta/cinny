import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { foldsClasses } from './foldsClasses';

const bundle = readFileSync(createRequire(import.meta.url).resolve('folds'), 'utf8');

describe('folds class names the Forge shell targets', () => {
  (Object.keys(foldsClasses) as (keyof typeof foldsClasses)[]).forEach((name) => {
    it(`still match folds' ${name} recipe`, () => {
      const { base, ...variants } = foldsClasses[name];
      const recipe = bundle.match(
        new RegExp(`var ${name}\\$1 = createRuntimeFn\\(\\{ defaultClassName: "${base} [^\\n]*`)
      );
      expect(recipe, `${name} base class`).not.toBeNull();
      Object.entries(variants).forEach(([variant, className]) =>
        expect(recipe?.[0]).toContain(`${variant}: "${className}"`)
      );
    });
  });
});
