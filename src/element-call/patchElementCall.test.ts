import { describe, expect, it } from 'vitest';
import { patchElementCall } from './patchElementCall';

const original = 'j.pipe(ZJ(e=>e.length>0?PJ({spotlight:e,pip$:ce}):';

describe('patchElementCall', () => {
  it("patches the layout's share list", () => {
    const patched = patchElementCall(`before;${original}after`);
    expect(patched).toContain('blazeroomShares');
    expect(patched).not.toContain(original);
    expect(patched.startsWith('before;')).toBe(true);
    expect(patched.endsWith('after')).toBe(true);
  });

  it('throws when the text is missing', () => {
    expect(() => patchElementCall('x')).toThrow(/Element Call/);
  });

  it('throws when the text appears twice', () => {
    expect(() => patchElementCall(`${original}${original}`)).toThrow(/Element Call/);
  });
});
