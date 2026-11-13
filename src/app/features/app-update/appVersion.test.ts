import { describe, expect, it } from 'vitest';
import { entryScript } from './appVersion';

describe('entryScript', () => {
  it('reads the built entry script from index.html', () => {
    const html =
      '<head><script type="module" crossorigin src="/assets/index-TeisWVeA.js"></script>' +
      '<link rel="modulepreload" href="/assets/vendor-abc.js"></head>';
    expect(entryScript(html)).toBe('/assets/index-TeisWVeA.js');
  });

  it('ignores other scripts', () => {
    expect(entryScript('<script src="/assets/vendor-abc.js"></script>')).toBeUndefined();
    expect(entryScript('<script type="module" src="/src/index.tsx"></script>')).toBeUndefined();
  });
});
